"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  activityOpportunities,
  FACT_STATUSES,
  PERMISSION_STATUSES,
  SEASONS,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

const ACTIVITY_OPPORTUNITY_ARRAY_FIELDS = ["seasons"];

export type ActivityOpportunityFormState = { error?: string; values?: FormValues } | undefined;

function splitCsv(v: FormDataEntryValue | null) {
  if (!v || typeof v !== "string") return [];
  return v
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

function parseBoolSelect(v: FormDataEntryValue | null): boolean | null {
  if (v === "true") return true;
  if (v === "false") return false;
  return null;
}

const activityOpportunitySchema = z.object({
  primaryResourceId: z.string().trim().min(1, "対象資源は必須です"),
  title: z.string().trim().min(1, "名称は必須です"),
  description: z.string().trim().optional(),
  requiredGroupSizeMin: z.string().trim().optional(),
  requiredGroupSizeMax: z.string().trim().optional(),
  appropriateAgeMin: z.string().trim().optional(),
  appropriateAgeMax: z.string().trim().optional(),
  durationMinutesMin: z.string().trim().optional(),
  durationMinutesMax: z.string().trim().optional(),
  permissionRequiredFrom: z.string().trim().optional(),
  permissionStatus: z.string().trim().optional(),
  safetyRisks: z.string().trim().optional(),
  rainPolicy: z.string().trim().optional(),
  collaboratorsNote: z.string().trim().optional(),
  accessNotes: z.string().trim().optional(),
  factStatus: z.enum(FACT_STATUSES),
  confidence: z.string().trim().optional(),
  sourceId: z.string().trim().optional(),
});

function parseFormData(formData: FormData) {
  const parsed = activityOpportunitySchema.safeParse({
    primaryResourceId: formData.get("primaryResourceId"),
    title: formData.get("title"),
    description: formData.get("description") ?? "",
    requiredGroupSizeMin: formData.get("requiredGroupSizeMin") ?? "",
    requiredGroupSizeMax: formData.get("requiredGroupSizeMax") ?? "",
    appropriateAgeMin: formData.get("appropriateAgeMin") ?? "",
    appropriateAgeMax: formData.get("appropriateAgeMax") ?? "",
    durationMinutesMin: formData.get("durationMinutesMin") ?? "",
    durationMinutesMax: formData.get("durationMinutesMax") ?? "",
    permissionRequiredFrom: formData.get("permissionRequiredFrom") ?? "",
    permissionStatus: formData.get("permissionStatus") ?? "",
    safetyRisks: formData.get("safetyRisks") ?? "",
    rainPolicy: formData.get("rainPolicy") ?? "",
    collaboratorsNote: formData.get("collaboratorsNote") ?? "",
    accessNotes: formData.get("accessNotes") ?? "",
    factStatus: formData.get("factStatus"),
    confidence: formData.get("confidence") ?? "",
    sourceId: formData.get("sourceId") ?? "",
  });
  const seasons = SEASONS.filter((s) => formData.getAll("seasons").includes(s));
  const requiredEquipment = splitCsv(formData.get("requiredEquipment"));
  const tags = splitCsv(formData.get("tags"));
  const permissionRequired = parseBoolSelect(formData.get("permissionRequired"));
  const needsGuide = parseBoolSelect(formData.get("needsGuide"));
  return { parsed, seasons, requiredEquipment, tags, permissionRequired, needsGuide };
}

/**
 * 「できそう」という推測をFACTとして扱わないためのガード（実装時の追加配慮 #1）。
 * FACTにするには、出典が紐付いているか、既に現地確認済み（field_checked_at）である必要がある。
 */
function validateFactStatus(
  factStatus: (typeof FACT_STATUSES)[number],
  hasSource: boolean,
  isFieldChecked: boolean
): string | null {
  if (factStatus === "FACT" && !hasSource && !isFieldChecked) {
    return "FACTにするには、出典を紐付けるか、先に「現地確認済みにする」を実行してください。現地確認・出典確認がない場合はINFERENCEまたはIDEAを選択してください。";
  }
  return null;
}

export async function createActivityOpportunityAction(
  _prevState: ActivityOpportunityFormState,
  formData: FormData
): Promise<ActivityOpportunityFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const { parsed, seasons, requiredEquipment, tags, permissionRequired, needsGuide } =
    parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（名称・対象資源は必須です）。",
      values: captureFormValues(formData, ACTIVITY_OPPORTUNITY_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;

  const factError = validateFactStatus(data.factStatus, Boolean(data.sourceId), false);
  if (factError)
    return { error: factError, values: captureFormValues(formData, ACTIVITY_OPPORTUNITY_ARRAY_FIELDS) };

  const id = crypto.randomUUID();

  await db.insert(activityOpportunities).values({
    id,
    primaryResourceId: data.primaryResourceId,
    title: data.title,
    description: data.description || null,
    requiredGroupSizeMin: data.requiredGroupSizeMin ? Number(data.requiredGroupSizeMin) : null,
    requiredGroupSizeMax: data.requiredGroupSizeMax ? Number(data.requiredGroupSizeMax) : null,
    appropriateAgeMin: data.appropriateAgeMin ? Number(data.appropriateAgeMin) : null,
    appropriateAgeMax: data.appropriateAgeMax ? Number(data.appropriateAgeMax) : null,
    durationMinutesMin: data.durationMinutesMin ? Number(data.durationMinutesMin) : null,
    durationMinutesMax: data.durationMinutesMax ? Number(data.durationMinutesMax) : null,
    requiredEquipment,
    permissionRequired,
    permissionRequiredFrom: data.permissionRequiredFrom || null,
    permissionStatus: data.permissionStatus
      ? (data.permissionStatus as (typeof PERMISSION_STATUSES)[number])
      : null,
    safetyRisks: data.safetyRisks || null,
    seasons,
    rainPolicy: data.rainPolicy || null,
    needsGuide,
    collaboratorsNote: data.collaboratorsNote || null,
    accessNotes: data.accessNotes || null,
    tags,
    factStatus: data.factStatus,
    confidence: data.confidence ? Number(data.confidence) : null,
    sourceId: data.sourceId || null,
    createdBy: user.id,
    humanApproved: true,
  });

  revalidatePath("/activity-opportunities");
  revalidatePath(`/resources/${data.primaryResourceId}`);
  revalidatePath("/");
  redirect(`/activity-opportunities/${id}`);
}

export async function updateActivityOpportunityAction(
  id: string,
  _prevState: ActivityOpportunityFormState,
  formData: FormData
): Promise<ActivityOpportunityFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const { parsed, seasons, requiredEquipment, tags, permissionRequired, needsGuide } =
    parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（名称・対象資源は必須です）。",
      values: captureFormValues(formData, ACTIVITY_OPPORTUNITY_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;

  const [existing] = await db
    .select()
    .from(activityOpportunities)
    .where(eq(activityOpportunities.id, id))
    .limit(1);
  if (!existing) return { error: "対象の体験機会が見つかりませんでした。" };

  const hasSource = Boolean(data.sourceId || existing.sourceId);
  const isFieldChecked = Boolean(existing.fieldCheckedAt);
  const factError = validateFactStatus(data.factStatus, hasSource, isFieldChecked);
  if (factError)
    return { error: factError, values: captureFormValues(formData, ACTIVITY_OPPORTUNITY_ARRAY_FIELDS) };

  await db
    .update(activityOpportunities)
    .set({
      primaryResourceId: data.primaryResourceId,
      title: data.title,
      description: data.description || null,
      requiredGroupSizeMin: data.requiredGroupSizeMin ? Number(data.requiredGroupSizeMin) : null,
      requiredGroupSizeMax: data.requiredGroupSizeMax ? Number(data.requiredGroupSizeMax) : null,
      appropriateAgeMin: data.appropriateAgeMin ? Number(data.appropriateAgeMin) : null,
      appropriateAgeMax: data.appropriateAgeMax ? Number(data.appropriateAgeMax) : null,
      durationMinutesMin: data.durationMinutesMin ? Number(data.durationMinutesMin) : null,
      durationMinutesMax: data.durationMinutesMax ? Number(data.durationMinutesMax) : null,
      requiredEquipment,
      permissionRequired,
      permissionRequiredFrom: data.permissionRequiredFrom || null,
      permissionStatus: data.permissionStatus
        ? (data.permissionStatus as (typeof PERMISSION_STATUSES)[number])
        : null,
      safetyRisks: data.safetyRisks || null,
      seasons,
      rainPolicy: data.rainPolicy || null,
      needsGuide,
      collaboratorsNote: data.collaboratorsNote || null,
      accessNotes: data.accessNotes || null,
      tags,
      factStatus: data.factStatus,
      confidence: data.confidence ? Number(data.confidence) : null,
      sourceId: data.sourceId || null,
      updatedAt: new Date(),
    })
    .where(eq(activityOpportunities.id, id));

  revalidatePath("/activity-opportunities");
  revalidatePath(`/activity-opportunities/${id}`);
  revalidatePath(`/resources/${data.primaryResourceId}`);
  redirect(`/activity-opportunities/${id}`);
}

export async function markFieldCheckedAction(id: string) {
  if (isPublicDemoReadOnly()) {
    return;
  }
  const user = await requireUser();
  await db
    .update(activityOpportunities)
    .set({ fieldCheckedAt: new Date(), fieldCheckedById: user.id, updatedAt: new Date() })
    .where(eq(activityOpportunities.id, id));
  revalidatePath(`/activity-opportunities/${id}`);
}
