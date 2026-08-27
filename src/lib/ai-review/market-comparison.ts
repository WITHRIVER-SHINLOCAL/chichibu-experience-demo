// MVP-B: 市場比較対象の選定ロジック。
//
// 重要な設計原則：この選定はAIに行わせない。価格・年齢・所要時間・カテゴリーに加えて、
// 体験型/見学型・専門家/ガイドの有無・単一/複合体験・自然/文化/教育/探究の近さを
// すべて固定の辞書・ルールでスコアリングする「決定的（deterministic）」なロジックとする。
// 同じ入力からは常に同じ出力・同じスコアが得られ、Claude API呼び出しの前に完了する。
//
// スコアの内訳は隠さず、常に breakdown として返す（監査可能性のため）。

export type ExperienceType = "experiential" | "viewing" | "unknown";
export type ThemeTag = "nature" | "culture" | "education" | "inquiry";

export type ComparisonTarget = {
  // PROGRAM側の入力
  ageMin: number | null;
  ageMax: number | null;
  durationMinutes: number | null;
  priceYen: number | null;
  // テキスト情報（キーワード判定に使う）。concept・inquiry_theme・why_chichibu・
  // experience_content・紐づくRESOURCEのcategory/summary・ACTIVITY_OPPORTUNITYのtitle/descriptionを結合したもの
  text: string;
  resourceCategories: string[]; // 例: ["GEOLOGY", "INDUSTRY"]
  activityCount: number; // 紐づくACTIVITY_OPPORTUNITY件数
  hasTakeaway: boolean | null; // PROGRAM側に持ち帰り成果の記録があるか。無ければnull（unknown）
  needsGuide: boolean | null; // 紐づくACTIVITY_OPPORTUNITY.needs_guideのいずれかがtrueならtrue。全て未設定ならnull
};

export type ComparisonCandidate = {
  id: string;
  title: string;
  ageMin: number | null;
  ageMax: number | null;
  durationMinutes: number | null;
  priceYen: number | null; // 1人あたり参考換算価格（付随費用除く）
  categoryRaw: string | null;
  text: string; // description + catchCopy + marketingMessages結合
  learningElementsCount: number;
  takeawayElementsCount: number;
  instructorNotesCount: number;
  courseCount: number; // 本体価格行（is_ancillary=false）の件数。複数コースがあれば複合体験とみなす
};

export type ComparisonScoreBreakdown = {
  age: number;
  duration: number;
  price: number;
  category: number;
  experienceType: number;
  guide: number;
  composite: number;
  theme: number;
};

export type ComparisonResult = {
  candidateId: string;
  total: number;
  breakdown: ComparisonScoreBreakdown;
  candidateExperienceType: ExperienceType;
  candidateHasGuide: boolean;
  candidateIsComposite: boolean;
  candidateThemeTags: ThemeTag[];
  targetThemeTags: ThemeTag[];
};

const EXPERIENTIAL_KEYWORDS = [
  "体験",
  "作る",
  "作ろう",
  "打つ",
  "打ち",
  "染め",
  "収穫",
  "発掘",
  "手びねり",
  "織り",
  "制作",
  "つかみ取り",
  "工作",
  "組み立て",
  "餌やり",
];

const VIEWING_KEYWORDS = [
  "見学",
  "観賞",
  "鑑賞",
  "参拝",
  "ツアー",
  "展望",
  "眺め",
  "ライトアップ",
  "解説",
  "観望",
  "舟下り",
];

const THEME_KEYWORDS: Record<ThemeTag, string[]> = {
  nature: ["自然", "山", "川", "地質", "生き物", "植物", "地層", "化石", "渓谷", "岩", "滝", "天然", "地形", "盆地", "湧水"],
  culture: ["伝統", "文化", "信仰", "祭", "歴史的", "工芸", "職人", "神社", "寺"],
  education: ["学べる", "学習", "歴史", "教育", "解説", "知識", "産業", "地理"],
  inquiry: ["探究", "なぜ", "問い", "気づき", "発見"],
};

const CATEGORY_THEME_HINTS: Record<string, ThemeTag[]> = {
  GEOLOGY: ["nature"],
  NATURE: ["nature"],
  CULTURE: ["culture"],
  INDUSTRY: ["education"],
};

export function classifyExperienceType(
  text: string,
  takeawayCount: number
): ExperienceType {
  if (takeawayCount > 0) return "experiential";
  const hasExperiential = EXPERIENTIAL_KEYWORDS.some((k) => text.includes(k));
  const hasViewing = VIEWING_KEYWORDS.some((k) => text.includes(k));
  if (hasExperiential && !hasViewing) return "experiential";
  if (hasViewing && !hasExperiential) return "viewing";
  if (hasExperiential && hasViewing) return "experiential"; // 手を動かす要素があれば体験型優先
  return "unknown";
}

