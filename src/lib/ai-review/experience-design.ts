// 「Experience Design Review」（無料ドライラン, scripts/mfr-phase2-experience-design-review.mjs）で
// 追加された改善IDEAを、④の通常の改善IDEAと区別して表示するための分類ヘルパー。
// タイトルの先頭記号で判定する。「【条件付きIDEA】」等、他の用途で「【」を使うタイトルと
// 衝突しないよう、Experience Design Reviewで実際に使われた接頭辞のみを許可リストにする。
const EXPERIENCE_DESIGN_TITLE_PREFIXES = ["【触れる", "【見る】", "【導入】", "【振り返る】"] as const;

export function isExperienceDesignReviewIdea(title: string): boolean {
  return EXPERIENCE_DESIGN_TITLE_PREFIXES.some((prefix) => title.startsWith(prefix));
}
