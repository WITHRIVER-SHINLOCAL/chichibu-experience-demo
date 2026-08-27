"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import {
  resources,
  resourceNotes,
  resourceSources,
  RESOURCE_CATEGORIES,
  FACT_STATUSES,
  SEASONS,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

const RESOURCE_ARRAY_FIELDS = ["seasons"];

export type ResourceFormState = { error?: string; values?: FormValues } | undefined;

function splitCsv(v: FormDataEntryValue | null) {
  if (!v || typeof v !== "string") return [];
  return v
    .split(/[、,]/)
    .map((s) => s.trim())
    .filter(Boolean);
}

const resourceSchema = z.object({
  regionId: z.string().trim().min(1, "地域は必須です"),
  category: z.enum(RESOURCE_CATEGORIES),
  name: z.string().trim().min(1, "資源名は必須です"),
  summary: z.string().trim().optional(),
  background: z.string().trim().optional(),
  history: z.string().trim().optional(),
  targetAge: z.string().trim().optional(),
  educationTheme: z.string().trim().optional(),
  experiencePotentialNote: z.string().trim().optional(),
  ownerManager: z.string().trim().optional(),
  collaborators: z.string().trim().optional(),
  url: z.string().trim().optional(),
  lat: z.string().trim().optional(),
  lng: z.string().trim().optional(),
  safetyNotes: z.string().trim().optional(),
  rainPolicy: z.string().trim().optional(),
  priceInfo: z.string().trim().optional(),
  memo: z.string().trim().optional(),
  factStatus: z.enum(FACT_STATUSES),
  confidence: z.string().trim().optional(),
});

function parseFormData(formData: FormData) {
  const parsed = resourceSchema.safeParse({
    regionId: formData.get("regionId"),
    category: formData.get("category"),
    name: formData.get("name"),
    summary: formData.get("summary") ?? "",
    background: formData.get("background") ?? "",
    history: formData.get("history") ?? "",
    targetAge: formData.get("targetAge") ?? "",
    educationTheme: formData.get("educationTheme") ?? "",
    experiencePotentialNote: formData.get("experiencePotentialNote") ?? "",
    ownerManager: formData.get("ownerManager") ?? "",
    collaborators: formData.get("collaborators") ?? "",
    url: formData.get("url") ?? "",
    lat: formData.get("lat") ?? "",
    lng: formData.get("lng") ?? "",
    safetyNotes: formData.get("safetyNotes") ?? "",
    rainPolicy: formData.get("rainPolicy") ?? "",
    priceInfo: formData.get("priceInfo") ?? "",
    memo: formData.get("memo") ?? "",
    factStatus: formData.get("factStatus"),
    confidence: formData.get("confidence") ?? "",
  });
  const seasons = SEASONS.filter((s) => formData.getAll("seasons").includes(s));
  const tags = splitCsv(formData.get("tags"));
  return { parsed, seasons, tags };
}