export function extractThemeTags(text: string, categories: string[]): ThemeTag[] {
  const tags = new Set<ThemeTag>();
  for (const cat of categories) {
    for (const t of CATEGORY_THEME_HINTS[cat] ?? []) tags.add(t);
  }
  for (const [tag, keywords] of Object.entries(THEME_KEYWORDS) as [ThemeTag, string[]][]) {
    if (keywords.some((k) => text.includes(k))) tags.add(tag);
  }
  return Array.from(tags);
}

function rangeOverlapScore(
  aMin: number | null,
  aMax: number | null,
  bMin: number | null,
  bMax: number | null
): number {
  if (aMin == null && aMax == null) return 0; // ターゲット側に年齢情報がなければ判定不能=0点
  if (bMin == null && bMax == null) return 0; // 候補側も同様
  const lo = Math.max(aMin ?? -Infinity, bMin ?? -Infinity);
  const hi = Math.min(aMax ?? Infinity, bMax ?? Infinity);
  return lo <= hi ? 2 : 0;
}

function proximityScore(a: number | null, b: number | null, tolerance: number): number {
  if (a == null || b == null) return 0;
  const diff = Math.abs(a - b);
  if (diff <= tolerance * 0.25) return 2;
  if (diff <= tolerance) return 1;
  return 0;
}

function categoryKeywordScore(targetText: string, candidateText: string): number {
  // 単純な語の重なり数（3語以上の日本語部分文字列一致は行わず、簡易分かち書きの代わりに
  // 固定辞書のテーマキーワードでの一致数を使う。これも決定的で再現可能）
  const targetWords = new Set(
    Object.values(THEME_KEYWORDS).flat().filter((k) => targetText.includes(k))
  );
  const candidateWords = new Set(
    Object.values(THEME_KEYWORDS).flat().filter((k) => candidateText.includes(k))
  );
  let overlap = 0;
  for (const w of targetWords) if (candidateWords.has(w)) overlap++;
  return Math.min(overlap, 2);
}

export function scoreCandidate(
  target: ComparisonTarget,
  candidate: ComparisonCandidate
): ComparisonResult {
  const targetExperienceType = classifyExperienceType(
    target.text,
    target.hasTakeaway ? 1 : 0
  );
  const candidateExperienceType = classifyExperienceType(
    candidate.text,
    candidate.takeawayElementsCount
  );
  const candidateHasGuide = candidate.instructorNotesCount > 0;
  const candidateIsComposite = candidate.courseCount >= 2;
  const targetIsComposite = target.activityCount >= 2;
  const targetThemeTags = extractThemeTags(target.text, target.resourceCategories);
  const candidateThemeTags = extractThemeTags(candidate.text, [candidate.categoryRaw ?? ""]);

  const themeOverlap = targetThemeTags.filter((t) => candidateThemeTags.includes(t)).length;

  const breakdown: ComparisonScoreBreakdown = {
    age: rangeOverlapScore(target.ageMin, target.ageMax, candidate.ageMin, candidate.ageMax),
    duration: proximityScore(target.durationMinutes, candidate.durationMinutes, 120),
    price: proximityScore(target.priceYen, candidate.priceYen, 5000),
    category: categoryKeywordScore(target.text, candidate.text),
    experienceType:
      targetExperienceType !== "unknown" && targetExperienceType === candidateExperienceType
        ? 1
        : 0,
    guide: target.needsGuide === true && candidateHasGuide ? 1 : 0,
    composite: targetIsComposite === candidateIsComposite ? 1 : 0,
    theme: Math.min(themeOverlap, 2),
  };

  // 重み付けの方針：所要時間・価格の近さよりも、テーマ・カテゴリーの近さを重視する。
  // Market Fit Review 01での人間による手動選定でも、価格帯が大きく異なる比較対象
  // （例：化石発掘体験は¥500台、藍染めじっくりコースは¥5,000台）が地質・伝統産業という
  // テーマの近さゆえに選ばれていたため、テーマ一致を価格・時間の一致より優先する。
  const total =
    breakdown.age * 2 +
    breakdown.duration * 1 +
    breakdown.price * 1 +
    breakdown.category * 2 +
    breakdown.experienceType +
    breakdown.guide +
    breakdown.composite +
    breakdown.theme * 3;

  return {
    candidateId: candidate.id,
    total,
    breakdown,
    candidateExperienceType,
    candidateHasGuide,
    candidateIsComposite,
    candidateThemeTags,
    targetThemeTags,
  };
}

export function selectComparablePrograms(
  target: ComparisonTarget,
  candidates: ComparisonCandidate[],
  opts: { min?: number; max?: number } = {}
): ComparisonResult[] {
  const max = opts.max ?? 10;
  const scored = candidates
    .map((c) => scoreCandidate(target, c))
    .sort((a, b) => b.total - a.total);
  // どの軸でも一致しなかった（total=0）候補は、件数を埋めるためであっても含めない。
  // min件に満たない場合は、満たない件数のまま返す（無関係な候補で水増ししない）。
  const nonZero = scored.filter((s) => s.total > 0);
  return nonZero.slice(0, max);
}
