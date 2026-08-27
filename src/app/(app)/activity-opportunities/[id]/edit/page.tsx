import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityOpportunities, resources, sources } from "@/db/schema";
import { ActivityOpportunityForm } from "../../ActivityOpportunityForm";
import { updateActivityOpportunityAction } from "../../actions";

export default async function EditActivityOpportunityPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [[opp], resourceList, sourceList] = await Promise.all([
    db.select().from(activityOpportunities).where(eq(activityOpportunities.id, id)).limit(1),
    db.select({ id: resources.id, name: resources.name }).from(resources).orderBy(resources.name),
    db.select({ id: sources.id, sourceName: sources.sourceName }).from(sources).orderBy(sources.sourceName),
  ]);
  if (!opp) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">体験機会を編集</h1>
        <p className="mt-1 text-sm text-stone-500">{opp.title}</p>
      </div>
      <div className="card p-6">
        <ActivityOpportunityForm
          action={updateActivityOpportunityAction.bind(null, id)}
          resources={resourceList}
          sources={sourceList}
          submitLabel="保存する"
          canUseFactWithoutFieldCheck={Boolean(opp.fieldCheckedAt)}
          defaults={{
            primaryResourceId: opp.primaryResourceId,
            title: opp.title,
            description: opp.description,
            requiredGroupSizeMin: opp.requiredGroupSizeMin,
            requiredGroupSizeMax: opp.requiredGroupSizeMax,
            appropriateAgeMin: opp.appropriateAgeMin,
            appropriateAgeMax: opp.appropriateAgeMax,
            durationMinutesMin: opp.durationMinutesMin,
            durationMinutesMax: opp.durationMinutesMax,
            requiredEquipment: opp.requiredEquipment,
            permissionRequired: opp.permissionRequired,
            permissionRequiredFrom: opp.permissionRequiredFrom,
            permissionStatus: opp.permissionStatus,
            safetyRisks: opp.safetyRisks,
            seasons: opp.seasons,
            rainPolicy: opp.rainPolicy,
            needsGuide: opp.needsGuide,
            collaboratorsNote: opp.collaboratorsNote,
            accessNotes: opp.accessNotes,
            tags: opp.tags,
            factStatus: opp.factStatus,
            confidence: opp.confidence,
            sourceId: opp.sourceId,
          }}
        />
      </div>
    </div>
  );
}
