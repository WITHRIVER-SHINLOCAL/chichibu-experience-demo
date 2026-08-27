import { db } from "@/db";
import { resources, sources } from "@/db/schema";
import { ActivityOpportunityForm } from "../ActivityOpportunityForm";
import { createActivityOpportunityAction } from "../actions";

export default async function NewActivityOpportunityPage({
  searchParams,
}: {
  searchParams: Promise<{ resourceId?: string }>;
}) {
  const params = await searchParams;
  const [resourceList, sourceList] = await Promise.all([
    db.select({ id: resources.id, name: resources.name }).from(resources).orderBy(resources.name),
    db.select({ id: sources.id, sourceName: sources.sourceName }).from(sources).orderBy(sources.sourceName),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">体験機会を登録</h1>
        <p className="mt-1 text-sm text-stone-500">
          「この資源はこう体験にできそう」というアイデアを、地域資源本体とは切り分けて記録します。
        </p>
      </div>
      <div className="card p-6">
        {resourceList.length === 0 ? (
          <p className="text-sm text-stone-500">
            先に「地域資源DB」から対象となる地域資源を登録してください。
          </p>
        ) : (
          <ActivityOpportunityForm
            action={createActivityOpportunityAction}
            resources={resourceList}
            sources={sourceList}
            defaults={{ primaryResourceId: params.resourceId }}
            submitLabel="登録する"
            canUseFactWithoutFieldCheck={false}
          />
        )}
      </div>
    </div>
  );
}
