// MVP-B: FACT/INFERENCE/IDEAを壊さないためのガード関数群。
//
// ここでの「ガード」は、Zodスキーマの型チェックだけでは防げない、意味的な不正を弾く役割を持つ。
// 具体的には:
//  1. based_on に、実際にコンテキストとして渡していないIDが含まれていないか（幻覚の参照を弾く）
//  2. product_draftのused_approved_ideasが、人間が承認したIDEAの部分集合になっているか
//     （承認されていないIDEAがドラフトに紛れ込んでいないか）
//  3. unresolved_research_neededが、実在しかつ未解決のmissing_researchのみを指しているか
//
// これらは全て「保存前」に呼び出し、違反があれば例外を投げて保存させない。

import type {
  DiagnosisResponse,
  ImprovementIdeaRaw,
  MissingResearchItem,
  ProductDraft,
} from "./types";

export class AiReviewGuardError extends Error {
  constructor(
    message: string,
    public readonly violations: string[]
  ) {
    super(message);
    this.name = "AiReviewGuardError";
  }
}

/**
 * based_on配列の全要素が validReferenceIds に含まれているかを検証する。
 * 1つでも含まれないIDがあれば、その項目のインデックスと不正なIDを違反として集める。
 */
function checkBasedOn(
  items: { based_on: string[] }[],
  validReferenceIds: ReadonlySet<string>,
  itemLabel: string
): string[] {
  const violations: string[] = [];
  items.forEach((item, i) => {
    for (const ref of item.based_on) {
      if (!validReferenceIds.has(ref)) {
        violations.push(`${itemLabel}[${i}].based_on に未知の参照ID "${ref}" が含まれています`);
      }
    }
  });
  return violations;
}

export function guardDiagnosisResponse(
  response: DiagnosisResponse,
  validReferenceIds: ReadonlySet<string>
): void {
  const violations: string[] = [
    ...checkBasedOn(response.diagnosis, validReferenceIds, "diagnosis"),
    ...checkBasedOn([response.market_comparison], validReferenceIds, "market_comparison"),
  ];

  // market_comparisonのcompared_program_idsは必ずmarket_program:形式で、コンテキストに実在すること
  for (const id of response.market_comparison.compared_program_ids) {
    const ref = id.startsWith("market_program:") ? id : `market_program:${id}`;
    if (!validReferenceIds.has(ref)) {
      violations.push(`market_comparison.compared_program_ids に未知のMARKET_PROGRAM ID "${id}" が含まれています`);
    }
  }

  if (violations.length > 0) {
    throw new AiReviewGuardError(
      "診断レスポンスが存在しないFACT/INFERENCEを参照しています（保存を中止しました）",
      violations
    );
  }
}

export function guardImprovementIdeas(
  ideas: ImprovementIdeaRaw[],
  validReferenceIds: ReadonlySet<string>
): void {
  const violations = checkBasedOn(ideas, validReferenceIds, "improvement_ideas");
  if (violations.length > 0) {
    throw new AiReviewGuardError(
      "改善アイデアが存在しないFACT/INFERENCE/診断結果を参照しています（保存を中止しました）",
      violations
    );
  }
}

export function guardProductDraft(
  draft: ProductDraft,
  approvedIdeaIds: ReadonlySet<string>,
  unresolvedMissingResearchIds: ReadonlySet<string>
): void {
  const violations: string[] = [];

  for (const usedId of draft.used_approved_ideas) {
    if (!approvedIdeaIds.has(usedId)) {
      violations.push(
        `used_approved_ideas に、人間が承認していないIDEA "${usedId}" が含まれています`
      );
    }
  }

  for (const id of draft.unresolved_research_needed) {
    if (!unresolvedMissingResearchIds.has(id)) {
      violations.push(
        `unresolved_research_needed に、存在しないか既に解決済みのmissing_research "${id}" が含まれています`
      );
    }
  }

  if (violations.length > 0) {
    throw new AiReviewGuardError(
      "Product Draftが承認されていないIDEA、または不正なmissing_research参照を含んでいます（保存を中止しました）",
      violations
    );
  }
}

/**
 * missing_researchの解決参照（resolved_reference_ids）が、実在するFACT参照IDのみで
 * 構成されているかを検証する。人間がUIから解決情報を入力する際に呼ぶ。
 */
export function guardMissingResearchResolution(
  referenceIds: string[],
  validReferenceIds: ReadonlySet<string>
): void {
  const violations = referenceIds
    .filter((ref) => !validReferenceIds.has(ref))
    .map((ref) => `resolved_reference_ids に未知の参照ID "${ref}" が含まれています`);
  if (violations.length > 0) {
    throw new AiReviewGuardError(
      "解決根拠が存在しないFACTを参照しています（保存を中止しました）",
      violations
    );
  }
}

export function unresolvedIds(items: MissingResearchItem[]): Set<string> {
  return new Set(items.filter((i) => !i.resolved).map((i) => i.id));
}
