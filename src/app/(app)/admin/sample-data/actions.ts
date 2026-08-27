"use server";

// MVP実運用テスト用: サンプルデータ（is_sample=true）の一括削除。
// 正式なプロダクト機能ではなく、実データ移行時にシードデータを整理するための
// 暫定ツール。外部キーの参照順序に注意しながら削除する。

import { revalidatePath } from "next/cache";
import { eq, inArray } from "drizzle-orm";
import { db } from "@/db";
import {
  sources,
  resources,
  resourceRelationships,
  activityOpportunities,
  marketPrograms,
  resourceNotes,
  photos,
  marketProgramPrices,
} from "@/db/schema";
import { requireUser } from "@/lib/auth";
import { isPublicDemoReadOnly, READ_ONLY_DEMO_MESSAGE } from "@/lib/read-only-guard";

export type DeleteSampleDataState = { done?: boolean; error?: string; summary?: string } | undefined;

export async function deleteAllSampleDataAction(
  _prev: DeleteSampleDataState,
  formData: FormData
): Promise<DeleteSampleDataState> {
  if (isPublicDemoReadOnly()) {
    return { error: READ_ONLY_DEMO_MESSAGE };
  }
  await requireUser();

  const confirmText = String(formData.get("confirmText") ?? "");
  if (confirmText !== "サンプルデータを削除する") {
    return { error: "確認テキストが一致しません。「サンプルデータを削除する」と正確に入力してください。" };
  }

  const result = await db.transaction(async (tx) => {
    const sampleSources = await tx.select({ id: sources.id }).from(sources).where(eq(sources.isSample, true));
    const sampleSourceIds = sampleSources.map((s) => s.id);

    // サンプル出典への参照を先にnullにしておく（sourceIdはCASCADEではないため、
    // 実データが誤ってサンプル出典を参照していた場合の削除失敗を防ぐ）
    if (sampleSourceIds.length > 0) {
      await tx.update(resourceNotes).set({ sourceId: null }).where(inArray(resourceNotes.sourceId, sampleSourceIds));
      await tx
        .update(resourceRelationships)
        .set({ sourceId: null })
        .where(inArray(resourceRelationships.sourceId, sampleSourceIds));
      await tx
        .update(activityOpportunities)
        .set({ sourceId: null })
        .where(inArray(activityOpportunities.sourceId, sampleSourceIds));
      await tx.update(marketPrograms).set({ sourceId: null }).where(inArray(marketPrograms.sourceId, sampleSourceIds));
      await tx
        .update(marketProgramPrices)
        .set({ sourceId: null })
        .where(inArray(marketProgramPrices.sourceId, sampleSourceIds));
      await tx.update(photos).set({ sourceId: null }).where(inArray(photos.sourceId, sampleSourceIds));
    }

    const delRelationships = await tx
      .delete(resourceRelationships)
      .where(eq(resourceRelationships.isSample, true))
      .returning({ id: resourceRelationships.id });
    const delOpportunities = await tx
      .delete(activityOpportunities)
      .where(eq(activityOpportunities.isSample, true))
      .returning({ id: activityOpportunities.id });
    const delResources = await tx
      .delete(resources)
      .where(eq(resources.isSample, true))
      .returning({ id: resources.id });
    const delMarketPrograms = await tx
      .delete(marketPrograms)
      .where(eq(marketPrograms.isSample, true))
      .returning({ id: marketPrograms.id });
    const delSources =
      sampleSourceIds.length > 0
        ? await tx.delete(sources).where(inArray(sources.id, sampleSourceIds)).returning({ id: sources.id })
        : [];

    return {
      resources: delResources.length,
      sources: delSources.length,
      relationships: delRelationships.length,
      opportunities: delOpportunities.length,
      marketPrograms: delMarketPrograms.length,
    };
  });

  revalidatePath("/", "layout");

  return {
    done: true,
    summary: `地域資源${result.resources}件・出典${result.sources}件・関係性${result.relationships}件・体験機会${result.opportunities}件・市場プログラム${result.marketPrograms}件を削除しました。`,
  };
}
