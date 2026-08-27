import { MARKET_RESEARCH_CHECKLIST_ITEMS } from "@/lib/constants";

// 呼び出し元（ページコンポーネントのレンダー本体）でDate.now()を直接呼ぶと
// 「レンダー中に不純な関数を呼んでいる」というlintエラーになるため、
// 通常のヘルパー関数としてここに切り出している。
export function daysAgo(days: number): Date {
  return new Date(Date.now() - days * 24 * 60 * 60 * 1000);
}

/**
 * 資源・体験機会等の`seasons`配列が、指定した季節にマッチするかを判定する。
 * `seasons`に"all"が含まれる場合は「季節を問わない」という意味なので、
 * どの季節を指定しても常にマッチする（単なる文字列一致だけでは"all"を
 * 特別扱いできないため、この判定を共通化している）。
 * seasonsが空配列（未設定）の場合も「季節指定なし」とみなしてマッチさせる。
 */
export function matchesSeason(seasons: string[], season: string | null | undefined): boolean {
  if (!season) return true;
  if (seasons.length === 0) return true;
  return seasons.includes(season) || seasons.includes("all");
}

export function formatDateTime(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(d);
}

export function formatDate(value: string | Date | null | undefined) {
  if (!value) return "-";
  const d = typeof value === "string" ? new Date(value) : value;
  return new Intl.DateTimeFormat("ja-JP", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
  }).format(d);
}

export function formatAgeRange(min: number | null, max: number | null) {
  if (min == null && max == null) return "未設定";
  if (min != null && max != null) return `${min}〜${max}歳`;
  if (min != null) return `${min}歳〜`;
  return `〜${max}歳`;
}

export function formatDurationRange(min: number | null, max: number | null) {
  if (min == null && max == null) return "未設定";
  const fmt = (m: number) => (m % 60 === 0 ? `${m / 60}時間` : `${m}分`);
  if (min != null && max != null && min !== max) return `${fmt(min)}〜${fmt(max)}`;
  if (min != null) return fmt(min);
  if (max != null) return fmt(max);
  return "未設定";
}

export function formatGroupSizeRange(min: number | null, max: number | null) {
  if (min == null && max == null) return "未設定";
  if (min != null && max != null) return `${min}〜${max}名`;
  if (min != null) return `${min}名〜`;
  return `〜${max}名`;
}

export function formatYen(amount: number | null | undefined) {
  if (amount == null) return "-";
  return `${amount.toLocaleString("ja-JP")}円`;
}

/**
 * price_type="family"/"group"/"other" の `unit` 自然文から、その金額が何人分の
 * 料金なのかを判定する。判定できるのは、内訳が明示されている場合のみ:
 *   - 「子ども1人＋大人1人」のような、構成人数の内訳が明記されているケース → 内訳の合計人数
 *   - 「4人前1セット」のような、人数そのものが単位になっているケース → その人数
 *   - 「1名」のような、単純に1人分と明記されているケース → 1
 * 「定員18名」「30名未満」「団体」のような上限・目安の表現は、実際に何人分の
 * 料金として支払われたかを一意に確定できないため、意図的に人数化しない（null）。
 * 「親子1組」のように内訳の数字が無い表現も同様にnullとする。
 *
 * これは決定的な文字列パターンマッチであり、AIやあいまいな推測は使わない。
 * 将来的に同じunit文言のバリエーションが増える場合は、ここにパターンを追加する。
 */
export function parsePriceUnitPeopleCount(unit: string | null | undefined): number | null {
  if (!unit) return null;

  // 上限・目安の表現は実際の人数を確定できないため対象外
  if (/定員|未満|以内|程度|前後|団体/.test(unit)) return null;

  // 「子ども1人＋大人1人」「子ども1名＋保護者1名」のような内訳表記（複数キーワードがあれば合計する）
  const breakdown = Array.from(unit.matchAll(/(子ども|子供|大人|保護者)\s*(\d+)\s*[人名]/g));
  if (breakdown.length >= 2) {
    const sum = breakdown.reduce((acc, m) => acc + Number(m[2]), 0);
    if (Number.isFinite(sum) && sum > 0) return sum;
  }

  // 「4人前1セット」のような、人数そのものが単位になっている表記
  const perServing = unit.match(/(\d+)\s*人前/);
  if (perServing) return Number(perServing[1]);

  // 先頭が「1名」「1人」のような単純な人数表記（例: "1名", "1名（未就学児〜高校生）"）
  const leading = unit.match(/^(\d+)\s*[名人]/);
  if (leading) return Number(leading[1]);

  return null;
}

/**
 * 家族/団体/その他複数人料金を人数で按分し、1人あたりの「参考換算価格」を計算する。
 * これは正規化ロジック（NORMALIZED層）であり、事実として保存はしない。
 * 常に「参考値」であることをUI側で明示すること。
 *
 * family/group/other は「大人2名+子ども2名」のような固定人数を仮定せず、必ず
 * `unit` から実際の人数をparsePriceUnitPeopleCount()で確定できた場合のみ按分する。
 * 人数を確定できない場合は、誤った按分（実態より安く見せる/高く見せる）を避けるため、
 * 無理に1人あたり価格を算出しない（そのpriceTypeは候補から外し、次点があればそちらを試す）。
 */
