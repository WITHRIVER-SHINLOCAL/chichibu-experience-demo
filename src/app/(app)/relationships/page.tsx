import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { alias } from "drizzle-orm/pg-core";
import { db } from "@/db";
import { resourceRelationships, resources } from "@/db/schema";
import { FACT_STATUS_BADGE, FACT_STATUS_LABELS, RELATIONSHIP_CATEGORY_LABELS } from "@/lib/constants";
import { formatDateTime } from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";
import { FactStatusLegend } from "@/components/FactStatusLegend";

export default async function RelationshipsPage({
  searchParams,
}: {
  searchParams: Promise<{ hideSample?: string }>;
}) {
  const params = await searchParams;
  const fromResources = alias(resources, "from_resources");
  const toResources = alias(resources, "to_resources");

  const allRows = await db
    .select({
      rel: resourceRelationships,
      fromName: fromResources.name,
      toName: toResources.name,
    })
    .from(resourceRelationships)
    .innerJoin(fromResources, eq(resourceRelationships.fromResourceId, fromResources.id))
    .innerJoin(
      toResources,
      eq(resourceRelationships.toResourceId, toResources.id)
    )
    .orderBy(desc(resourceRelationships.createdAt));

  const rows = params.hideSample ? allRows.filter((r) => !r.rel.isSample) : allRows;

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">地域資源リレーションシップ</h1>
          <p className="mt-1 text-sm text-stone-500">
            地域資源同士のつながりを一覧表示します（グラフ可視化はPhase 2）。
          </p>
        </div>
        <Link href="/relationships/new" className="btn btn-primary">
          + 関係性を登録
        </Link>
      </div>

      <div className="card p-4 space-y-2 border-river-100 bg-river-50/30">
        <p className="text-xs text-stone-600">
          RESOURCE RELATIONSHIPは、単体では気づきにくい資源同士のつながり（地質的・生態的・水文的・文化的・信仰的・歴史的・経済的など）を記録します。
          このつながりが、単なる「モノの紹介」ではなく「ストーリーのある体験」を作るための土台になります。
        </p>
        <FactStatusLegend />
      </div>

      <form className="card p-3 flex items-center gap-4 flex-wrap">
        <label className="flex items-center gap-1.5 text-xs text-stone-600">
          <input type="checkbox" name="hideSample" value="1" defaultChecked={!!params.hideSample} />
          サンプルデータを非表示にする
        </label>
        <button type="submit" className="btn btn-secondary text-xs">
          適用
        </button>
      </form>

      <div className="card divide-y divide-stone-100">
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-stone-400">
            まだ関係性が登録されていません。
          </p>
        )}
        {rows.map(({ rel, fromName, toName }) => (
          <div key={rel.id} className="px-5 py-4 flex items-start justify-between gap-4 flex-wrap">
            <div>
              <p className="text-sm text-stone-900">
                <Link href={`/resources/${rel.fromResourceId}`} className="font-medium hover:underline">
                  {fromName}
                </Link>
                <span className="mx-1.5 text-stone-400">→</span>
                <Link href={`/resources/${rel.toResourceId}`} className="font-medium hover:underline">
                  {toName}
                </Link>
              </p>
              <p className="mt-1 text-xs text-stone-500">
                {rel.relationshipLabel}（{RELATIONSHIP_CATEGORY_LABELS[rel.relationshipCategory]}）
              </p>
              {rel.description && <p className="mt-1 text-xs text-stone-500">{rel.description}</p>}
              <p className="mt-1 text-xs text-stone-400">{formatDateTime(rel.createdAt)}</p>
            </div>
            <div className="flex items-center gap-1.5 shrink-0">
              <span className={`badge ${FACT_STATUS_BADGE[rel.factStatus]}`}>
                {FACT_STATUS_LABELS[rel.factStatus]}
              </span>
              {rel.isSample && <SampleBadge />}
            </div>
          </div>
        ))}
      </div>
    </div>
  );
}
