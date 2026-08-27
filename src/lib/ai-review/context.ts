// MVP-B: Claude APIに渡すコンテキストの組み立て（AI呼び出しなし・決定的処理）。
//
// ここで作る ReferenceCatalog は、Claude APIに渡すJSONと、guards.tsでの
// based_on参照チェックの両方に使う「唯一の真実源」。Claudeに渡していない情報のIDは
// 決してvalidReferenceIdsに含めない。

import { and, eq, or } from "drizzle-orm";
import { db } from "@/db";
import {
  programs,
  programResources,
  programActivityOpportunities,
  resources,
  resourceRelationships,
  activityOpportunities,
  marketPrograms,
  marketProgramPrices,
  marketProgramAnalysis,
  programFeedback,
  regions,
} from "@/db/schema";
import { estimatePerPersonPrice, computeResearchCompleteness } from "@/lib/utils";
import {
  selectComparablePrograms,
  type ComparisonCandidate,
  type ComparisonTarget,
} from "./market-comparison";

export type ReferenceCatalog = {
  validReferenceIds: Set<string>;
  // 人間可読ラベル（UIやログでの表示用）
  labels: Map<string, string>;
};

export type AiReviewContext = {
  program: {
    id: string;
    title: string;
    concept: string | null;
    inquiryTheme: string | null;
    targetAudience: string | null;
    targetAgeMin: number | null;
    targetAgeMax: number | null;
    durationMinutes: number | null;
    recommendedPrice: number | null;
    seasons: string[];
    regionName: string;
    marketNeeds: string | null;
    whyChichibu: string | null;
    experienceContent: string | null;
    participantQuestions: string | null;
    capacityMin: number | null;
    capacityMax: number | null;
  };
  resources: Array<{
    ref: string;
    name: string;
    category: string;
    summary: string | null;
    factStatus: string;
  }>;
  relationships: Array<{
    ref: string;
    fromName: string;
    toName: string;
    category: string;
    label: string;
    description: string | null;
    factStatus: string;
    confidence: number | null;
    hasSource: boolean;
  }>;
  activityOpportunities: Array<{
    ref: string;
    title: string;
    description: string | null;
    factStatus: string;
    confidence: number | null;
    hasSource: boolean;
    appropriateAgeMin: number | null;
    appropriateAgeMax: number | null;
    durationMinutesMin: number | null;
    durationMinutesMax: number | null;
    needsGuide: boolean | null;
    safetyRisks: string | null;
  }>;
  comparableMarketPrograms: Array<{
    ref: string;
    title: string;
    estimatedPricePerPerson: number | null;
    durationMinutes: number | null;
    ageMin: number | null;
    ageMax: number | null;
    catchCopy: string | null;
    description: string | null;
    learningElements: string[];
    takeawayElements: string[];
    marketingMessages: string[];
    instructorNotes: string[];
    safetyManagement: string | null;
    researchCompleteness: { filled: number; total: number };
    analysisRef: string | null;
    parentAppeal: string | null;
    childAppeal: string | null;
    specialness: string | null;
    educationalValue: string | null;
    comparisonScore: number;
  }>;
  feedback: Array<{
    ref: string;
    easeRating: string;
    ideationCounterfactual: string;
    confusionPoints: string | null;
    missingInfo: string | null;
    unnecessaryInfo: string | null;
  }>;
};

