import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketPrograms, marketProgramPrices, platforms, regions, sources } from "@/db/schema";
import { MarketProgramForm } from "../../MarketProgramForm";
import { updateMarketProgramAction } from "../../actions";

function toDateInputValue(v: Date | null) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export default async function EditMarketProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [[program], regionList, sourceList, platformList, prices] = await Promise.all([
    db.select().from(marketPrograms).where(eq(marketPrograms.id, id)).limit(1),
    db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(regions.name),
    db.select({ id: sources.id, sourceName: sources.sourceName }).from(sources).orderBy(sources.sourceName),
    db.select({ id: platforms.id, name: platforms.name }).from(platforms).orderBy(platforms.name),
    db.select().from(marketProgramPrices).where(eq(marketProgramPrices.marketProgramId, id)),
  ]);
  if (!program) notFound();

  const platform = program.platformId
    ? platformList.find((p) => p.id === program.platformId)
    : undefined;

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">市場プログラムを編集</h1>
        <p className="mt-1 text-sm text-stone-500">{program.title}</p>
      </div>
      <div className="card p-6">
        <MarketProgramForm
          action={updateMarketProgramAction.bind(null, id)}
          regions={regionList}
          sources={sourceList}
          platforms={platformList}
          submitLabel="保存する"
          defaults={{
            programName: program.programName,
            platformName: platform?.name,
            url: program.url,
            categoryRaw: program.categoryRaw,
            areaText: program.areaText,
            matchedRegionId: program.matchedRegionId,
            targetAgeMin: program.targetAgeMin,
            targetAgeMax: program.targetAgeMax,
            durationMinutes: program.durationMinutes,
            capacityMin: program.capacityMin,
            capacityMax: program.capacityMax,
            parentAccompaniment: program.parentAccompaniment,
            title: program.title ?? "",
            catchCopy: program.catchCopy,
            description: program.description,
            flow: program.flow,
            mainActivities: program.mainActivities,
            learningElements: program.learningElements,
            takeawayElements: program.takeawayElements,
            marketingMessages: program.marketingMessages,
            instructorNotes: program.instructorNotes,
            reviewRating: program.reviewRating,
            reviewCount: program.reviewCount,
            reviewCheckedAt: toDateInputValue(program.reviewCheckedAt),
            researchedEmptyItems: program.researchedEmptyItems,
            eventDates: program.eventDates,
            bookingStatus: program.bookingStatus,
            fullBookedFlag: program.fullBookedFlag,
            safetyManagement: program.safetyManagement,
            rainPolicy: program.rainPolicy,
            cancellationPolicy: program.cancellationPolicy,
            sourceId: program.sourceId,
            lastCheckedAt: toDateInputValue(program.lastCheckedAt),
            priceRows: prices.map((p) => ({
              priceType: p.priceType,
              amount: String(p.amount),
              unit: p.unit ?? "",
              taxIncluded: p.taxIncluded ?? true,
              materialIncluded: p.materialIncluded ?? false,
              target: p.target ?? "",
              notes: p.notes ?? "",
              conditionAgeMin: p.conditionAgeMin != null ? String(p.conditionAgeMin) : "",
              conditionAgeMax: p.conditionAgeMax != null ? String(p.conditionAgeMax) : "",
              residencyCondition: p.residencyCondition ?? "",
              courseName: p.courseName ?? "",
              isAncillary: p.isAncillary ?? false,
              isRequired: p.isRequired ?? true,
            })),
          }}
        />
      </div>
    </div>
  );
}
