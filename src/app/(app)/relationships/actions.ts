"use server";

import { redirect } from "next/navigation";
import { revalidatePath } from "next/cache";
import { z } from "zod";
import { db } from "@/db";
import { resourceRelationships, RELATIONSHIP_CATEGORIES, FACT_STATUSES } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

export type RelationshipFormState = { error?: string; values?: FormValues } | undefined;

const relationshipSchema = z.object({
  fromResourceId: z.string().trim().min(1, "資源Aは必須です"),
  toResourceId: z.string().trim().min(1, "資源Bは必須です"),
  relationshipCategory: z.enum(RELATIONSHIP_CATEGORIES),
  relationshipLabel: z.string().trim().min(1, "関係性のラベルは必須です"),
  description: z.string().trim().optional(),
  factStatus: z.enum(FACT_STATUSES),
  sourceId: z.string().trim().optional(),
  confidence: z.string().trim().optional(),
});

export async function createRelationshipAction(
  _prevState: RelationshipFormState,
  formData: FormData
): Promise<RelationshipFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const parsed = relationshipSchema.safeParse({
    fromResourceId: formData.get("fromResourceId"),
    toResourceId: formData.get("toResourceId"),
    relationshipCategory: formData.get("relationshipCategory"),
    relationshipLabel: formData.get("relationshipLabel"),
    description: formData.get("description") ?? "",
    factStatus: formData.get("factStatus"),
    sourceId: formData.get("sourceId") ?? "",
    confidence: formData.get("confidence") ?? "",
  });
  if (!parsed.success) {
    return {
      error: "入力内容をご確認ください（資源A・資源B・関係性ラベルは必須です）。",
      values: captureFormValues(formData),
    };
  }
  const data = parsed.data;

  if (data.fromResourceId === data.toResourceId) {
    return {
      error: "資源Aと資源Bは異なる資源を選択してください。",
      values: captureFormValues(formData),
    };
  }

  await db.insert(resourceRelationships).values({
    id: crypto.randomUUID(),
    fromResourceId: data.fromResourceId,
    toResourceId: data.toResourceId,
    relationshipCategory: data.relationshipCategory,
    relationshipLabel: data.relationshipLabel,
    description: data.description || null,
    factStatus: data.factStatus,
    sourceId: data.sourceId || null,
    confidence: data.confidence ? Number(data.confidence) : null,
    createdBy: user.id,
    humanApproved: true,
  });

  revalidatePath("/relationships");
  revalidatePath(`/resources/${data.fromResourceId}`);
  revalidatePath(`/resources/${data.toResourceId}`);
  redirect("/relationships");
}