export async function createResourceAction(
  _prevState: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const { parsed, seasons, tags } = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（資源名・地域・カテゴリーは必須です）。",
      values: captureFormValues(formData, RESOURCE_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.insert(resources).values({
    id,
    regionId: data.regionId,
    category: data.category,
    name: data.name,
    summary: data.summary || "",
    background: data.background || null,
    history: data.history || null,
    seasons,
    targetAge: data.targetAge || null,
    educationTheme: data.educationTheme || null,
    experiencePotentialNote: data.experiencePotentialNote || null,
    ownerManager: data.ownerManager || null,
    collaborators: data.collaborators || null,
    url: data.url || null,
    lat: data.lat ? Number(data.lat) : null,
    lng: data.lng ? Number(data.lng) : null,
    safetyNotes: data.safetyNotes || null,
    rainPolicy: data.rainPolicy || null,
    priceInfo: data.priceInfo || null,
    tags,
    memo: data.memo || null,
    factStatus: data.factStatus,
    confidence: data.confidence ? Number(data.confidence) : null,
    createdById: user.id,
  });

  revalidatePath("/resources");
  revalidatePath("/");
  redirect(`/resources/${id}`);
}

export async function updateResourceAction(
  id: string,
  _prevState: ResourceFormState,
  formData: FormData
): Promise<ResourceFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const { parsed, seasons, tags } = parseFormData(formData);
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（資源名・地域・カテゴリーは必須です）。",
      values: captureFormValues(formData, RESOURCE_ARRAY_FIELDS),
    };
  }
  const data = parsed.data;

  await db
    .update(resources)
    .set({
      regionId: data.regionId,
      category: data.category,
      name: data.name,
      summary: data.summary || "",
      background: data.background || null,
      history: data.history || null,
      seasons,
      targetAge: data.targetAge || null,
      educationTheme: data.educationTheme || null,
      experiencePotentialNote: data.experiencePotentialNote || null,
      ownerManager: data.ownerManager || null,
      collaborators: data.collaborators || null,
      url: data.url || null,
      lat: data.lat ? Number(data.lat) : null,
      lng: data.lng ? Number(data.lng) : null,
      safetyNotes: data.safetyNotes || null,
      rainPolicy: data.rainPolicy || null,
      priceInfo: data.priceInfo || null,
      tags,
      memo: data.memo || null,
      factStatus: data.factStatus,
      confidence: data.confidence ? Number(data.confidence) : null,
      updatedAt: new Date(),
    })
    .where(eq(resources.id, id));

  revalidatePath("/resources");
  revalidatePath(`/resources/${id}`);
  redirect(`/resources/${id}`);
}

// ─────────────────────────────────────────────
// RESOURCE_NOTE（考察・補足情報の積み上げ）
// ─────────────────────────────────────────────

const noteSchema = z.object({
  body: z.string().trim().min(1, "内容は必須です"),
  factStatus: z.enum(FACT_STATUSES),
  sourceId: z.string().trim().optional(),
  confidence: z.string().trim().optional(),
});

export type NoteFormState = { error?: string; values?: FormValues } | undefined;

export async function addResourceNoteAction(
  resourceId: string,
  _prevState: NoteFormState,
  formData: FormData
): Promise<NoteFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = noteSchema.safeParse({
    body: formData.get("body"),
    factStatus: formData.get("factStatus"),
    sourceId: formData.get("sourceId") ?? "",
    confidence: formData.get("confidence") ?? "",
  });
  if (!parsed.success) {
    return { error: "内容を入力してください。", values: captureFormValues(formData) };
  }
  const data = parsed.data;

  await db.insert(resourceNotes).values({
    id: crypto.randomUUID(),
    resourceId,
    factStatus: data.factStatus,
    body: data.body,
    sourceId: data.sourceId || null,
    confidence: data.confidence ? Number(data.confidence) : null,
    createdBy: user.id,
    humanApproved: true,
  });

  revalidatePath(`/resources/${resourceId}`);
  return undefined;
}

// ─────────────────────────────────────────────
// RESOURCE ⇄ SOURCE 紐付け
// ─────────────────────────────────────────────

export type LinkSourceFormState = { error?: string; values?: FormValues } | undefined;

export async function linkResourceSourceAction(
  resourceId: string,
  _prevState: LinkSourceFormState,
  formData: FormData
): Promise<LinkSourceFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const sourceId = formData.get("sourceId");
  const note = formData.get("note");
  if (!sourceId || typeof sourceId !== "string") {
    return { error: "出典を選択してください。", values: captureFormValues(formData) };
  }

  await db
    .insert(resourceSources)
    .values({
      id: crypto.randomUUID(),
      resourceId,
      sourceId,
      note: typeof note === "string" && note.trim() ? note.trim() : null,
    })
    .onConflictDoNothing();

  revalidatePath(`/resources/${resourceId}`);
  return undefined;
}
