import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { resourceSources, resources, sources } from "@/db/schema";
import {
  RELIABILITY_GRADE_BADGE,
  RELIABILITY_GRADE_LABELS,
  SOURCE_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";

export default async function SourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [source] = await db.select().from(sources).where(eq(sources.id, id)).limit(1);
  if (!source) notFound();

  const citingResources = await db
    .select({ id: resources.id, name: resources.name })
    .from(resourceSources)
    .innerJoin(resources, eq(resourceSources.resourceId, resources.id))
    .where(eq(resourceSources.sourceId, id));

  return (
    <div className="max-w-2xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">{source.sourceName}</h1>
            <span className={`badge ${RELIABILITY_GRADE_BADGE[source.reliabilityGrade]}`}>
              {source.reliabilityGrade}
            </span>
            {source.isSample && <SampleBadge />}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {SOURCE_TYPE_LABELS[source.sourceType]}
            {source.organization ? ` ／ ${source.organization}` : ""}
          </p>
        </div>
        <Link href={`/sources/${id}/edit`} className="btn btn-secondary">
          編集
        </Link>
      </div>

      <div className="card p-6 space-y-4">
        {source.sourceUrl && (
          <div>
            <h2 className="label">URL</h2>
            <a
              href={source.sourceUrl}
              target="_blank"
              rel="noreferrer"
              className="text-sm text-river-600 hover:underline break-all"
            >
              {source.sourceUrl}
            </a>
          </div>
        )}
        <div className="grid sm:grid-cols-2 gap-4">
          <div>
            <h2 className="label">信頼性グレード</h2>
            <p className="text-sm text-stone-700">{RELIABILITY_GRADE_LABELS[source.reliabilityGrade]}</p>
          </div>
          <div>
            <h2 className="label">確認日</h2>
            <p className="text-sm text-stone-700">{formatDate(source.accessedAt)}</p>
          </div>
          <div>
            <h2 className="label">公開日</h2>
            <p className="text-sm text-stone-700">{formatDate(source.publishedAt)}</p>
          </div>
        </div>
        {source.notes && (
          <div>
            <h2 className="label">メモ</h2>
            <p className="text-sm text-stone-700 whitespace-pre-wrap">{source.notes}</p>
          </div>
        )}
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">この出典を根拠にしている地域資源</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {citingResources.length === 0 && (
            <li className="px-5 py-6 text-sm text-stone-400">まだ紐付けられている資源はありません。</li>
          )}
          {citingResources.map((r) => (
            <li key={r.id}>
              <Link href={`/resources/${r.id}`} className="block px-5 py-3 hover:bg-stone-50 text-sm font-medium text-stone-900">
                {r.name}
              </Link>
            </li>
          ))}
        </ul>
      </div>
    </div>
  );
}
