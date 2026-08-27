"use server";

import { revalidatePath } from "next/cache";
import { eq } from "drizzle-orm";
import { z } from "zod";
import { db } from "@/db";
import { itineraries, itineraryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { captureFormValues, type FormValues } from "@/lib/form-state";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

export type ItineraryItemFormState = { error?: string; values?: FormValues } | undefined;

const itemSchema = z.object({
  startTime: z.string().trim().min(1, "開始時刻は必須です"),
  endTime: z.string().trim().optional(),
  activity: z.string().trim().min(1, "内容は必須です"),
  resourceId: z.string().trim().optional(),
  staffNote: z.string().trim().optional(),
});

async function ensureItinerary(programId: string) {
  const [existing] = await db.select().from(itineraries).where(eq(itineraries.programId, programId)).limit(1);
  if (existing) return existing;
  const id = crypto.randomUUID();
  const [created] = await db.insert(itineraries).values({ id, programId }).returning();
  return created;
}

export async function addItineraryItemAction(
  programId: string,
  _prevState: ItineraryItemFormState,
  formData: FormData
): Promise<ItineraryItemFormState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  const parsed = itemSchema.safeParse({
    startTime: formData.get("startTime"),
    endTime: formData.get("endTime") ?? "",
    activity: formData.get("activity"),
    resourceId: formData.get("resourceId") ?? "",
    staffNote: formData.get("staffNote") ?? "",
  });
  if (!parsed.success) {
    return { error: "開始時刻と内容は必須です。", values: captureFormValues(formData) };
  }
  const data = parsed.data;
  const itinerary = await ensureItinerary(programId);

  const existingItems = await db
    .select()
    .from(itineraryItems)
    .where(eq(itineraryItems.itineraryId, itinerary.id));
  const nextSortOrder = existingItems.length;

  await db.insert(itineraryItems).values({
    id: crypto.randomUUID(),
    itineraryId: itinerary.id,
    sortOrder: nextSortOrder,
    startTime: data.startTime,
    endTime: data.endTime || null,
    activity: data.activity,
    resourceId: data.resourceId || null,
    staffNote: data.staffNote || null,
  });

  revalidatePath(`/programs/${programId}/itinerary`);
  revalidatePath(`/programs/${programId}`);
  return undefined;
}

export async function deleteItineraryItemAction(programId: string, itemId: string) {
  if (isPublicDemoReadOnly()) {
    return;
  }
  await requireUser();
  await db.delete(itineraryItems).where(eq(itineraryItems.id, itemId));
  revalidatePath(`/programs/${programId}/itinerary`);
  revalidatePath(`/programs/${programId}`);
}

export async function updateItineraryMetaAction(programId: string, formData: FormData) {
  if (isPublicDemoReadOnly()) {
    return;
  }
  await requireUser();
  const title = formData.get("title");
  const notes = formData.get("notes");
  const itinerary = await ensureItinerary(programId);
  await db
    .update(itineraries)
    .set({
      title: typeof title === "string" && title.trim() ? title.trim() : null,
      notes: typeof notes === "string" && notes.trim() ? notes.trim() : null,
      updatedAt: new Date(),
    })
    .where(eq(itineraries.id, itinerary.id));
  revalidatePath(`/programs/${programId}/itinerary`);
}
