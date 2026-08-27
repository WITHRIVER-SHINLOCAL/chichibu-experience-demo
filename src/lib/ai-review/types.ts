// MVP-B: AI Product Development Assistant の型定義。
// 全ての型に、AIが出力してよい「type」の値を固定する（"fact"は選択肢に存在しない）。

export const DIAGNOSIS_AXES = [
  "market_fit",
  "regional_uniqueness",
  "experience_value",
  "educational_value",
  "parent_purchase_reason",
  "child_excitement",
  "price_justification",
  "expertise",
  "safety",
  "takeaway",
  "fact_sufficiency",
] as const;
export type DiagnosisAxis = (typeof DIAGNOSIS_AXES)[number];

export const DIAGNOSIS_AXIS_LABELS: Record<DiagnosisAxis, string> = {
  market_fit: "市場適合性",
  regional_uniqueness: "地域独自性",
  experience_value: "体験価値",
  educational_value: "教育価値",
  parent_purchase_reason: "親への購入理由",
  child_excitement: "子どものワクワク",
  price_justification: "価格根拠",
  expertise: "専門性",
  safety: "安全性",
  takeaway: "持ち帰れる成果",
  fact_sufficiency: "FACTの充足度",
};

export const DIAGNOSIS_STATUSES = ["sufficient", "needs_improvement", "insufficient_data"] as const;
export type DiagnosisStatus = (typeof DIAGNOSIS_STATUSES)[number];

export type DiagnosisItem = {
  axis: DiagnosisAxis;
  status: DiagnosisStatus;
  type: "inference";
  reasoning: string;
  based_on: string[];
};

export const MISSING_RESEARCH_STATES = ["no_data", "unconfirmed_inference"] as const;
export type MissingResearchState = (typeof MISSING_RESEARCH_STATES)[number];

// Claudeが出力する生の形（idと解決情報は含まない）
export type MissingResearchItemRaw = {
  type: "research_needed";
  topic: string;
  why_needed: string;
  current_state: MissingResearchState;
  suggested_source_type: string;
};

// サーバーがidを付与し、解決情報を追跡可能にした保存形。
// 「解決済みかどうか」を単なるbooleanにせず、何のFACT/SOURCEで解決したかを追える構造にする。
export type MissingResearchItem = MissingResearchItemRaw & {
  id: string;
  resolved: boolean;
  resolved_at: string | null;
  resolved_by_id: string | null;
  resolved_note: string | null;
  // 解決の根拠となった既存FACTへの参照（任意・複数持てる）。存在するIDのみ許可される。
  resolved_reference_ids: string[];
};

export type MarketComparison = {
  type: "inference";
  compared_program_ids: string[];
  summary: string;
  high_price_common_factors: string[];
  based_on: string[];
};

// Claude API 呼び出し1回目のレスポンス全体
export type DiagnosisResponse = {
  diagnosis: DiagnosisItem[];
  missing_research: MissingResearchItemRaw[];
  market_comparison: MarketComparison;
};

export type ImprovementIdeaRaw = {
  type: "idea";
  title: string;
  description: string;
  target_axis: DiagnosisAxis;
  based_on: string[];
};

export type ImprovementIdea = ImprovementIdeaRaw & { id: string };

export type ImprovementIdeasResponse = {
  improvement_ideas: ImprovementIdeaRaw[];
};

export type ProductDraftFlowItem = { time: string; activity: string };

export type ProductDraft = {
  type: "idea";
  overview: string;
  appeal: string;
  learning_points: string;
  flow: ProductDraftFlowItem[];
  parent_value: string;
  child_value: string;
  price_reasoning: string;
  takeaway: string;
  guide_needed: string;
  safety_check_items: string[];
  used_approved_ideas: string[];
  unresolved_research_needed: string[];
};

export type ProductDraftResponse = {
  product_draft: ProductDraft;
};

// PROGRAM本体へ採用可能なProduct Draftのセクション名
export const ADOPTABLE_DRAFT_SECTIONS = [
  "overview_appeal_learning", // overview+appeal+learning_points → experience_content
  "parent_value_price", // parent_value+price_reasoning → market_needs
  "regional_reasoning", // why_chichibu相当（overviewやappeal内の地域性言及を人間が編集して採用）
  "flow", // itinerariesへ展開
] as const;
export type AdoptableDraftSection = (typeof ADOPTABLE_DRAFT_SECTIONS)[number];
