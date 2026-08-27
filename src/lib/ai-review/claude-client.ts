// MVP-B: Claude API クライアントのラッパー。
//
// 重要な制約（ユーザー指示）:
//  - ANTHROPIC_API_KEYはソースコード・DB・ログ・エラーメッセージに一切出力しない。
//  - キー未設定でもアプリ全体は壊れず、AI機能の入口で日本語の案内メッセージを返す。

import Anthropic from "@anthropic-ai/sdk";
import { z } from "zod";

export class AiNotConfiguredError extends Error {
  constructor() {
    super("AI機能を利用するにはANTHROPIC_API_KEYの設定が必要です");
    this.name = "AiNotConfiguredError";
  }
}

export function isAiConfigured(): boolean {
  return Boolean(process.env.ANTHROPIC_API_KEY && process.env.ANTHROPIC_API_KEY.trim().length > 0);
}

let cachedClient: Anthropic | null = null;

function getClient(): Anthropic {
  if (!isAiConfigured()) {
    throw new AiNotConfiguredError();
  }
  if (!cachedClient) {
    // apiKeyは明示的に渡さず、SDKのデフォルト（process.env.ANTHROPIC_API_KEY読み取り）に任せる。
    // これにより、このファイル自身がキーの値を変数として保持・ログ出力する経路を作らない。
    cachedClient = new Anthropic();
  }
  return cachedClient;
}

export const AI_REVIEW_MODEL = process.env.AI_REVIEW_MODEL || "claude-sonnet-4-5-20250929";

export class AiResponseValidationError extends Error {
  constructor(
    message: string,
    public readonly issues: unknown
  ) {
    super(message);
    this.name = "AiResponseValidationError";
  }
}

/**
 * Structured Output（tool forcing）でClaudeを呼び出し、Zodスキーマで検証した結果を返す。
 * 検証に失敗した場合は保存させず、AiResponseValidationErrorを投げる（フォールバックで
 * 別の形式を推測したり、不正な形のまま保存したりしない）。
 */
export async function callClaudeForStructuredOutput<T>(params: {
  systemPrompt: string;
  userMessage: string;
  toolName: string;
  toolDescription: string;
  jsonSchema: Record<string, unknown>;
  zodSchema: z.ZodType<T>;
  maxTokens?: number;
}): Promise<{ data: T; model: string }> {
  const client = getClient();

  const response = await client.messages.create({
    model: AI_REVIEW_MODEL,
    max_tokens: params.maxTokens ?? 4096,
    system: params.systemPrompt,
    messages: [{ role: "user", content: params.userMessage }],
    tools: [
      {
        name: params.toolName,
        description: params.toolDescription,
        input_schema: params.jsonSchema as Anthropic.Tool.InputSchema,
      },
    ],
    tool_choice: { type: "tool", name: params.toolName },
  });

  const toolUse = response.content.find(
    (block): block is Anthropic.ToolUseBlock => block.type === "tool_use"
  );
  if (!toolUse) {
    throw new AiResponseValidationError("Claude APIがtool_useブロックを返しませんでした", null);
  }

  const parsed = params.zodSchema.safeParse(toolUse.input);
  if (!parsed.success) {
    throw new AiResponseValidationError(
      "Claude APIの出力がスキーマに一致しませんでした（保存を中止しました）",
      parsed.error.issues
    );
  }

  return { data: parsed.data, model: response.model };
}

// システムプロンプトの共通部分。FACT/INFERENCE/IDEAガードの中核。
export const AI_REVIEW_SYSTEM_PRINCIPLES = `
あなたは「WITH RIVER」の体験プログラム商品開発を支援するアシスタントです。
以下は絶対に守るべき原則です。

1. あなたは新しい事実（FACT）を作ってはいけません。渡された情報（RESOURCE・RESOURCE_RELATIONSHIP・
   ACTIVITY_OPPORTUNITY・MARKET_PROGRAM・MARKET_PROGRAM_ANALYSIS・PROGRAM本体のフィールド）の
   範囲外のことを、事実であるかのように述べてはいけません。
2. あなたができるのは次の3つだけです。
   (a) 渡されたFACTを組み合わせて解釈を導く＝INFERENCE
   (b) INFERENCEから改善のアイデアを提案する＝IDEA
   (c) 商品化のために不足している情報を「追加調査が必要（research_needed）」として提示する
3. 出力する各項目には、必ず based_on として、渡されたコンテキストに実在する参照ID
   （resource:xxx, relationship:xxx, activity_opportunity:xxx, market_program:xxx,
   market_program_analysis:xxx, program_field:xxx, program_feedback:xxx のいずれか）を
   1件以上含めてください。存在しないIDや、コンテキストに含まれない情報を参照してはいけません。
4. 情報が不足していて判断できない場合は、推測で埋めず、diagnosisのstatusを
   "insufficient_data" にするか、missing_researchに追加してください。
5. 出力は必ず指定されたJSON構造（ツール呼び出し）でのみ行い、それ以外の形式で
   事実を主張しないでください。
`.trim();
