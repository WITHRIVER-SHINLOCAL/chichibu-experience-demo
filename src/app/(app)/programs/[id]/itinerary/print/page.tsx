import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, itineraries, itineraryItems, resources } from "@/db/schema";

export default async function ItineraryPrintPage({
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

  return (
    <div className="max-w-2xl mx-auto p-8 space-y-6 bg-white text-stone-900">
      <div>
        <h1 className="text-xl font-bold">{itinerary?.title || `${program.title} 行程表`}</h1>
        {itinerary?.notes && <p className="mt-2 text-sm whitespace-pre-wrap">{itinerary.notes}</p>}
      </div>
      <table className="w-full text-sm border-collapse">
        <thead>
          <tr className="border-b-2 border-stone-800 text-left">
            <th className="py-2 pr-4 w-32">時刻</th>
            <th className="py-2 pr-4">内容</th>
            <th className="py-2">メモ</th>
          </tr>
        </thead>
        <tbody>
          {items.map(({ item, resourceName }) => (
            <tr key={item.id} className="border-b border-stone-200">
              <td className="py-2 pr-4 align-top">
                {item.startTime}
                {item.endTime && `〜${item.endTime}`}
              </td>
              <td className="py-2 pr-4 align-top">
                {item.activity}
                {resourceName && <div className="text-xs text-stone-500">（{resourceName}）</div>}
              </td>
              <td className="py-2 align-top text-xs text-stone-500">{item.staffNote}</td>
            </tr>
          ))}
        </tbody>
      </table>
    </div>
  );
}
