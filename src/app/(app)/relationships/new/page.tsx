import { db } from "@/db";
import { resources, sources } from "@/db/schema";
import { RelationshipForm } from "../RelationshipForm";

export default async function NewRelationshipPage({
  searchParams,
}: {
  searchParams: Promise<{ fromResourceId?: string }>;
}) {
  const params = await searchParams;
  const [resourceList, sourceList] = await Promise.all([
    db.select({ id: resources.id, name: resources.name }).from(resources).orderBy(resources.name),
    db.select({ id: sources.id, sourceName: sources.sourceName }).from(sources).orderBy(sources.sourceName),
  ]);

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">関係性を登録</h1>
        <p className="mt-1 text-sm text-stone-500">
          地域資源同士のつながりを「資源A → 資源B」の有向グラフとして記録します（例：武甲山 →
          石灰岩、地質的）。
        </p>
      </div>
      <div className="card p-6">
        {resourceList.length < 2 ? (
          <p className="text-sm text-stone-500">
            関係性を登録するには、地域資源が2件以上必要です。先に「地域資源DB」から資源を登録してください。
          </p>
        ) : (
          <RelationshipForm
            resources={resourceList}
            sources={sourceList}
            defaultFromResourceId={params.fromResourceId}
          />
        )}
      </div>
    </div>
  );
}
