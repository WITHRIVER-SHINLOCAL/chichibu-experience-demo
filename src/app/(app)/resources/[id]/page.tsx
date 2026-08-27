import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  resources,
  regions,
  resourceNotes,
  resourceSources,
  sources,
  activityOpportunities,
  activityOpportunityResources,
  resourceRelationships,
  programResources,
  programs,
} from "@/db/schema";
import {
  CATEGORY_LABELS,
  FACT_STATUS_BADGE,
  FACT_STATUS_LABELS,
  SEASON_LABELS,
  RELATIONSHIP_CATEGORY_LABELS,
} from "@/lib/constants";
import { formatDate, formatDateTime, formatAgeRange, formatDurationRange } from "@/lib/utils";
import { NoteForm } from "./NoteForm";
import { LinkSourceForm } from "./LinkSourceForm";
import { SampleBadge } from "@/components/SampleBadge";

export default async function ResourceDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [resource] = await db.select().from(resources).where(eq(resources.id, id)).limit(1);
  if (!resource) notFound();

  const [
    region,
    notes,
    linkedSourceRows,
    allSources,
    directOpportunities,
    viaOpportunityLinks,
    relFrom,
    relTo,
    linkedPrograms,
  ] = await Promise.all([
    db.select().from(regions).where(eq(regions.id, resource.regionId)).limit(1),
    db
      .select({ note: resourceNotes, sourceName: sources.sourceName })
      .from(resourceNotes)
      .leftJoin(sources, eq(resourceNotes.sourceId, sources.id))
      .where(eq(resourceNotes.resourceId, id))
      .orderBy(desc(resourceNotes.createdAt)),
    db
      .select({ link: resourceSources, source: sources })
      .from(resourceSources)
      .innerJoin(sources, eq(resourceSources.sourceId, sources.id))
      .where(eq(resourceSources.resourceId, id)),
    db.select().from(sources).orderBy(sources.sourceName),
    db
      .select()
      .from(activityOpportunities)
      .where(eq(activityOpportunities.primaryResourceId, id)),
    db
      .select({ opp: activityOpportunities })
      .from(activityOpportunityResources)
      .innerJoin(
        activityOpportunities,
        eq(activityOpportunityResources.activityOpportunityId, activityOpportunities.id)
      )
      .where(eq(activityOpportunityResources.resourceId, id)),
    db
      .select({ rel: resourceRelationships, other: resources })
      .from(resourceRelationships)
      .innerJoin(resources, eq(resourceRelationships.toResourceId, resources.id))
      .where(eq(resourceRelationships.fromResourceId, id)),
    db
      .select({ rel: resourceRelationships, other: resources })
      .from(resourceRelationships)
      .innerJoin(resources, eq(resourceRelationships.fromResourceId, resources.id))
      .where(eq(resourceRelationships.toResourceId, id)),
    db
      .select({ program: programs, note: programResources.note })
      .from(programResources)
      .innerJoin(programs, eq(programResources.programId, programs.id))
      .where(eq(programResources.resourceId, id)),
  ]);

  const opportunityIds = new Set(directOpportunities.map((o) => o.id));
  const allOpportunities = [
    ...directOpportunities.map((o) => ({ opp: o, isPrimary: true })),
    ...viaOpportunityLinks
      .filter((v) => !opportunityIds.has(v.opp.id))
      .map((v) => ({ opp: v.opp, isPrimary: false })),
  ];

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <span className="badge bg-stone-100 text-stone-700">{CATEGORY_LABELS[resource.category]}</span>
            <h1 className="text-2xl font-bold text-stone-900">{resource.name}</h1>
            <span className={`badge ${FACT_STATUS_BADGE[resource.factStatus]}`}>
              {FACT_STATUS_LABELS[resource.factStatus]}
            </span>
            {resource.isSample && <SampleBadge />}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {region[0]?.name ?? "-"}
            {resource.seasons.length > 0 &&
              ` ／ ${resource.seasons.map((s) => SEASON_LABELS[s]).join("・")}`}
          </p>
        </div>
        <Link href={`/resources/${id}/edit`} className="btn btn-secondary">
          編集
        </Link>
      </div>

      <div className="card p-6 space-y-4">
        {resource.summary && <p className="text-sm text-stone-700 whitespace-pre-wrap">{resource.summary}</p>}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {resource.background && (
            <div>
              <h2 className="label">背景</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.background}</p>
            </div>
          )}
          {resource.history && (
            <div>
              <h2 className="label">歴史</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.history}</p>
            </div>
          )}
          {resource.targetAge && (
            <div>
              <h2 className="label">想定対象年齢</h2>
              <p className="text-stone-700">{resource.targetAge}</p>
            </div>
          )}
          {resource.educationTheme && (
            <div>
              <h2 className="label">教育テーマ</h2>
              <p className="text-stone-700">{resource.educationTheme}</p>
            </div>
          )}
          {resource.experiencePotentialNote && (
            <div className="sm:col-span-2">
              <h2 className="label">体験可能性メモ（走り書き・未整理）</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.experiencePotentialNote}</p>
            </div>
          )}
          {resource.ownerManager && (
            <div>
              <h2 className="label">所有者・管理者</h2>
              <p className="text-stone-700">{resource.ownerManager}</p>
            </div>
          )}
          {resource.collaborators && (
            <div>
              <h2 className="label">協力者</h2>
              <p className="text-stone-700">{resource.collaborators}</p>
            </div>
          )}
          {resource.url && (
            <div className="sm:col-span-2">
              <h2 className="label">参考URL</h2>
              <a href={resource.url} target="_blank" rel="noreferrer" className="text-river-600 hover:underline break-all">
                {resource.url}
              </a>
            </div>
          )}
          {(resource.lat != null || resource.lng != null) && (
            <div>
              <h2 className="label">位置</h2>
              <p className="text-stone-700">
                {resource.lat ?? "-"}, {resource.lng ?? "-"}
              </p>
            </div>
          )}
          {resource.safetyNotes && (
            <div>
              <h2 className="label">安全上の注意</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.safetyNotes}</p>
            </div>
          )}
          {resource.rainPolicy && (
            <div>
              <h2 className="label">雨天時の扱い</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.rainPolicy}</p>
            </div>
          )}
          {resource.priceInfo && (
            <div>
              <h2 className="label">価格情報（参考）</h2>
              <p className="text-stone-700">{resource.priceInfo}</p>
            </div>
          )}
          {resource.memo && (
            <div className="sm:col-span-2">
              <h2 className="label">その他メモ</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{resource.memo}</p>
            </div>
          )}
        </div>
        {resource.tags.length > 0 && (
          <p className="text-xs text-river-700">{resource.tags.map((t) => `#${t}`).join(" ")}</p>
        )}
        <p className="text-xs text-stone-400">
          最終更新: {formatDateTime(resource.updatedAt)}
          {resource.lastCheckedAt && ` ／ 最終確認: ${formatDate(resource.lastCheckedAt)}`}
        </p>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">体験機会（ACTIVITY OPPORTUNITY）</h2>
          <Link href={`/activity-opportunities/new?resourceId=${id}`} className="btn btn-secondary text-xs">
            + 体験機会を追加
          </Link>
        </div>
        <ul className="divide-y divide-stone-100">
          {allOpportunities.length === 0 && (
            <li className="px-5 py-6 text-sm text-stone-400">
              まだ体験機会が登録されていません。「できそう」という段階でも、まずはIDEAとして登録できます。
            </li>
          )}
          {allOpportunities.map(({ opp, isPrimary }) => (
            <li key={opp.id}>
              <Link href={`/activity-opportunities/${opp.id}`} className="block px-5 py-3 hover:bg-stone-50">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-medium text-stone-900">{opp.title}</p>
                  <span className={`badge ${FACT_STATUS_BADGE[opp.factStatus]}`}>
                    {FACT_STATUS_LABELS[opp.factStatus]}
                  </span>
                  {!isPrimary && <span className="text-xs text-stone-400">（関連資源として）</span>}
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  対象年齢: {formatAgeRange(opp.appropriateAgeMin, opp.appropriateAgeMax)} ／ 所要時間:{" "}
                  {formatDurationRange(opp.durationMinutesMin, opp.durationMinutesMax)}
                </p>
              </Link>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100 flex items-center justify-between">
          <h2 className="font-semibold text-stone-900">関係性（RELATIONSHIP）</h2>
          <Link href={`/relationships/new?fromResourceId=${id}`} className="btn btn-secondary text-xs">
            + 関係性を追加
          </Link>
        </div>
        <ul className="divide-y divide-stone-100">
          {relFrom.length === 0 && relTo.length === 0 && (
            <li className="px-5 py-6 text-sm text-stone-400">まだ関係性が登録されていません。</li>
          )}
          {relFrom.map(({ rel, other }) => (
            <li key={rel.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-stone-900">
                  {resource.name} →{" "}
                  <Link href={`/resources/${other.id}`} className="text-river-600 hover:underline">
                    {other.name}
                  </Link>
                  <span className="ml-2 text-xs text-stone-500">
                    {rel.relationshipLabel}（{RELATIONSHIP_CATEGORY_LABELS[rel.relationshipCategory]}）
                  </span>
                </p>
              </div>
              <span className={`badge ${FACT_STATUS_BADGE[rel.factStatus]}`}>
                {FACT_STATUS_LABELS[rel.factStatus]}
              </span>
            </li>
          ))}
          {relTo.map(({ rel, other }) => (
            <li key={rel.id} className="px-5 py-3 flex items-center justify-between gap-3 flex-wrap">
              <div>
                <p className="text-sm text-stone-900">
                  <Link href={`/resources/${other.id}`} className="text-river-600 hover:underline">
                    {other.name}
                  </Link>{" "}
                  → {resource.name}
                  <span className="ml-2 text-xs text-stone-500">
                    {rel.relationshipLabel}（{RELATIONSHIP_CATEGORY_LABELS[rel.relationshipCategory]}）
                  </span>
                </p>
              </div>
              <span className={`badge ${FACT_STATUS_BADGE[rel.factStatus]}`}>
                {FACT_STATUS_LABELS[rel.factStatus]}
              </span>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">出典（SOURCE）</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {linkedSourceRows.length === 0 && (
            <li className="px-5 py-4 text-sm text-stone-400">まだ出典が紐付けられていません。</li>
          )}
          {linkedSourceRows.map(({ link, source }) => (
            <li key={link.id} className="px-5 py-3">
              <Link href={`/sources/${source.id}`} className="text-sm font-medium text-stone-900 hover:underline">
                {source.sourceName}
              </Link>
              <span className="ml-2 text-xs text-stone-500">（{source.reliabilityGrade}）</span>
              {link.note && <p className="mt-0.5 text-xs text-stone-500">{link.note}</p>}
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 border-t border-stone-100">
          <LinkSourceForm
            resourceId={id}
            sources={allSources.map((s) => ({ id: s.id, sourceName: s.sourceName }))}
          />
        </div>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">考察・補足情報</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {notes.length === 0 && (
            <li className="px-5 py-4 text-sm text-stone-400">まだ考察・補足情報がありません。</li>
          )}
          {notes.map(({ note, sourceName }) => (
            <li key={note.id} className="px-5 py-3">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${FACT_STATUS_BADGE[note.factStatus]}`}>
                  {FACT_STATUS_LABELS[note.factStatus]}
                </span>
                {note.confidence != null && (
                  <span className="text-xs text-stone-400">確信度 {note.confidence}</span>
                )}
                <span className="text-xs text-stone-400">{formatDateTime(note.createdAt)}</span>
              </div>
              <p className="mt-1 text-sm text-stone-700 whitespace-pre-wrap">{note.body}</p>
              {sourceName && <p className="mt-1 text-xs text-stone-500">出典: {sourceName}</p>}
            </li>
          ))}
        </ul>
        <div className="px-5 py-4 border-t border-stone-100">
          <NoteForm
            resourceId={id}
            sources={allSources.map((s) => ({ id: s.id, sourceName: s.sourceName }))}
          />
        </div>
      </div>

      {linkedPrograms.length > 0 && (
        <div className="card">
          <div className="px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900">この資源を使ったプログラム</h2>
          </div>
          <ul className="divide-y divide-stone-100">
            {linkedPrograms.map(({ program, note }) => (
              <li key={program.id}>
                <Link href={`/programs/${program.id}`} className="block px-5 py-3 hover:bg-stone-50">
                  <p className="text-sm font-medium text-stone-900">{program.title}</p>
                  {note && <p className="mt-0.5 text-xs text-stone-500">{note}</p>}
                </Link>
              </li>
            ))}
          </ul>
        </div>
      )}
    </div>
  );
}
