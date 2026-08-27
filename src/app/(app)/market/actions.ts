"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq, sql } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { marketPrograms, marketProgramPrices, marketProgramAnalysis, platforms } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { MARKET_RESEARCH_CHECKLIST_ITEMS } from "@/lib/constants";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

const MARKET_PROGRAM_ARRAY_FIELDS = [
  "mainActivities",
  "learningElements",
  "takeawayElements",
  "eventDates",
  "marketingMessages",
  "instructorNotes",
  "researchedEmptyItems",
];

export type MarketProgramFormState = { error?: string; values?: FormValues } | undefined;

const priceRowSchema = z.object({
  priceType: z.string().trim().min(1),
  amount: z.union([z.string(), z.number()]),
  unit: z.string().trim().optional(),
  taxIncluded: z.boolean().optional(),
  materialIncluded: z.boolean().optional(),
  target: z.string().trim().optional(),
  notes: z.string().trim().optional(),
  conditionAgeMin: z.union([z.string(), z.number()]).optional(),
  conditionAgeMax: z.union([z.string(), z.number()]).optional(),
  residencyCondition: z.string().trim().optional(),
  courseName: z.string().trim().optional(),
  isAncillary: z.boolean().optional(),
  isRequired: z.boolean().optional(),
});

function splitCsv(v: FormDataEntryValue | null) {
  if (!v || typeof v !== "string") return [];
  return v
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const marketProgramSchema = z.object({
  programName: z.string().trim().optional(),
  platformName: z.string().trim().optional(),
  url: z.string().trim().optional(),
  categoryRaw: z.string().trim().optional(),
  areaText: z.string().trim().optional(),
  matchedRegionId: z.string().trim().optional(),
  targetAgeMin: z.string().trim().optional(),
  targetAgeMax: z.string().trim().optional(),
  durationMinutes: z.string().trim().optional(),
  capacityMin: z.string().trim().optional(),
  capacityMax: z.string().trim().optional(),
  parentAccompaniment: z.string().trim().optional(),
  title: z.string().trim().min(1, "タイトルは必須です"),
  catchCopy: z.string().trim().optional(),
  description: z.string().trim().optional(),
  flow: z.string().trim().optional(),
  reviewRating: z.string().trim().optional(),
  reviewCount: z.string().trim().optional(),
  reviewCheckedAt: z.string().trim().optional(),
  bookingStatus: z.string().trim().optional(),
  fullBookedFlag: z.string().trim().optional(),
  safetyManagement: z.string().trim().optional(),
  rainPolicy: z.string().trim().optional(),
  cancellationPolicy: z.string().trim().optional(),
  sourceId: z.string().trim().optional(),
  lastCheckedAt: z.string().trim().optional(),
  priceRowsJson: z.string().trim().optional(),
});

async function resolvePlatformId(platformName: string | undefined): Promise<string | null> {
  if (!platformName) return null;
  const existing = await db
    .select()
    .from(platforms)
    .where(sql`lower(${platforms.name}) = lower(${platformName})`)
    .limit(1);
  if (existing[0]) return existing[0].id;
  const id = crypto.randomUUID();
  await db.insert(platforms).values({ id, name: platformName });
  return id;
}

function parsePriceRows(json: string | undefined) {
  if (!json) return [];
  try {
    const raw = JSON.parse(json);
    if (!Array.isArray(raw)) return [];
    const rows = [];
    for (const r of raw) {
      const parsed = priceRowSchema.safeParse(r);
      if (!parsed.success) continue;
      const amount = Number(parsed.data.amount);
      if (!Number.isFinite(amount)) continue;
      const conditionAgeMin =
        parsed.data.conditionAgeMin != null && parsed.data.conditionAgeMin !== ""
          ? Number(parsed.data.conditionAgeMin)
          : null;
      const conditionAgeMax =
        parsed.data.conditionAgeMax != null && parsed.data.conditionAgeMax !== ""
          ? Number(parsed.data.conditionAgeMax)
          : null;
      rows.push({
        ...parsed.data,
        amount,
        conditionAgeMin: Number.isFinite(conditionAgeMin) ? conditionAgeMin : null,
        conditionAgeMax: Number.isFinite(conditionAgeMax) ? conditionAgeMax : null,
      });
    }
    return rows;
  } catch {
    return [];
  }
}

// Market Research v2: researchedEmptyItemsはMARKET_RESEARCH_CHECKLIST_ITEMSに定義されたキーのみ許可する
const VALID_CHECKLIST_KEYS = new Set(MARKET_RESEARCH_CHECKLIST_ITEMS.map((i) => i.key));
function parseChecklistKeys(formData: FormData, name: string): string[] {
  return formData
    .getAll(name)
    .map(String)
    .filter((k) => VALID_CHECKLIST_KEYS.has(k as (typeof MARKET_RESEARCH_CHECKLIST_ITEMS)[number]["key"]));
}

export async function createMarketProgramAction(
  _prevState: MarketProgramFormState,
  formData: FormData
): Promise<MarketProgramFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = marketProgramSchema.safeParse({
    programName: formData.get("programName") ?? "",
    platformName: formData.get("platformName") ?? "",
    url: formData.get("url") ?? "",
    categoryRaw: formData.get("categoryRaw") ?? "",
    areaText: formData.get("areaText") ?? "",
    matchedRegionId: formData.get("matchedRegionId") ?? "",
    targetAgeMin: formData.get("targetAgeMin") ?? "",
    targetAgeMax: formData.get("targetAgeMax") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    capacityMin: formData.get("capacityMin") ?? "",
    capacityMax: formData.get("capacityMax") ?? "",
    parentAccompaniment: formData.get("parentAccompaniment") ?? "",
    title: formData.get("title"),
    catchCopy: formData.get("catchCopy") ?? "",
    description: formData.get("description") ?? "",
    flow: formData.get("flow") ?? "",
    reviewRating: formData.get("reviewRating") ?? "",
    reviewCount: formData.get("reviewCount") ?? "",
    reviewCheckedAt: formData.get("reviewCheckedAt") ?? "",
    bookingStatus: formData.get("bookingStatus") ?? "",
    fullBookedFlag: formData.get("fullBookedFlag") ?? "",
    safetyManagement: formData.get("safetyManagement") ?? "",
    rainPolicy: formData.get("rainPolicy") ?? "",
    cancellationPolicy: formData.get("cancellationPolicy") ?? "",
    sourceId: formData.get("sourceId") ?? "",
    lastCheckedAt: formData.get("lastCheckedAt") ?? "",
    priceRowsJson: formData.get("priceRowsJson") ?? "",
  });
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（タイトルは必須です）。",
      values: captureFormValues(formData, MARKET_PROGRAM_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;
  const platformId = await resolvePlatformId(data.platformName || undefined);
  const priceRows = parsePriceRows(data.priceRowsJson);

  const id = crypto.randomUUID();
  await db.insert(marketPrograms).values({
    id,
    programName: data.programName || null,
    url: data.url || null,
    platformId,
    categoryRaw: data.categoryRaw || null,
    areaText: data.areaText || null,
    matchedRegionId: data.matchedRegionId || null,
    targetAgeMin: data.targetAgeMin ? Number(data.targetAgeMin) : null,
    targetAgeMax: data.targetAgeMax ? Number(data.targetAgeMax) : null,
    durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
    capacityMin: data.capacityMin ? Number(data.capacityMin) : null,
    capacityMax: data.capacityMax ? Number(data.capacityMax) : null,
    parentAccompaniment: data.parentAccompaniment || null,
    title: data.title,
    catchCopy: data.catchCopy || null,
    description: data.description || null,
    flow: data.flow || null,
    mainActivities: splitCsv(formData.get("mainActivities")),
    learningElements: splitCsv(formData.get("learningElements")),
    takeawayElements: splitCsv(formData.get("takeawayElements")),
    marketingMessages: splitCsv(formData.get("marketingMessages")),
    instructorNotes: splitCsv(formData.get("instructorNotes")),
    reviewRating: data.reviewRating ? Number(data.reviewRating) : null,
    reviewCount: data.reviewCount ? Number(data.reviewCount) : null,
    reviewCheckedAt: data.reviewCheckedAt ? new Date(data.reviewCheckedAt) : null,
    eventDates: splitCsv(formData.get("eventDates")),
    bookingStatus: data.bookingStatus || null,
    fullBookedFlag: data.fullBookedFlag === "" ? null : data.fullBookedFlag === "true",
    safetyManagement: data.safetyManagement || null,
    rainPolicy: data.rainPolicy || null,
    cancellationPolicy: data.cancellationPolicy || null,
    estimatedFields: [],
    researchedEmptyItems: parseChecklistKeys(formData, "researchedEmptyItems"),
    sourceId: data.sourceId || null,
    lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt) : null,
    createdById: user.id,
  });

  if (priceRows.length > 0) {
    await db.insert(marketProgramPrices).values(
      priceRows.map((r) => ({
        id: crypto.randomUUID(),
        marketProgramId: id,
        priceType: r.priceType,
        amount: r.amount,
        unit: r.unit || null,
        taxIncluded: r.taxIncluded ?? null,
        materialIncluded: r.materialIncluded ?? null,
        target: r.target || null,
        notes: r.notes || null,
        conditionAgeMin: r.conditionAgeMin ?? null,
        conditionAgeMax: r.conditionAgeMax ?? null,
        residencyCondition: r.residencyCondition || null,
        courseName: r.courseName || null,
        isAncillary: r.isAncillary ?? false,
        isRequired: r.isRequired ?? true,
      }))
    );
  }

  revalidatePath("/market");
  revalidatePath("/");
  redirect(`/market/${id}`);
}

