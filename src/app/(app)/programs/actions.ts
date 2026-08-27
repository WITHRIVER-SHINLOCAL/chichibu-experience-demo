"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  programs,
  programActivityOpportunities,
  programResources,
  programWizardLogs,
  programFeedback,
  SEASONS,
  PROGRAM_STATUSES,
  EASE_RATINGS,
  IDEATION_COUNTERFACTUALS,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

const PROGRAM_ARRAY_FIELDS = ["seasons", "resourceIds", "activityOpportunityIds"];

export type ProgramFormState = { error?: string; values?: FormValues } | undefined;

const programSchema = z.object({
  regionId: z.string().trim().min(1, "地域は必須です"),
  title: z.string().trim().min(1, "タイトルは必須です"),
  concept: z.string().trim().optional(),
  targetAudience: z.string().trim().optional(),
  targetAgeMin: z.string().trim().optional(),
  targetAgeMax: z.string().trim().optional(),
  marketNeeds: z.string().trim().optional(),
  whyChichibu: z.string().trim().optional(),
  experienceContent: z.string().trim().optional(),
  inquiryTheme: z.string().trim().optional(),
  participantQuestions: z.string().trim().optional(),
  durationMinutes: z.string().trim().optional(),
  capacityMin: z.string().trim().optional(),
  capacityMax: z.string().trim().optional(),
  recommendedPrice: z.string().trim().optional(),
  status: z.enum(PROGRAM_STATUSES).optional(),
});