export function estimatePerPersonPrice(
  allPrices: { priceType: string; amount: number; isAncillary?: boolean | null; unit?: string | null }[]
): { value: number; basis: string } | null {
  // Market Research v2: 付随費用（入館料・駐車場代等）は体験本体価格ではないため、
  // 参考換算価格の算出対象から除外する（フォールバックの誤選択を防ぐ）。
  const prices = allPrices.filter((p) => !p.isAncillary);
  if (prices.length === 0) return null;

  // adult/child は定義上すでに1人あたりの料金なので、そのまま採用する。
  const adult = prices.find((p) => p.priceType === "adult");
  if (adult) {
    return { value: adult.amount, basis: "大人料金をそのまま採用" };
  }

  const child = prices.find((p) => p.priceType === "child");
  if (child) {
    return { value: child.amount, basis: "大人料金が無いため子ども料金を採用" };
  }

  // family/group/other は、unitから人数を確定できたものだけを候補にする（優先順位: family→group→other）。
  const multiPersonTypeOrder = ["family", "group", "other"];
  for (const priceType of multiPersonTypeOrder) {
    for (const p of prices.filter((pr) => pr.priceType === priceType)) {
      const count = parsePriceUnitPeopleCount(p.unit);
      if (count && count > 0) {
        const typeLabel = priceType === "family" ? "家族" : priceType === "group" ? "団体" : "その他";
        return {
          value: Math.round(p.amount / count),
          basis: `${typeLabel}料金（${p.unit}）を${count}人分として按分した概算`,
        };
      }
    }
  }

  // 人数を確定できる価格が1件も無い場合は、誤った仮定を避けるため算出不能とする。
  return null;
}

/**
 * 対象年齢を年齢帯バケットに分類する（NORMALIZED層・参考値）。
 * min/maxの中点を用いた簡易分類であり、複数バケットにまたがる可能性のある
 * プログラムを代表点のみで扱う概算である点に注意。
 */
export const AGE_BUCKETS = ["未就学", "小学校低学年", "小学校中高学年", "中学生以上", "不明"] as const;
export type AgeBucket = (typeof AGE_BUCKETS)[number];

export function ageBucket(min: number | null, max: number | null): AgeBucket {
  if (min == null && max == null) return "不明";
  const mid = min != null && max != null ? (min + max) / 2 : (min ?? max)!;
  if (mid <= 5) return "未就学";
  if (mid <= 8) return "小学校低学年";
  if (mid <= 12) return "小学校中高学年";
  return "中学生以上";
}

/**
 * 所要時間を時間帯バケットに分類する（NORMALIZED層・参考値）。
 */
export const DURATION_BUCKETS = ["〜1時間", "1〜2時間", "2〜3時間", "3時間以上", "不明"] as const;
export type DurationBucket = (typeof DURATION_BUCKETS)[number];

export function durationBucket(minutes: number | null): DurationBucket {
  if (minutes == null) return "不明";
  if (minutes <= 60) return "〜1時間";
  if (minutes <= 120) return "1〜2時間";
  if (minutes <= 180) return "2〜3時間";
  return "3時間以上";
}

/**
 * Market Research v2: MARKET_PROGRAM 1件の「調査完成度」を、16項目チェックリストに対して算出する。
 * 各項目は「値あり／確認済み記載なし／未収集」のいずれかに分類される。
 * - 値あり：対応するRAW FACTフィールド（またはMARKET_PROGRAM_ANALYSISの解釈フィールド）に実際の値がある
 * - 確認済み記載なし：値は無いが researchedEmptyItems にその項目keyが記録されている
 * - 未収集：どちらでもない
 * 「値あり」「確認済み記載なし」のいずれかであれば「調査済み」としてcompletenessにカウントする。
 */
export function computeResearchCompleteness(
  program: {
    title: string | null;
    catchCopy: string | null;
    targetAgeMin: number | null;
    targetAgeMax: number | null;
    parentAccompaniment: string | null;
    description: string | null;
    flow: string | null;
    learningElements: string[];
    takeawayElements: string[];
    safetyManagement: string | null;
    instructorNotes: string[];
    durationMinutes: number | null;
    reviewRating: number | null;
    reviewCount: number | null;
    reviewCheckedAt: Date | string | null;
    researchedEmptyItems: string[];
  },
  prices: { isAncillary: boolean | null }[],
  analysis: { parentAppeal: string | null; childAppeal: string | null; specialness: string | null } | null
): {
  total: number;
  filled: number;
  items: { key: string; label: string; status: "value" | "confirmed_empty" | "uncollected" }[];
} {
  const emptySet = new Set(program.researchedEmptyItems);
  const hasNonAncillaryPrice = prices.some((p) => !p.isAncillary);
  const hasAncillaryPrice = prices.some((p) => p.isAncillary);

  const hasValue: Record<string, boolean> = {
    title: !!program.title,
    catchCopy: !!program.catchCopy,
    target: program.targetAgeMin != null || program.targetAgeMax != null || !!program.parentAccompaniment,
    parentAppeal: !!analysis?.parentAppeal,
    childAppeal: !!analysis?.childAppeal,
    description: !!program.description,
    flow: !!program.flow,
    learningElements: program.learningElements.length > 0,
    takeawayElements: program.takeawayElements.length > 0,
    safetyManagement: !!program.safetyManagement,
    instructorNotes: program.instructorNotes.length > 0,
    specialness: !!analysis?.specialness,
    duration: program.durationMinutes != null,
    price: hasNonAncillaryPrice,
    ancillary: hasAncillaryPrice,
    review: program.reviewRating != null || program.reviewCount != null || !!program.reviewCheckedAt,
  };

  const items = MARKET_RESEARCH_CHECKLIST_ITEMS.map(({ key, label }) => {
    const status: "value" | "confirmed_empty" | "uncollected" = hasValue[key]
      ? "value"
      : emptySet.has(key)
        ? "confirmed_empty"
        : "uncollected";
    return { key, label, status };
  });

  const filled = items.filter((i) => i.status !== "uncollected").length;
  return { total: items.length, filled, items };
}