export async function buildAiReviewContext(
  programId: string
): Promise<{ context: AiReviewContext; catalog: ReferenceCatalog }> {
  const [program] = await db.select().from(programs).where(eq(programs.id, programId)).limit(1);
  if (!program) throw new Error(`PROGRAM not found: ${programId}`);

  const [region] = await db.select().from(regions).where(eq(regions.id, program.regionId)).limit(1);

  const linkedResources = await db
    .select({ resource: resources })
    .from(programResources)
    .innerJoin(resources, eq(programResources.resourceId, resources.id))
    .where(eq(programResources.programId, programId));

  const linkedActivities = await db
    .select({ activity: activityOpportunities })
    .from(programActivityOpportunities)
    .innerJoin(activityOpportunities, eq(programActivityOpportunities.activityOpportunityId, activityOpportunities.id))
    .where(eq(programActivityOpportunities.programId, programId));

  const resourceIds = linkedResources.map((r) => r.resource.id);

  const relationships =
    resourceIds.length > 0
      ? await db
          .select({
            rel: resourceRelationships,
            fromRes: resources,
          })
          .from(resourceRelationships)
          .innerJoin(resources, eq(resourceRelationships.fromResourceId, resources.id))
          .where(
            and(
              eq(resourceRelationships.isSample, false),
              or(
                ...resourceIds.map((id) => eq(resourceRelationships.fromResourceId, id)),
                ...resourceIds.map((id) => eq(resourceRelationships.toResourceId, id))
              )
            )
          )
      : [];

  // toResourceの名前も個別に引く（joinを二重にしないための簡易実装）
  const relToResourceIds = Array.from(new Set(relationships.map((r) => r.rel.toResourceId)));
  const toResources =
    relToResourceIds.length > 0
      ? await db
          .select()
          .from(resources)
          .where(or(...relToResourceIds.map((id) => eq(resources.id, id))))
      : [];
  const toResourceById = new Map(toResources.map((r) => [r.id, r]));

  const feedbackRows = await db
    .select()
    .from(programFeedback)
    .where(eq(programFeedback.programId, programId));

  const catalog: ReferenceCatalog = { validReferenceIds: new Set(), labels: new Map() };
  function register(ref: string, label: string) {
    catalog.validReferenceIds.add(ref);
    catalog.labels.set(ref, label);
    return ref;
  }

  register("program_field:title", "PROGRAM.title");
  register("program_field:concept", "PROGRAM.concept");
  register("program_field:inquiry_theme", "PROGRAM.inquiry_theme");
  register("program_field:experience_content", "PROGRAM.experience_content");
  register("program_field:why_chichibu", "PROGRAM.why_chichibu");
  register("program_field:market_needs", "PROGRAM.market_needs");

  const contextResources = linkedResources.map(({ resource }) => {
    const ref = register(`resource:${resource.id}`, resource.name);
    return {
      ref,
      name: resource.name,
      category: resource.category,
      summary: resource.summary,
      factStatus: resource.factStatus,
    };
  });

  const contextRelationships = relationships.map(({ rel, fromRes }) => {
    const toRes = toResourceById.get(rel.toResourceId);
    const ref = register(
      `relationship:${rel.id}`,
      `${fromRes.name}→${toRes?.name ?? "?"}:${rel.relationshipLabel}`
    );
    return {
      ref,
      fromName: fromRes.name,
      toName: toRes?.name ?? "不明",
      category: rel.relationshipCategory,
      label: rel.relationshipLabel,
      description: rel.description,
      factStatus: rel.factStatus,
      confidence: rel.confidence,
      hasSource: rel.sourceId != null,
    };
  });

  const contextActivities = linkedActivities.map(({ activity }) => {
    const ref = register(`activity_opportunity:${activity.id}`, activity.title);
    return {
      ref,
      title: activity.title,
      description: activity.description,
      factStatus: activity.factStatus,
      confidence: activity.confidence,
      hasSource: activity.sourceId != null,
      appropriateAgeMin: activity.appropriateAgeMin,
      appropriateAgeMax: activity.appropriateAgeMax,
      durationMinutesMin: activity.durationMinutesMin,
      durationMinutesMax: activity.durationMinutesMax,
      needsGuide: activity.needsGuide,
      safetyRisks: activity.safetyRisks,
    };
  });

  const contextFeedback = feedbackRows.map((f) => {
    const ref = register(`program_feedback:${f.id}`, `feedback(${f.easeRating})`);
    return {
      ref,
      easeRating: f.easeRating,
      ideationCounterfactual: f.ideationCounterfactual,
      confusionPoints: f.confusionPoints,
      missingInfo: f.missingInfo,
      unnecessaryInfo: f.unnecessaryInfo,
    };
  });

  // ── 市場比較対象の決定的選定（AI不使用） ──
  const allMarketPrograms = await db.select().from(marketPrograms);
  const allAnalysis = await db.select().from(marketProgramAnalysis);
  const analysisByProgram = new Map(allAnalysis.map((a) => [a.marketProgramId, a]));
  const allPriceRows = await db.select().from(marketProgramPrices);
  const pricesByProgram = new Map<string, typeof allPriceRows>();
  for (const p of allPriceRows) {
    const arr = pricesByProgram.get(p.marketProgramId) ?? [];
    arr.push(p);
    pricesByProgram.set(p.marketProgramId, arr);
  }

  const NON_REAL_MARKET_PROGRAM_MARKER = "※これはシードデータによるサンプルです";

  const targetText = [
    program.concept,
    program.inquiryTheme,
    program.whyChichibu,
    program.experienceContent,
    ...contextResources.map((r) => `${r.category} ${r.summary ?? ""}`),
    ...contextActivities.map((a) => `${a.title} ${a.description ?? ""}`),
  ]
    .filter(Boolean)
    .join(" ");

  const target: ComparisonTarget = {
    ageMin: program.targetAgeMin,
    ageMax: program.targetAgeMax,
    durationMinutes: program.durationMinutes,
    priceYen: program.recommendedPrice,
    text: targetText,
    resourceCategories: contextResources.map((r) => r.category),
    activityCount: contextActivities.length,
    hasTakeaway: null, // PROGRAM側に持ち帰り成果の専用フィールドが無いため常にunknown
    needsGuide: contextActivities.some((a) => a.needsGuide === true)
      ? true
      : contextActivities.every((a) => a.needsGuide == null)
        ? null
        : false,
  };

  const candidates: ComparisonCandidate[] = allMarketPrograms
    .filter((mp) => !(mp.description ?? "").includes(NON_REAL_MARKET_PROGRAM_MARKER))
    .map((mp) => {
      const prices = pricesByProgram.get(mp.id) ?? [];
      const nonAncillary = prices.filter((p) => !p.isAncillary);
      const est = estimatePerPersonPrice(
        prices.map((p) => ({ priceType: p.priceType, amount: p.amount, isAncillary: p.isAncillary, unit: p.unit }))
      );
      return {
        id: mp.id,
        title: mp.title ?? mp.programName ?? "(無題)",
        ageMin: mp.targetAgeMin,
        ageMax: mp.targetAgeMax,
        durationMinutes: mp.durationMinutes,
        priceYen: est?.value ?? null,
        categoryRaw: mp.categoryRaw,
        text: [mp.catchCopy, mp.description, ...(mp.marketingMessages ?? [])].filter(Boolean).join(" "),
        learningElementsCount: (mp.learningElements ?? []).length,
        takeawayElementsCount: (mp.takeawayElements ?? []).length,
        instructorNotesCount: (mp.instructorNotes ?? []).length,
        courseCount: new Set(nonAncillary.map((p) => p.courseName || p.priceType)).size,
      };
    });

  const scored = selectComparablePrograms(target, candidates, { min: 5, max: 10 });
  const candidateById = new Map(candidates.map((c) => [c.id, c]));
  const marketProgramById = new Map(allMarketPrograms.map((m) => [m.id, m]));

  const comparableMarketPrograms = scored.map((s) => {
    const mp = marketProgramById.get(s.candidateId)!;
    const c = candidateById.get(s.candidateId)!;
    const analysis = analysisByProgram.get(mp.id);
    const prices = pricesByProgram.get(mp.id) ?? [];
    const completeness = computeResearchCompleteness(
      {
        title: mp.title,
        catchCopy: mp.catchCopy,
        targetAgeMin: mp.targetAgeMin,
        targetAgeMax: mp.targetAgeMax,
        parentAccompaniment: mp.parentAccompaniment,
        description: mp.description,
        flow: mp.flow,
        learningElements: mp.learningElements ?? [],
        takeawayElements: mp.takeawayElements ?? [],
        safetyManagement: mp.safetyManagement,
        instructorNotes: mp.instructorNotes ?? [],
        durationMinutes: mp.durationMinutes,
        reviewRating: mp.reviewRating,
        reviewCount: mp.reviewCount,
        reviewCheckedAt: mp.reviewCheckedAt,
        researchedEmptyItems: mp.researchedEmptyItems ?? [],
      },
      prices.map((p) => ({ isAncillary: p.isAncillary })),
      analysis
        ? {
            parentAppeal: analysis.parentAppeal,
            childAppeal: analysis.childAppeal,
            specialness: analysis.specialness,
          }
        : null
    );

    const ref = register(`market_program:${mp.id}`, mp.title ?? c.title);
    const analysisRef = analysis ? register(`market_program_analysis:${analysis.id}`, `${mp.title} analysis`) : null;

    return {
      ref,
      title: mp.title ?? c.title,
      estimatedPricePerPerson: c.priceYen,
      durationMinutes: mp.durationMinutes,
      ageMin: mp.targetAgeMin,
      ageMax: mp.targetAgeMax,
      catchCopy: mp.catchCopy,
      description: mp.description,
      learningElements: mp.learningElements ?? [],
      takeawayElements: mp.takeawayElements ?? [],
      marketingMessages: mp.marketingMessages ?? [],
      instructorNotes: mp.instructorNotes ?? [],
      safetyManagement: mp.safetyManagement,
      researchCompleteness: { filled: completeness.filled, total: completeness.total },
      analysisRef,
      parentAppeal: analysis?.parentAppeal ?? null,
      childAppeal: analysis?.childAppeal ?? null,
      specialness: analysis?.specialness ?? null,
      educationalValue: analysis?.educationalValue ?? null,
      comparisonScore: s.total,
    };
  });

  const context: AiReviewContext = {
    program: {
      id: program.id,
      title: program.title,
      concept: program.concept,
      inquiryTheme: program.inquiryTheme,
      targetAudience: program.targetAudience,
      targetAgeMin: program.targetAgeMin,
      targetAgeMax: program.targetAgeMax,
      durationMinutes: program.durationMinutes,
      recommendedPrice: program.recommendedPrice,
      seasons: program.seasons,
      regionName: region?.name ?? "不明",
      marketNeeds: program.marketNeeds,
      whyChichibu: program.whyChichibu,
      experienceContent: program.experienceContent,
      participantQuestions: program.participantQuestions,
      capacityMin: program.capacityMin,
      capacityMax: program.capacityMax,
    },
    resources: contextResources,
    relationships: contextRelationships,
    activityOpportunities: contextActivities,
    comparableMarketPrograms,
    feedback: contextFeedback,
  };

  return { context, catalog };
}
