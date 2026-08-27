// デモで中心に据えるPROGRAM。「東京を作った武甲さんをクエスト！」。
// MVP-A/MVP-Bの一連の流れ（企画→AI診断→改善IDEA→Experience Design Review→Product Draft）を
// 保存済みドライラン結果つきで見せられる唯一のPROGRAMのため、デモ導線・バッジ表示に使う。
export const DEMO_PROGRAM_ID = "a18e1934-1d15-422b-9dab-396000fbe054";

export const CATEGORY_LABELS: Record<string, string> = {
  NATURE: "自然",
  CREATURES: "生き物",
  GEOLOGY: "地質",
  CULTURE: "文化",
  HISTORY: "歴史",
  INDUSTRY: "産業",
  FOOD: "食",
  PEOPLE: "人",
  PLACE: "場所",
  STORY: "物語",
};

export const FACT_STATUS_LABELS: Record<string, string> = {
  FACT: "事実",
  INFERENCE: "推測",
  IDEA: "アイデア",
};

export const FACT_STATUS_BADGE: Record<string, string> = {
  FACT: "bg-emerald-100 text-emerald-800",
  INFERENCE: "bg-amber-100 text-amber-800",
  IDEA: "bg-violet-100 text-violet-800",
};

export const FACT_STATUS_DESCRIPTIONS: Record<string, string> = {
  FACT: "出典または現地確認で裏付けられた事実",
  INFERENCE: "AIまたは人間による推測・分析（確信度つき）",
  IDEA: "企画・提案段階のアイデア（事実でも検証済みの推測でもない）",
};

export const SEASON_LABELS: Record<string, string> = {
  spring: "春",
  summer: "夏",
  autumn: "秋",
  winter: "冬",
  all: "通年",
};

export const SOURCE_TYPE_LABELS: Record<string, string> = {
  government: "行政",
  museum: "博物館",
  academic: "大学・研究機関",
  dmo: "DMO",
  tourism_association: "観光協会",
  official_shrine_temple: "神社仏閣公式",
  local_business: "地域企業",
  industry_association: "商工会議所・商工会等",
  expert: "専門家",
  blog: "ブログ",
  sns: "SNS",
  platform: "プラットフォーム",
  other: "その他",
};

export const RELIABILITY_GRADE_LABELS: Record<string, string> = {
  A: "A（行政・博物館・大学・研究機関）",
  B: "B（DMO・観光協会・公式団体）",
  C: "C（地域企業・専門家・事業者）",
  D: "D（ブログ・SNS等）",
};

export const RELIABILITY_GRADE_BADGE: Record<string, string> = {
  A: "bg-emerald-100 text-emerald-800",
  B: "bg-sky-100 text-sky-800",
  C: "bg-amber-100 text-amber-800",
  D: "bg-neutral-200 text-neutral-600",
};

export const RELATIONSHIP_CATEGORY_LABELS: Record<string, string> = {
  geological: "地質的",
  ecological: "生態的",
  hydrological: "水文的",
  cultural: "文化的",
  spiritual: "信仰的",
  historical: "歴史的",
  economic: "経済的",
  other: "その他",
};

export const PERMISSION_STATUS_LABELS: Record<string, string> = {
  unconfirmed: "未確認",
  requested: "依頼中",
  granted: "許可済み",
  denied: "不許可",
};

export const PERMISSION_STATUS_BADGE: Record<string, string> = {
  unconfirmed: "bg-neutral-200 text-neutral-600",
  requested: "bg-amber-100 text-amber-800",
  granted: "bg-emerald-100 text-emerald-800",
  denied: "bg-red-100 text-red-800",
};

export const PROGRAM_STATUS_LABELS: Record<string, string> = {
  IDEA: "アイデア",
  RESEARCH: "リサーチ中",
  FIELD_CHECK: "現地確認中",
  PROTOTYPE: "プロトタイプ",
  VALIDATED: "検証済み",
  READY: "実施準備完了",
  ACTIVE: "実施中",
  ARCHIVED: "アーカイブ",
};

