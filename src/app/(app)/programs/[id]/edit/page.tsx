import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programs, regions } from "@/db/schema";
import { ProgramForm } from "../../ProgramForm";
import { updateProgramAction } from "../../actions";

export default async function EditProgramPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [[program], regionList] = await Promise.all([
    db.select().from(programs).where(eq(programs.id, id)).limit(1),
    db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(regions.name),
  ]);
  if (!program) notFound();

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">プログラム企画を編集</h1>
        <p className="mt-1 text-sm text-stone-500">{program.title}</p>
      </div>
      <div className="card p-6">
        <ProgramForm
          action={updateProgramAction.bind(null, id)}
          regions={regionList}
          submitLabel="保存する"
          defaults={{
            regionId: program.regionId,
            title: program.title,
            concept: program.concept,
            targetAudience: program.targetAudience,
            targetAgeMin: program.targetAgeMin,
            targetAgeMax: program.targetAgeMax,
            marketNeeds: program.marketNeeds,
            whyChichibu: program.whyChichibu,
            experienceContent: program.experienceContent,
            inquiryTheme: program.inquiryTheme,
            participantQuestions: program.participantQuestions,
            seasons: program.seasons,
            durationMinutes: program.durationMinutes,
            capacityMin: program.capacityMin,
            capacityMax: program.capacityMax,
            recommendedPrice: program.recommendedPrice,
            status: program.status,
          }}
        />
      </div>
    </div>
  );
}
