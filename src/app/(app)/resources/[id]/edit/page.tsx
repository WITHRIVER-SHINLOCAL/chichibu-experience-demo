import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resources, regions } from "@/db/schema";
import { ResourceForm } from "../../ResourceForm";
import { updateResourceAction } from "../../actions";

export default async function EditResourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [[resource], regionList] = await Promise.all([
    db.select().from(resources).where(eq(resources.id, id)).limit(1),
    db.select().from(regions).orderBy(regions.name),
  ]);
  if (!resource) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">地域資源を編集</h1>
        <p className="mt-1 text-sm text-stone-500">{resource.name}</p>
      </div>
      <div className="card p-6">
        <ResourceForm
          action={updateResourceAction.bind(null, id)}
          regions={regionList}
          submitLabel="保存する"
          defaults={{
            regionId: resource.regionId,
            category: resource.category,
            name: resource.name,
            summary: resource.summary,
            background: resource.background,
            history: resource.history,
            seasons: resource.seasons,
            targetAge: resource.targetAge,
            educationTheme: resource.educationTheme,
            experiencePotentialNote: resource.experiencePotentialNote,
            ownerManager: resource.ownerManager,
            collaborators: resource.collaborators,
            url: resource.url,
            lat: resource.lat,
            lng: resource.lng,
            safetyNotes: resource.safetyNotes,
            rainPolicy: resource.rainPolicy,
            priceInfo: resource.priceInfo,
            tags: resource.tags,
            memo: resource.memo,
            factStatus: resource.factStatus,
            confidence: resource.confidence,
          }}
        />
      </div>
    </div>
  );
}
