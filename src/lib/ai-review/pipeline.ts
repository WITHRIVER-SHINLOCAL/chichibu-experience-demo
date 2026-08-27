// MVP-B: Claude API呼び出し3段階のパイプライン本体。
// コンテキスト組み立て（context.ts）とスコアリング（market-comparison.ts）はAI不使用・決定的。
// ここではその結果をClaudeに渡し、スキーマ検証（schemas.ts）とガード（guards.ts）を必ず通す。

import {
  AI_REVIEW_SYSTEM_PRINCIPLES,
  callClaudeForStructuredOutput,
} from "./claude-client";
import {
  diagnosisResponseSchema,
  improvementIdeasResponseSchema,
  productDraftResponseSchema,
  toAnthropicToolSchema,
} from "./schemas";
import { guardDiagnosisResponse, guardImprovementIdeas, guardProductDraft } from "./guards";
import type { AiReviewContext, ReferenceCatalog } from "./context";
import type {
  DiagnosisResponse,
  ImprovementIdeaRaw,
  MissingResearchItem,
  ProductDraft,
} from "./types";
import { DIAGNOSIS_AXES, DIAGNOSIS_AXIS_LABELS } from "./types";

function formatContextForPrompt(context: AiReviewContext): string {
  return JSON.stringify(context, null, 1);
}

// ── Stage 1: 診断 + 不足FACT + 市場比較 ──

export async function runDiagnosisStage(
  context: AiReviewContext,
  catalog: ReferenceCatalog
): Promise<{ data: DiagnosisResponse; model: string }> {
  const axisList = DIAGNOSIS_AXES.map((a) => `${a}（${DIAGNOSIS_AXIS_LABELS[a]}）`).join("、");

  const { data, model } = await callClaudeForStructuredOutput({
    systemPrompt: AI_REVIEW_SYSTEM_PRINCIPLES,
    userMessage: `以下はPROGRAM「${context.program.title}」に関連する登録済みFACT/INFERENCE/IDEAのコンテキストです。

${formatContextForPrompt(context)}

このPROGRAMを次の11項目で診断してください: ${axisList}
各項目についてstatus（sufficient/needs_improvement/insufficient_data）とreasoningを付けてください。

次に、このPROGRAMを商品として成立させるために不足しているFACT（追加調査が必要な事項）を
missing_researchとして列挙してください。不足FACTを推測で埋めてはいけません。

最後に、comparableMarketProgramsの中から特に比較価値が高いものを選び、
market_comparisonとして、価格帯・高価格を成立させている要素・親への訴求・教育価値・
専門家・成果物の観点でまとめてください。`,
    toolName: "report_diagnosis",
    toolDescription: "PROGRAMの診断結果、不足FACT、市場比較をJSON構造で報告する",
    jsonSchema: toAnthropicToolSchema(diagnosisResponseSchema) as Record<string, unknown>,
    zodSchema: diagnosisResponseSchema,
    maxTokens: 8192,
  });

  guardDiagnosisResponse(data, catalog.validReferenceIds);
  return { data, model };
}

// ── Stage 2: 改善アイデア ──

export async function runImprovementIdeasStage(
  context: AiReviewContext,
  catalog: ReferenceCatalog,
  diagnosisResult: DiagnosisResponse
): Promise<{ data: ImprovementIdeaRaw[]; model: string }> {
  // Stage1の出力自体もbased_onとして参照可能にする（診断結果への参照を許可）
  const stage1ReferenceIds = new Set(catalog.validReferenceIds);
  for (const axis of DIAGNOSIS_AXES) stage1ReferenceIds.add(`diagnosis:${axis}`);
  stage1ReferenceIds.add("market_comparison");
  diagnosisResult.missing_research.forEach((_, i) => stage1ReferenceIds.add(`missing_research:${i}`));

  const { data, model } = await callClaudeForStructuredOutput({
    systemPrompt: AI_REVIEW_SYSTEM_PRINCIPLES,
    userMessage: `以下はPROGRAM「${context.program.title}」の診断結果です。

${JSON.stringify(diagnosisResult, null, 1)}

上記の診断結果と、次の元コンテキスト（FACT/INFERENCE）を踏まえて、
このPROGRAMの商品価値を高めるための改善アイデアを提案してください。
これはIDEA（提案）であり、事実の主張ではないことを明示してください。
各アイデアには、どの診断軸(target_axis)に対応する提案かを付け、
based_onには診断結果（例: "diagnosis:price_justification"）または元のFACT/INFERENCE参照IDを含めてください。

元コンテキスト:
${formatContextForPrompt(context)}`,
    toolName: "report_improvement_ideas",
    toolDescription: "PROGRAMの改善アイデア（IDEA）をJSON構造で報告する",
    jsonSchema: toAnthropicToolSchema(improvementIdeasResponseSchema) as Record<string, unknown>,
    zodSchema: improvementIdeasResponseSchema,
    maxTokens: 8192,
  });

  guardImprovementIdeas(data.improvement_ideas, stage1ReferenceIds);
  return { data: data.improvement_ideas, model };
}

// ── Stage 3: Product Draft（人間承認後のみ） ──

export async function runProductDraftStage(
  context: AiReviewContext,
  approvedIdeas: { id: string; raw: ImprovementIdeaRaw }[],
  unresolvedMissingResearch: MissingResearchItem[]
): Promise<{ data: ProductDraft; model: string }> {
  const approvedIdeaIds = new Set(approvedIdeas.map((i) => i.id));
  const unresolvedIds = new Set(unresolvedMissingResearch.map((i) => i.id));

  const { data, model } = await callClaudeForStructuredOutput({
    systemPrompt: AI_REVIEW_SYSTEM_PRINCIPLES,
    userMessage: `人間が以下の改善アイデア（IDEA）を承認しました。これらのみを使ってProduct Draftを作成してください。
承認されていないアイデアは絶対に使わないでください。

承認されたIDEA:
${JSON.stringify(approvedIdeas.map((i) => ({ id: i.id, ...i.raw })), null, 1)}

未解決のmissing_research（まだFACTが確認できていない項目）:
${JSON.stringify(unresolvedMissingResearch, null, 1)}
これらはunresolved_research_neededとしてドラフトに引き継いでください。

元のPROGRAM/FACTコンテキスト:
${formatContextForPrompt(context)}

overview/appeal/learning_points/parent_value/child_value/price_reasoning/takeaway/guide_needed/
safety_check_items/flow の全セクションを埋めてください。使用したIDEAのidをused_approved_ideasに、
未解決のmissing_researchのidをunresolved_research_neededに入れてください。`,
    toolName: "report_product_draft",
    toolDescription: "承認されたIDEAのみを使ったProduct DraftをJSON構造で報告する",
    jsonSchema: toAnthropicToolSchema(productDraftResponseSchema) as Record<string, unknown>,
    zodSchema: productDraftResponseSchema,
    maxTokens: 8192,
  });

  guardProductDraft(data.product_draft, approvedIdeaIds, unresolvedIds);
  return { data: data.product_draft, model };
}
