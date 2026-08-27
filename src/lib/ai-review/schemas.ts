import { z } from "zod";
import { DIAGNOSIS_AXES, DIAGNOSIS_STATUSES, MISSING_RESEARCH_STATES } from "./types";

// これらのZod SchemaはClaude APIのStructured Output（tool forcing）の入力スキーマとしても、
// レスポンスの実行時バリデーションとしても使う。
// 最重要ガード: どのSchemaにも "type" に "fact" という値は存在しない（inference/idea/research_neededのみ）。

export const diagnosisItemSchema = z.object({
  axis: z.enum(DIAGNOSIS_AXES),
  status: z.enum(DIAGNOSIS_STATUSES),
  type: z.literal("inference"),
  reasoning: z.string().min(1).max(2000),
  based_on: z.array(z.string()).min(1).max(20),
});

export const missingResearchItemRawSchema = z.object({
  type: z.literal("research_needed"),
  topic: z.string().min(1).max(300),
  why_needed: z.string().min(1).max(2000),
  current_state: z.enum(MISSING_RESEARCH_STATES),
  suggested_source_type: z.string().min(1).max(300),
});

export const marketComparisonSchema = z.object({
  type: z.literal("inference"),
  compared_program_ids: z.array(z.string()).min(1).max(10),
  summary: z.string().min(1).max(4000),
  high_price_common_factors: z.array(z.string()).max(20),
  based_on: z.array(z.string()).min(1).max(30),
});

export const diagnosisResponseSchema = z.object({
  diagnosis: z.array(diagnosisItemSchema).length(DIAGNOSIS_AXES.length),
  missing_research: z.array(missingResearchItemRawSchema).max(20),
  market_comparison: marketComparisonSchema,
});

export const improvementIdeaRawSchema = z.object({
  type: z.literal("idea"),
  title: z.string().min(1).max(200),
  description: z.string().min(1).max(2000),
  target_axis: z.enum(DIAGNOSIS_AXES),
  based_on: z.array(z.string()).min(1).max(20),
});

export const improvementIdeasResponseSchema = z.object({
  improvement_ideas: z.array(improvementIdeaRawSchema).min(1).max(15),
});

export const productDraftSchema = z.object({
  type: z.literal("idea"),
  overview: z.string().min(1).max(2000),
  appeal: z.string().min(1).max(2000),
  learning_points: z.string().min(1).max(2000),
  flow: z
    .array(z.object({ time: z.string().max(50), activity: z.string().max(300) }))
    .max(30),
  parent_value: z.string().min(1).max(2000),
  child_value: z.string().min(1).max(2000),
  price_reasoning: z.string().min(1).max(2000),
  takeaway: z.string().min(1).max(1000),
  guide_needed: z.string().min(1).max(1000),
  safety_check_items: z.array(z.string().max(300)).max(20),
  used_approved_ideas: z.array(z.string()).max(20),
  unresolved_research_needed: z.array(z.string()).max(20),
});

export const productDraftResponseSchema = z.object({
  product_draft: productDraftSchema,
});

// Anthropic Structured Output用にJSON Schemaへ変換したもの（tool定義のinput_schemaに使う）
export function toAnthropicToolSchema(zodSchema: z.ZodTypeAny) {
  return z.toJSONSchema(zodSchema, { target: "draft-7" });
}