export async function updateMarketProgramAction(
  id: string,
  _prevState: MarketProgramFormState,
  formData: FormData
): Promise<MarketProgramFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const parsed = marketProgramSchema.safeParse({
    programName: formData.get("programName") ?? "",
    platformName: formData.get("platformName") ?? "",
    url: formData.get("url") ?? "",
    categoryRaw: formData.get("categoryRaw") ?? "",
    areaText: formData.get("areaText") ?? "",
    matchedRegionId: formData.get("matchedRegionId") ?? "",
    targetAgeMin: formData.get("targetAgeMin") ?? "",
    targetAgeMax: formData.get("targetAgeMax") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    capacityMin: formData.get("capacityMin") ?? "",
    capacityMax: formData.get("capacityMax") ?? "",
    parentAccompaniment: formData.get("parentAccompaniment") ?? "",
    title: formData.get("title"),
    catchCopy: formData.get("catchCopy") ?? "",
    description: formData.get("description") ?? "",
    flow: formData.get("flow") ?? "",
    reviewRating: formData.get("reviewRating") ?? "",
    reviewCount: formData.get("reviewCount") ?? "",
    reviewCheckedAt: formData.get("reviewCheckedAt") ?? "",
    bookingStatus: formData.get("bookingStatus") ?? "",
    fullBookedFlag: formData.get("fullBookedFlag") ?? "",
    safetyManagement: formData.get("safetyManagement") ?? "",
    rainPolicy: formData.get("rainPolicy") ?? "",
    cancellationPolicy: formData.get("cancellationPolicy") ?? "",
    sourceId: formData.get("sourceId") ?? "",
    lastCheckedAt: formData.get("lastCheckedAt") ?? "",
    priceRowsJson: formData.get("priceRowsJson") ?? "",
  });
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（タイトルは必須です）。",
      values: captureFormValues(formData, MARKET_PROGRAM_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;
  const platformId = await resolvePlatformId(data.platformName || undefined);
  const priceRows = parsePriceRows(data.priceRowsJson);

  await db
    .update(marketPrograms)
    .set({
      programName: data.programName || null,
      url: data.url || null,
      platformId,
      categoryRaw: data.categoryRaw || null,
      areaText: data.areaText || null,
      matchedRegionId: data.matchedRegionId || null,
      targetAgeMin: data.targetAgeMin ? Number(data.targetAgeMin) : null,
      targetAgeMax: data.targetAgeMax ? Number(data.targetAgeMax) : null,
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
      capacityMin: data.capacityMin ? Number(data.capacityMin) : null,
      capacityMax: data.capacityMax ? Number(data.capacityMax) : null,
      parentAccompaniment: data.parentAccompaniment || null,
      title: data.title,
      catchCopy: data.catchCopy || null,
      description: data.description || null,
      flow: data.flow || null,
      mainActivities: splitCsv(formData.get("mainActivities")),
      learningElements: splitCsv(formData.get("learningElements")),
      takeawayElements: splitCsv(formData.get("takeawayElements")),
      marketingMessages: splitCsv(formData.get("marketingMessages")),
      instructorNotes: splitCsv(formData.get("instructorNotes")),
      reviewRating: data.reviewRating ? Number(data.reviewRating) : null,
      reviewCount: data.reviewCount ? Number(data.reviewCount) : null,
      reviewCheckedAt: data.reviewCheckedAt ? new Date(data.reviewCheckedAt) : null,
      eventDates: splitCsv(formData.get("eventDates")),
      bookingStatus: data.bookingStatus || null,
      fullBookedFlag: data.fullBookedFlag === "" ? null : data.fullBookedFlag === "true",
      safetyManagement: data.safetyManagement || null,
      rainPolicy: data.rainPolicy || null,
      cancellationPolicy: data.cancellationPolicy || null,
      researchedEmptyItems: parseChecklistKeys(formData, "researchedEmptyItems"),
      sourceId: data.sourceId || null,
      lastCheckedAt: data.lastCheckedAt ? new Date(data.lastCheckedAt) : null,
      updatedAt: new Date(),
    })
    .where(eq(marketPrograms.id, id));

  await db.delete(marketProgramPrices).where(eq(marketProgramPrices.marketProgramId, id));
  if (priceRows.length > 0) {
    await db.insert(marketProgramPrices).values(
      priceRows.map((r) => ({
        id: crypto.randomUUID(),
        marketProgramId: id,
        priceType: r.priceType,
        amount: r.amount,
        unit: r.unit || null,
        taxIncluded: r.taxIncluded ?? null,
        materialIncluded: r.materialIncluded ?? null,
        target: r.target || null,
        notes: r.notes || null,
        conditionAgeMin: r.conditionAgeMin ?? null,
        conditionAgeMax: r.conditionAgeMax ?? null,
        residencyCondition: r.residencyCondition || null,
        courseName: r.courseName || null,
        isAncillary: r.isAncillary ?? false,
        isRequired: r.isRequired ?? true,
      }))
    );
  }

  revalidatePath("/market");
  revalidatePath(`/market/${id}`);
  revalidatePath("/market/insight");
  redirect(`/market/${id}`);
}

