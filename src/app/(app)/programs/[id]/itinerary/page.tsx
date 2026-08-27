import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, itineraries, itineraryItems, resources } from "@/db/schema";
import { ItineraryItemForm } from "./ItineraryItemForm";
import { deleteItineraryItemAction, updateItineraryMetaAction } from "./actions";

export default async function ItineraryPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [program] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!program) notFound();

  const [itinerary] = await db.select().from(itineraries).where(eq(itineraries.programId, id)).limit(1);
  const items = itinerary
    ? await db
        .select({ item: itineraryItems, resourceName: resources.name })
        .from(itineraryItems)
        .leftJoin(resources, eq(itineraryItems.resourceId, resources.id))
        .where(eq(itineraryItems.itineraryId, itinerary.id))
        .orderBy(itineraryItems.sortOrder)
    : [];

  const resourceList = await db.select({ id: resources.id, name: resources.name }).from(resources).orderBy(resources.name);
  const deleteItem = deleteItineraryItemAction.bind(null, id);
  const updateMeta = updateItineraryMetaAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap no-print">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">行程表</h1>
          <p className="mt-1 text-sm text-stone-500">{program.title}</p>
        </div>
        <div className="flex gap-2">
          <Link href={`/programs/${id}/itinerary/print`} className="btn btn-secondary" target="_blank">
            印刷用ページ
          </Link>
          <Link href={`/programs/${id}`} className="btn btn-secondary">
            企画詳細へ戻る
          </Link>
        </div>
      </div>

      <form action={updateMeta} className="card p-4 space-y-3 no-print">
        <div>
          <label className="label">行程表タイトル</label>
          <input name="title" defaultValue={itinerary?.title ?? ""} className="input" placeholder={`${program.title} 行程表`} />
        </div>
        <div>
          <label className="label">全体メモ（持ち物・注意事項等）</label>
          <textarea name="notes" rows={2} defaultValue={itinerary?.notes ?? ""} className="input" />
        </div>
        <button type="submit" className="btn btn-secondary text-xs">
          メモを保存
        </button>
      </form>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">{itinerary?.title || `${program.title} 行程表`}</h2>
          {itinerary?.notes && <p className="mt-1 text-xs text-stone-500 whitespace-pre-wrap">{itinerary.notes}</p>}
        </div>
        <ul className="divide-y divide-stone-100">
          {items.length === 0 && (
            <li className="px-5 py-8 text-center text-sm text-stone-400">まだ行程がありません。下のフォームから追加してください。</li>
          )}
          {items.map(({ item, resourceName }) => (
            <li key={item.id} className="flex items-start justify-between gap-3 px-5 py-3">
              <div className="min-w-0">
                <p className="text-sm font-medium text-stone-900">
                  {item.startTime}
                  {item.endTime && `〜${item.endTime}`} 　{item.activity}
                </p>
                {resourceName && <p className="text-xs text-stone-500">関連資源: {resourceName}</p>}
                {item.staffNote && <p className="text-xs text-stone-400">{item.staffNote}</p>}
              </div>
              <form action={deleteItem.bind(null, item.id)} className="no-print">
                <button type="submit" className="text-xs text-red-600 hover:underline shrink-0">
                  削除
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="no-print">
        <ItineraryItemForm programId={id} resources={resourceList} />
      </div>
    </div>
  );
}