export async function createProgramAction(
  _prevState: ProgramFormState,
  formData: FormData
): Promise<ProgramFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = programSchema.safeParse({
    regionId: formData.get("regionId"),
    title: formData.get("title"),
    concept: formData.get("concept") ?? "",
    targetAudience: formData.get("targetAudience") ?? "",
    targetAgeMin: formData.get("targetAgeMin") ?? "",
    targetAgeMax: formData.get("targetAgeMax") ?? "",
    marketNeeds: formData.get("marketNeeds") ?? "",
    whyChichibu: formData.get("whyChichibu") ?? "",
    experienceContent: formData.get("experienceContent") ?? "",
    inquiryTheme: formData.get("inquiryTheme") ?? "",
    participantQuestions: formData.get("participantQuestions") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    capacityMin: formData.get("capacityMin") ?? "",
    capacityMax: formData.get("capacityMax") ?? "",
    recommendedPrice: formData.get("recommendedPrice") ?? "",
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（地域・タイトルは必須です）。",
      values: captureFormValues(formData, PROGRAM_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;
  const seasons = SEASONS.filter((s) => formData.getAll("seasons").includes(s));
  const resourceIds = formData.getAll("resourceIds").map(String).filter(Boolean);
  const activityOpportunityIds = formData.getAll("activityOpportunityIds").map(String).filter(Boolean);

  const id = crypto.randomUUID();

  await db.insert(programs).values({
    id,
    regionId: data.regionId,
    title: data.title,
    concept: data.concept || null,
    targetAudience: data.targetAudience || null,
    targetAgeMin: data.targetAgeMin ? Number(data.targetAgeMin) : null,
    targetAgeMax: data.targetAgeMax ? Number(data.targetAgeMax) : null,
    marketNeeds: data.marketNeeds || null,
    whyChichibu: data.whyChichibu || null,
    experienceContent: data.experienceContent || null,
    inquiryTheme: data.inquiryTheme || null,
    participantQuestions: data.participantQuestions || null,
    seasons,
    durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
    capacityMin: data.capacityMin ? Number(data.capacityMin) : null,
    capacityMax: data.capacityMax ? Number(data.capacityMax) : null,
    recommendedPrice: data.recommendedPrice ? Number(data.recommendedPrice) : null,
    status: data.status ?? "IDEA",
    factStatus: "IDEA",
    humanApproved: true,
    generatedBy: null,
    ownerId: user.id,
  });

  if (activityOpportunityIds.length > 0) {
    await db.insert(programActivityOpportunities).values(
      activityOpportunityIds.map((aoId, i) => ({
        id: crypto.randomUUID(),
        programId: id,
        activityOpportunityId: aoId,
        sortOrder: i,
      }))
    );
  }
  if (resourceIds.length > 0) {
    await db.insert(programResources).values(
      resourceIds.map((rId, i) => ({
        id: crypto.randomUUID(),
        programId: id,
        resourceId: rId,
        sortOrder: i,
      }))
    );
  }

  // MVP実運用テスト用: ウィザードの操作時間計測ログ（正式なプロダクト機能ではない）。
  // ProgramWizard.tsxのhandleWizardSubmitがhidden fieldに書き込んだ値を保存する。
  // 未対応の古いフォーム送信（値なし）の場合は記録しない。
  const wizardStartedAtRaw = formData.get("wizardStartedAt");
  const wizardStepDurationsRaw = formData.get("wizardStepDurationsJson");
  if (wizardStartedAtRaw && wizardStepDurationsRaw) {
    const startedAt = new Date(String(wizardStartedAtRaw));
    const savedAt = new Date();
    if (!Number.isNaN(startedAt.getTime())) {
      const totalSeconds = Math.max(0, Math.round((savedAt.getTime() - startedAt.getTime()) / 1000));
      await db.insert(programWizardLogs).values({
        id: crypto.randomUUID(),
        programId: id,
        startedAt,
        savedAt,
        totalSeconds,
        stepDurationsJson: String(wizardStepDurationsRaw),
      });
      // 開発用ログ: 実運用テスト時にサーバー側のターミナルからも確認できるようにする
      console.log(
        `[wizard-timing] program=${id} totalSeconds=${totalSeconds} steps=${String(wizardStepDurationsRaw)}`
      );
    }
  }

  revalidatePath("/programs");
  revalidatePath("/");
  redirect(`/programs/${id}`);
}

export async function updateProgramAction(
  id: string,
  _prevState: ProgramFormState,
  formData: FormData
): Promise<ProgramFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const parsed = programSchema.safeParse({
    regionId: formData.get("regionId"),
    title: formData.get("title"),
    concept: formData.get("concept") ?? "",
    targetAudience: formData.get("targetAudience") ?? "",
    targetAgeMin: formData.get("targetAgeMin") ?? "",
    targetAgeMax: formData.get("targetAgeMax") ?? "",
    marketNeeds: formData.get("marketNeeds") ?? "",
    whyChichibu: formData.get("whyChichibu") ?? "",
    experienceContent: formData.get("experienceContent") ?? "",
    inquiryTheme: formData.get("inquiryTheme") ?? "",
    participantQuestions: formData.get("participantQuestions") ?? "",
    durationMinutes: formData.get("durationMinutes") ?? "",
    capacityMin: formData.get("capacityMin") ?? "",
    capacityMax: formData.get("capacityMax") ?? "",
    recommendedPrice: formData.get("recommendedPrice") ?? "",
    status: formData.get("status") || undefined,
  });
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（地域・タイトルは必須です）。",
      values: captureFormValues(formData, PROGRAM_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;
  const seasons = SEASONS.filter((s) => formData.getAll("seasons").includes(s));

  await db
    .update(programs)
    .set({
      regionId: data.regionId,
      title: data.title,
      concept: data.concept || null,
      targetAudience: data.targetAudience || null,
      targetAgeMin: data.targetAgeMin ? Number(data.targetAgeMin) : null,
      targetAgeMax: data.targetAgeMax ? Number(data.targetAgeMax) : null,
      marketNeeds: data.marketNeeds || null,
      whyChichibu: data.whyChichibu || null,
      experienceContent: data.experienceContent || null,
      inquiryTheme: data.inquiryTheme || null,
      participantQuestions: data.participantQuestions || null,
      seasons,
      durationMinutes: data.durationMinutes ? Number(data.durationMinutes) : null,
      capacityMin: data.capacityMin ? Number(data.capacityMin) : null,
      capacityMax: data.capacityMax ? Number(data.capacityMax) : null,
      recommendedPrice: data.recommendedPrice ? Number(data.recommendedPrice) : null,
      status: data.status ?? "IDEA",
      updatedAt: new Date(),
    })
    .where(eq(programs.id, id));

  revalidatePath("/programs");
  revalidatePath(`/programs/${id}`);
  redirect(`/programs/${id}`);
}

export async function deleteProgramActivityOpportunityAction(programId: string, linkId: string) {
  if (isPublicDemoReadOnly()) {
    return;
  }
  await requireUser();
  await db.delete(programActivityOpportunities).where(eq(programActivityOpportunities.id, linkId));
  revalidatePath(`/programs/${programId}`);
}

export async function deleteProgramResourceAction(programId: string, linkId: string) {
  if (isPublicDemoReadOnly()) {
    return;
  }
  await requireUser();
  await db.delete(programResources).where(eq(programResources.id, linkId));
  revalidatePath(`/programs/${programId}`);
}

// ═════════════════════════════════════════════════════════════
// MVP実運用テスト用フィードバック（正式なプロダクト機能ではなく、
// 「使いやすかった/普通/使いにくかった」の簡易評価と自由記述を残すための暫定実装）
// ═════════════════════════════════════════════════════════════

export type ProgramFeedbackFormState =
  | { error?: string; values?: FormValues; success?: boolean }
  | undefined;

const programFeedbackSchema = z.object({
  easeRating: z.enum(EASE_RATINGS, { message: "評価を選択してください" }),
  ideationCounterfactual: z.enum(IDEATION_COUNTERFACTUALS, {
    message: "「思いつけたか」を選択してください",
  }),
  confusionPoints: z.string().trim().optional(),
  missingInfo: z.string().trim().optional(),
  unnecessaryInfo: z.string().trim().optional(),
});

export async function createProgramFeedbackAction(
  programId: string,
  _prevState: ProgramFeedbackFormState,
  formData: FormData
): Promise<ProgramFeedbackFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = programFeedbackSchema.safeParse({
    easeRating: formData.get("easeRating"),
    ideationCounterfactual: formData.get("ideationCounterfactual"),
    confusionPoints: formData.get("confusionPoints") ?? "",
    missingInfo: formData.get("missingInfo") ?? "",
    unnecessaryInfo: formData.get("unnecessaryInfo") ?? "",
  });
  if (!parsed.success) {
    return {
      error:
        "評価（使いやすかった／普通／使いにくかった）と、「思いつけたか」を選択してください。",
      values: captureFormValues(formData),
    };
  }
  const data = parsed.data;
  await db.insert(programFeedback).values({
    id: crypto.randomUUID(),
    programId,
    easeRating: data.easeRating,
    ideationCounterfactual: data.ideationCounterfactual,
    confusionPoints: data.confusionPoints || null,
    missingInfo: data.missingInfo || null,
    unnecessaryInfo: data.unnecessaryInfo || null,
    createdById: user.id,
  });
  revalidatePath(`/programs/${programId}`);
  return { success: true };
}
