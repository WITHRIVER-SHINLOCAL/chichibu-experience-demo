import { db } from "@/db";
import {
  regions,
  resources,
  activityOpportunities,
  resourceRelationships,
  marketPrograms,
  marketProgramPrices,
} from "@/db/schema";
import { ProgramWizard } from "./ProgramWizard";

export default async function NewProgramPage() {
  const [regionList, resourceList, opportunityList, relationshipList, marketList, priceList] =
    await Promise.all([
      db.select().from(regions).orderBy(regions.name),
      db
        .select({
          id: resources.id,
          regionId: resources.regionId,
          category: resources.category,
          name: resources.name,
          summary: resources.summary,
          seasons: resources.seasons,
          tags: resources.tags,
          factStatus: resources.factStatus,
        })
        .from(resources),
      db
        .select({
          id: activityOpportunities.id,
          primaryResourceId: activityOpportunities.primaryResourceId,
          title: activityOpportunities.title,
          appropriateAgeMin: activityOpportunities.appropriateAgeMin,
          appropriateAgeMax: activityOpportunities.appropriateAgeMax,
          durationMinutesMin: activityOpportunities.durationMinutesMin,
          durationMinutesMax: activityOpportunities.durationMinutesMax,
          seasons: activityOpportunities.seasons,
          factStatus: activityOpportunities.factStatus,
          requiredGroupSizeMin: activityOpportunities.requiredGroupSizeMin,
          requiredGroupSizeMax: activityOpportunities.requiredGroupSizeMax,
        })
        .from(activityOpportunities),
      db
        .select({
          id: resourceRelationships.id,
          fromResourceId: resourceRelationships.fromResourceId,
          toResourceId: resourceRelationships.toResourceId,
          relationshipCategory: resourceRelationships.relationshipCategory,
          relationshipLabel: resourceRelationships.relationshipLabel,
          factStatus: resourceRelationships.factStatus,
        })
        .from(resourceRelationships),
      db
        .select({
          id: marketPrograms.id,
          title: marketPrograms.title,
          matchedRegionId: marketPrograms.matchedRegionId,
          targetAgeMin: marketPrograms.targetAgeMin,
          targetAgeMax: marketPrograms.targetAgeMax,
          durationMinutes: marketPrograms.durationMinutes,
        })
        .from(marketPrograms),
      db
        .select({
          marketProgramId: marketProgramPrices.marketProgramId,
          priceType: marketProgramPrices.priceType,
          amount: marketProgramPrices.amount,
          isAncillary: marketProgramPrices.isAncillary,
        })
        .from(marketProgramPrices),
    ]);

  return (
    <div className="space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">プログラム開発ウィザード</h1>
        <p className="mt-1 text-sm text-stone-500">
          条件入力から市場確認・地域資源探索・体験素材選択までを1つの画面で進め、最後に企画として保存します（AIは使用しません）。
        </p>
      </div>
      {regionList.length === 0 ? (
        <div className="card p-10 text-center text-sm text-stone-500">
          先に「設定」で地域(REGION)が投入されている必要があります。管理者にお問い合わせください。
        </div>
      ) : (
        <ProgramWizard
          regions={regionList}
          resources={resourceList}
          activityOpportunities={opportunityList}
          relationships={relationshipList}
          marketPrograms={marketList}
          marketPrices={priceList}
        />
      )}
    </div>
  );
}
