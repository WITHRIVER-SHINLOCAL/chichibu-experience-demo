"use server";

import { revalidatePath } from "next/cache";
import { redirect, unstable_rethrow } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programAiReviews, programs, itineraries, itineraryItems } from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { buildAiReviewContext } from "@/lib/ai-review/context";
import { runDiagnosisStage, runImprovementIdeasStage, runProductDraftStage } from "@/lib/ai-review/pipeline";
import { AiNotConfiguredError, AiResponseValidationError } from "@/lib/ai-review/claude-client";
import { AiReviewGuardError, guardMissingResearchResolution } from "@/lib/ai-review/guards";
import { ADOPTABLE_DRAFT_SECTIONS, type AdoptableDraftSection, type MissingResearchItem } from "@/lib/ai-review/types";
import { getAiReviewById } from "./lib";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

export type AiReviewActionState = { error?: string } | undefined;

// AI呼び出し系のエラーを日本語の案内文に変換する（APIキー等の内部情報は含めない）。
function describeAiError(e: unknown): string {
  if (e instanceof AiNotConfiguredError) return e.message;
  if (e instanceof AiResponseValidationError) {
    console.error("[ai-review] validation error:", e.message);
    return "AIの応答が期待した形式ではなかったため、保存を中止しました。もう一度お試しください。";
  }
  if (e instanceof AiReviewGuardError) {
    console.error("[ai-review] guard violation:", e.violations);
    return "AIの応答が存在しない情報を参照していたため、保存を中止しました（ガードにより防止されました）。";
  }
  console.error("[ai-review] unexpected error:", e);
  return "予期しないエラーが発生しました。時間をおいて再度お試しください。";
}

// ── Stage 1: 診断 + 不足FACT + 市場比較（新しいレビュー行を作成） ──
export async function runDiagnosisAction(
  programId: string,
  _prevState: AiReviewActionState,
  _formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  try {
    const { context, catalog } = await buildAiReviewContext(programId);
    const { data, model } = await runDiagnosisStage(context, catalog);

    const missingResearch: MissingResearchItem[] = data.missing_research.map((item) => ({
      ...item,
      id: crypto.randomUUID(),
      resolved: false,
      resolved_at: null,
      resolved_by_id: null,
      resolved_note: null,
      resolved_reference_ids: [],
    }));

    const reviewId = crypto.randomUUID();
    await db.insert(programAiReviews).values({
      id: reviewId,
      programId,
      diagnosis: data.diagnosis,
      missingResearch,
      marketComparison: data.market_comparison,
      model,
      createdById: user.id,
    });

    revalidatePath(`/programs/${programId}/ai-review`);
    redirect(`/programs/${programId}/ai-review?reviewId=${reviewId}`);
  } catch (e) {
    unstable_rethrow(e);
    return { error: describeAiError(e) };
  }
}

// ── Stage 2: 改善アイデア ──
export async function runImprovementIdeasAction(
  programId: string,
  reviewId: string,
  _prevState: AiReviewActionState,
  _formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  try {
    const review = await getAiReviewById(reviewId);
    if (!review || !review.diagnosis || !review.missingResearch || !review.marketComparison) {
      return { error: "先に商品診断を実行してください。" };
    }
    const { context, catalog } = await buildAiReviewContext(programId);
    const { data, model } = await runImprovementIdeasStage(context, catalog, {
      diagnosis: review.diagnosis,
      missing_research: review.missingResearch,
      market_comparison: review.marketComparison,
    });

    const improvementIdeas = data.map((idea) => ({ ...idea, id: crypto.randomUUID() }));

    await db
      .update(programAiReviews)
      .set({ improvementIdeas, model, updatedAt: new Date() })
      .where(eq(programAiReviews.id, reviewId));

    revalidatePath(`/programs/${programId}/ai-review`);
    redirect(`/programs/${programId}/ai-review?reviewId=${reviewId}`);
  } catch (e) {
    unstable_rethrow(e);
    return { error: describeAiError(e) };
  }
}

// ── 人間による選択・承認（AI呼び出しなし） ──
export async function approveIdeasAction(
  programId: string,
  reviewId: string,
  _prevState: AiReviewActionState,
  formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  const selectedIds = formData.getAll("ideaIds").map(String);

  await db
    .update(programAiReviews)
    .set({
      approvedIdeaIds: selectedIds,
      approvedAt: new Date(),
      approvedById: user.id,
      updatedAt: new Date(),
    })
    .where(eq(programAiReviews.id, reviewId));

  revalidatePath(`/programs/${programId}/ai-review`);
  redirect(`/programs/${programId}/ai-review?reviewId=${reviewId}`);
}

// ── Stage 3: Product Draft（承認後のみ実行可） ──
export async function runProductDraftAction(
  programId: string,
  reviewId: string,
  _prevState: AiReviewActionState,
  _formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();
  try {
    const review = await getAiReviewById(reviewId);
    if (!review || !review.approvedAt) {
      return { error: "先に改善アイデアの選択・承認を行ってください。" };
    }
    const approvedIdeas = (review.improvementIdeas ?? [])
      .filter((idea) => review.approvedIdeaIds.includes(idea.id))
      .map((idea) => ({ id: idea.id, raw: idea }));
    const unresolvedMissingResearch = (review.missingResearch ?? []).filter((i) => !i.resolved);

    const { context } = await buildAiReviewContext(programId);
    const { data, model } = await runProductDraftStage(context, approvedIdeas, unresolvedMissingResearch);

    await db
      .update(programAiReviews)
      .set({ productDraft: data, model, updatedAt: new Date() })
      .where(eq(programAiReviews.id, reviewId));

    revalidatePath(`/programs/${programId}/ai-review`);
    redirect(`/programs/${programId}/ai-review?reviewId=${reviewId}`);
  } catch (e) {
    unstable_rethrow(e);
    return { error: describeAiError(e) };
  }
}

