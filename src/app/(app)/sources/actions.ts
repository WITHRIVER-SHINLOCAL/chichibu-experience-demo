"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { sources, SOURCE_TYPES, RELIABILITY_GRADES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

export type SourceFormState = { error?: string; values?: FormValues } | undefined;

const sourceSchema = z.object({
  sourceName: z.string().trim().min(1, "出典名は必須です"),
  sourceUrl: z.string().trim().optional(),
  organization: z.string().trim().optional(),
  sourceType: z.enum(SOURCE_TYPES),
  reliabilityGrade: z.enum(RELIABILITY_GRADES),
  publishedAt: z.string().trim().optional(),
  accessedAt: z.string().trim().min(1, "確認日は必須です"),
  notes: z.string().trim().optional(),
});

function parseFormData(formData: FormData) {
  return sourceSchema.safeParse({
    sourceName: formData.get("sourceName"),
    sourceUrl: formData.get("sourceUrl") ?? "",
    organization: formData.get("organization") ?? "",
    sourceType: formData.get("sourceType"),
    reliabilityGrade: formData.get("reliabilityGrade"),
    publishedAt: formData.get("publishedAt") ?? "",
    accessedAt: formData.get("accessedAt"),
    notes: formData.get("notes") ?? "",
  });
}

export async function createSourceAction(
  _prevState: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: "入力内容をご確認ください（確認日は必須です）。", values: captureFormValues(formData) };
  }
  const data = parsed.data;
  const id = crypto.randomUUID();

  await db.insert(sources).values({
    id,
    sourceName: data.sourceName,
    sourceUrl: data.sourceUrl || null,
    organization: data.organization || null,
    sourceType: data.sourceType,
    reliabilityGrade: data.reliabilityGrade,
    publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
    accessedAt: new Date(data.accessedAt),
    notes: data.notes || null,
    createdById: user.id,
  });

  revalidatePath("/sources");
  revalidatePath("/");
  redirect(`/sources/${id}`);
}

export async function updateSourceAction(
  id: string,
  _prevState: SourceFormState,
  formData: FormData
): Promise<SourceFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const parsed = parseFormData(formData);
  if (!parsed.success) {
    return { error: "入力内容をご確認ください（確認日は必須です）。", values: captureFormValues(formData) };
  }
  const data = parsed.data;

  await db
    .update(sources)
    .set({
      sourceName: data.sourceName,
      sourceUrl: data.sourceUrl || null,
      organization: data.organization || null,
      sourceType: data.sourceType,
      reliabilityGrade: data.reliabilityGrade,
      publishedAt: data.publishedAt ? new Date(data.publishedAt) : null,
      accessedAt: new Date(data.accessedAt),
      notes: data.notes || null,
    })
    .where(eq(sources.id, id));

  revalidatePath("/sources");
  revalidatePath(`/sources/${id}`);
  redirect(`/sources/${id}`);
}