// ═════════════════════════════════════════════════════════════
// Market Research v2: MARKET_PROGRAM_ANALYSIS（INFERENCE層）
// RAW FACT（marketing_messages・レビュー件数等）から読み取った解釈を、
// RAW FACT本体（market_programs）とは別レコードとして保存する。1プログラム1レコード（upsert）。
// ═════════════════════════════════════════════════════════════

export type MarketProgramAnalysisFormState = { error?: string; values?: FormValues } | undefined;

const marketProgramAnalysisSchema = z.object({
  parentAppeal: z.string().trim().optional(),
  childAppeal: z.string().trim().optional(),
  specialness: z.string().trim().optional(),
  educationalValue: z.string().trim().optional(),
  childReactionFromReviews: z.string().trim().optional(),
  safetyEvaluationFromReviews: z.string().trim().optional(),
  guideEvaluationFromReviews: z.string().trim().optional(),
  learningValueFromReviews: z.string().trim().optional(),
});

export async function upsertMarketProgramAnalysisAction(
  marketProgramId: string,
  _prevState: MarketProgramAnalysisFormState,
  formData: FormData
): Promise<MarketProgramAnalysisFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = marketProgramAnalysisSchema.safeParse({
    parentAppeal: formData.get("parentAppeal") ?? "",
    childAppeal: formData.get("childAppeal") ?? "",
    specialness: formData.get("specialness") ?? "",
    educationalValue: formData.get("educationalValue") ?? "",
    childReactionFromReviews: formData.get("childReactionFromReviews") ?? "",
    safetyEvaluationFromReviews: formData.get("safetyEvaluationFromReviews") ?? "",
    guideEvaluationFromReviews: formData.get("guideEvaluationFromReviews") ?? "",
    learningValueFromReviews: formData.get("learningValueFromReviews") ?? "",
  });
  if (!parsed.success) {
    return { error: "入力内容をご確認ください。", values: captureFormValues(formData, []) };
  }
  const data = parsed.data;

  const existing = await db
    .select({ id: marketProgramAnalysis.id })
    .from(marketProgramAnalysis)
    .where(eq(marketProgramAnalysis.marketProgramId, marketProgramId))
    .limit(1);

  const values = {
    parentAppeal: data.parentAppeal || null,
    childAppeal: data.childAppeal || null,
    specialness: data.specialness || null,
    educationalValue: data.educationalValue || null,
    childReactionFromReviews: data.childReactionFromReviews || null,
    safetyEvaluationFromReviews: data.safetyEvaluationFromReviews || null,
    guideEvaluationFromReviews: data.guideEvaluationFromReviews || null,
    learningValueFromReviews: data.learningValueFromReviews || null,
    analyzedById: user.id,
    analyzedAt: new Date(),
    updatedAt: new Date(),
  };

  if (existing[0]) {
    await db.update(marketProgramAnalysis).set(values).where(eq(marketProgramAnalysis.id, existing[0].id));
  } else {
    await db.insert(marketProgramAnalysis).values({
      id: crypto.randomUUID(),
      marketProgramId,
      ...values,
    });
  }

  revalidatePath(`/market/${marketProgramId}`);
  revalidatePath("/market/insight");
  redirect(`/market/${marketProgramId}`);
}