// ── 不足FACTの解決記録（AI呼び出しなし。何のFACT/SOURCEで解決したかを残す） ──
export async function resolveMissingResearchAction(
  programId: string,
  reviewId: string,
  itemId: string,
  _prevState: AiReviewActionState,
  formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  try {
    const review = await getAiReviewById(reviewId);
    if (!review || !review.missingResearch) return { error: "レビューが見つかりません。" };

    const note = String(formData.get("resolvedNote") ?? "").trim();
    const referenceIds = formData.getAll("resolvedReferenceIds").map(String).filter(Boolean);
    if (!note && referenceIds.length === 0) {
      return { error: "解決根拠（参照するFACT、または解決メモ）を1つ以上指定してください。" };
    }

    const { catalog } = await buildAiReviewContext(programId);
    guardMissingResearchResolution(referenceIds, catalog.validReferenceIds);

    const updated = review.missingResearch.map((item) =>
      item.id === itemId
        ? {
            ...item,
            resolved: true,
            resolved_at: new Date().toISOString(),
            resolved_by_id: user.id,
            resolved_note: note || null,
            resolved_reference_ids: referenceIds,
          }
        : item
    );

    await db
      .update(programAiReviews)
      .set({ missingResearch: updated, updatedAt: new Date() })
      .where(eq(programAiReviews.id, reviewId));

    revalidatePath(`/programs/${programId}/ai-review`);
    redirect(`/programs/${programId}/ai-review?reviewId=${reviewId}`);
  } catch (e) {
    unstable_rethrow(e);
    return { error: describeAiError(e) };
  }
}

// ── Product Draftの採用（人間が編集した内容をPROGRAM本体へ書き込む） ──
// 重要: program_ai_reviews.product_draft自体は一切変更しない（構造化データを失わない）。
// ここではprograms/itinerariesという既存のFACTテーブルへ、人間が確認・編集した文章のみを書き込む。
export async function adoptDraftSectionsAction(
  programId: string,
  reviewId: string,
  _prevState: AiReviewActionState,
  formData: FormData
): Promise<AiReviewActionState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  const user = await requireUser();
  try {
    const review = await getAiReviewById(reviewId);
    if (!review || !review.productDraft) return { error: "Product Draftが見つかりません。" };

    const checked = new Set(
      formData.getAll("sections").map(String).filter((s): s is AdoptableDraftSection =>
        (ADOPTABLE_DRAFT_SECTIONS as readonly string[]).includes(s)
      )
    );
    if (checked.size === 0) {
      return { error: "採用するセクションを1つ以上選択してください。" };
    }

    const programUpdates: Record<string, string> = {};
    if (checked.has("overview_appeal_learning")) {
      programUpdates.experienceContent = String(formData.get("text_overview_appeal_learning") ?? "").trim();
    }
    if (checked.has("parent_value_price")) {
      programUpdates.marketNeeds = String(formData.get("text_parent_value_price") ?? "").trim();
    }
    if (checked.has("regional_reasoning")) {
      programUpdates.whyChichibu = String(formData.get("text_regional_reasoning") ?? "").trim();
    }

    if (Object.keys(programUpdates).length > 0) {
      await db
        .update(programs)
        .set({ ...programUpdates, updatedAt: new Date() })
        .where(eq(programs.id, programId));
    }

    if (checked.has("flow")) {
      const times = formData.getAll("flow_time").map(String);
      const activities = formData.getAll("flow_activity").map(String);

      let [itinerary] = await db.select().from(itineraries).where(eq(itineraries.programId, programId)).limit(1);
      if (!itinerary) {
        const id = crypto.randomUUID();
        await db.insert(itineraries).values({ id, programId, title: null, notes: null });
        [itinerary] = await db.select().from(itineraries).where(eq(itineraries.id, id)).limit(1);
      }

      await db.delete(itineraryItems).where(eq(itineraryItems.itineraryId, itinerary.id));
      const rows = times
        .map((time, i) => ({ time: time.trim(), activity: (activities[i] ?? "").trim() }))
        .filter((r) => r.time && r.activity);
      if (rows.length > 0) {
        await db.insert(itineraryItems).values(
          rows.map((r, i) => ({
            id: crypto.randomUUID(),
            itineraryId: itinerary.id,
            sortOrder: i,
            startTime: r.time,
            activity: r.activity,
          }))
        );
      }
    }

    const adoptedSections = Array.from(new Set([...review.adoptedSections, ...checked]));
    await db
      .update(programAiReviews)
      .set({ adoptedSections, adoptedAt: new Date(), adoptedById: user.id, updatedAt: new Date() })
      .where(eq(programAiReviews.id, reviewId));

    revalidatePath(`/programs/${programId}`);
    revalidatePath(`/programs/${programId}/ai-review`);
    revalidatePath(`/programs/${programId}/itinerary`);
    redirect(`/programs/${programId}`);
  } catch (e) {
    unstable_rethrow(e);
    return { error: describeAiError(e) };
  }
}