export const PROGRAM_STATUS_BADGE: Record<string, string> = {
  IDEA: "bg-violet-100 text-violet-800",
  RESEARCH: "bg-amber-100 text-amber-800",
  FIELD_CHECK: "bg-amber-100 text-amber-800",
  PROTOTYPE: "bg-sky-100 text-sky-800",
  VALIDATED: "bg-sky-100 text-sky-800",
  READY: "bg-emerald-100 text-emerald-800",
  ACTIVE: "bg-emerald-100 text-emerald-800",
  ARCHIVED: "bg-neutral-200 text-neutral-500",
};

export const PRICE_TYPE_LABELS: Record<string, string> = {
  child: "子ども料金",
  adult: "大人料金",
  family: "親子・家族料金",
  group: "団体（1組）料金",
  additional_child: "追加子ども料金",
  material: "材料費",
  other: "その他",
};

// MVP実運用テスト用フィードバックの簡易評価ラベル（正式なプロダクト機能ではない）
export const EASE_RATING_LABELS: Record<string, string> = {
  easy: "使いやすかった",
  normal: "普通",
  hard: "使いにくかった",
};

export const EASE_RATING_BADGE: Record<string, string> = {
  easy: "bg-emerald-100 text-emerald-800",
  normal: "bg-stone-200 text-stone-600",
  hard: "bg-red-100 text-red-800",
};

// MVP実運用テスト用: 「このアプリを使わなかった場合、この企画を思いつけたか」ラベル（正式なプロダクト機能ではない）
export const IDEATION_COUNTERFACTUAL_LABELS: Record<string, string> = {
  would_have: "思いつけた",
  partially: "一部は思いつけた",
  would_not_have: "思いつかなかった",
};

export const IDEATION_COUNTERFACTUAL_BADGE: Record<string, string> = {
  would_have: "bg-stone-200 text-stone-600",
  partially: "bg-sky-100 text-sky-800",
  would_not_have: "bg-emerald-100 text-emerald-800",
};

// Market Research v2: 市場プログラム調査時に確認すべき16項目のチェックリスト。
// 各項目は「値あり／確認済み記載なし／未収集」の3状態で管理する（researchedEmptyItemsに項目keyを格納）。
export const MARKET_RESEARCH_CHECKLIST_ITEMS = [
  { key: "title", label: "タイトル" },
  { key: "catchCopy", label: "キャッチコピー" },
  { key: "target", label: "ターゲット" },
  { key: "parentAppeal", label: "親向け訴求" },
  { key: "childAppeal", label: "子ども向け訴求" },
  { key: "description", label: "体験内容" },
  { key: "flow", label: "当日の流れ" },
  { key: "learningElements", label: "学び要素" },
  { key: "takeawayElements", label: "持ち帰れるもの" },
  { key: "safetyManagement", label: "安全管理" },
  { key: "instructorNotes", label: "講師・ガイド" },
  { key: "specialness", label: "特別感・希少性" },
  { key: "duration", label: "所要時間" },
  { key: "price", label: "料金体系" },
  { key: "ancillary", label: "付随費用" },
  { key: "review", label: "レビュー" },
] as const;
export type MarketResearchChecklistKey = (typeof MARKET_RESEARCH_CHECKLIST_ITEMS)[number]["key"];

export const RESEARCH_STATUS_LABELS: Record<string, string> = {
  value: "値あり",
  confirmed_empty: "確認済み記載なし",
  uncollected: "未収集",
};

export const RESEARCH_STATUS_BADGE: Record<string, string> = {
  value: "bg-emerald-100 text-emerald-800",
  confirmed_empty: "bg-stone-200 text-stone-600",
  uncollected: "bg-amber-100 text-amber-800",
};

export const RECOMMENDED_PRICE_TYPE_OPTIONS = [
  "child",
  "adult",
  "family",
  "group",
  "additional_child",
  "material",
  "other",
] as const;
