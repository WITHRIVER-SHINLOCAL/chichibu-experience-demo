import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sources } from "@/db/schema";
import { SourceForm } from "../../SourceForm";
import { updateSourceAction } from "../../actions";

export default async function EditSourcePage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) notFound();

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">出典を編集</h1>
        <p className="mt-1 text-sm text-stone-500">{source.sourceName}</p>
      </div>
      <div className="card p-6">
        <SourceForm
          action={updateSourceAction.bind(null, id)}
          submitLabel="保存する"
          defaults={{
            sourceName: source.sourceName,
            sourceUrl: source.sourceUrl,
            organization: source.organization,
            sourceType: source.sourceType,
            reliabilityGrade: source.reliabilityGrade,
            publishedAt: source.publishedAt ? source.publishedAt.toISOString() : null,
            accessedAt: source.accessedAt ? source.accessedAt.toISOString() : null,
            notes: source.notes,
          }}
        />
      </div>
    </div>
  );
}
