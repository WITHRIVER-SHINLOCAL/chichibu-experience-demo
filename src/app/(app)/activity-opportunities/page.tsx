import Link from "next/link";
import { and, desc, eq, gte, lte, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { activityOpportunities, resources, FACT_STATUSES } from "@/db/schema";
import { FACT_STATUS_BADGE, FACT_STATUS_LABELS } from "@/lib/constants";
import { formatAgeRange, formatDurationRange, formatGroupSizeRange } from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";
import { FactStatusLegend } from "@/components/FactStatusLegend";

export default async function ActivityOpportunitiesPage({
  searchParams,
}: {
  searchParams: Promise<{ age?: string; maxDuration?: string; factStatus?: string; hideSample?: string }>;
}) {
  const params = await searchParams;
  const conditions: SQL[] = [];
  if (params.age) {
    const age = Number(params.age);
    conditions.push(lte(activityOpportunities.appropriateAgeMin, age));
    conditions.push(gte(activityOpportunities.appropriateAgeMax, age));
  }
  if (params.maxDuration) {
    conditions.push(lte(activityOpportunities.durationMinutesMax, Number(params.maxDuration)));
  }
  if (params.factStatus)
    conditions.push(eq(activityOpportunities.factStatus, params.factStatus as (typeof FACT_STATUSES)[number]));
  if (params.hideSample) conditions.push(eq(activityOpportunities.isSample, false));

  const rows = await db
    .select({ opp: activityOpportunities, resourceName: resources.name })
    .from(activityOpportunities)
    .innerJoin(resources, eq(activityOpportunities.primaryResourceId, resources.id))
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(activityOpportunities.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">体験機会（ACTIVITY OPPORTUNITY）</h1>
          <p className="mt-1 text-sm text-stone-500">
            「資源をどう体験に変えられそうか」を、資源そのものと切り離して横断的に管理します。
          </p>
        </div>
        <Link href="/activity-opportunities/new" className="btn btn-primary">
          + 体験機会を登録
        </Link>
      </div>

      <div className="card p-4 space-y-2 border-river-100 bg-river-50/30">
        <p className="text-xs text-stone-600">
          ACTIVITY OPPORTUNITYは「資源をどう体験に変えられそうか」というアイデアの単位です。1つの資源から複数の体験機会が生まれることもあります。
          ここから実際の
          <Link href="/programs" className="text-river-700 hover:underline">
            PROGRAM（体験プログラム企画）
          </Link>
          が組み立てられます。
        </p>
        <FactStatusLegend />
      </div>

      <form className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label" htmlFor="age">
            対象年齢（歳）で絞り込み
          </label>
          <input id="age" name="age" type="number" min={0} defaultValue={params.age} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="maxDuration">
            所要時間の上限（分）
          </label>
          <input id="maxDuration" name="maxDuration" type="number" min={0} defaultValue={params.maxDuration} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="factStatus">
            確度
          </label>
          <select id="factStatus" name="factStatus" defaultValue={params.factStatus ?? ""} className="input">
            <option value="">すべて</option>
            {FACT_STATUSES.map((f) => (
              <option key={f} value={f}>
                {FACT_STATUS_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div className="flex items-center gap-4 flex-wrap sm:col-span-4">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/activity-opportunities" className="btn btn-secondary">
            クリア
          </Link>
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" name="hideSample" value="1" defaultChecked={!!params.hideSample} />
            サンプルデータを非表示にする
          </label>
        </div>
      </form>

      <div className="card divide-y divide-stone-100">
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-stone-400">
            該当する体験機会がありません。
          </p>
        )}
        {rows.map(({ opp, resourceName }) => (
          <Link
            key={opp.id}
            href={`/activity-opportunities/${opp.id}`}
            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-stone-900">{opp.title}</p>
                <span className={`badge ${FACT_STATUS_BADGE[opp.factStatus]}`}>
                  {FACT_STATUS_LABELS[opp.factStatus]}
                </span>
                {opp.fieldCheckedAt && <span className="badge bg-sky-100 text-sky-800">現地確認済み</span>}
                {opp.isSample && <SampleBadge />}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                資源: {resourceName} ／ 対象年齢: {formatAgeRange(opp.appropriateAgeMin, opp.appropriateAgeMax)} ／
                所要時間: {formatDurationRange(opp.durationMinutesMin, opp.durationMinutesMax)} ／ 人数:{" "}
                {formatGroupSizeRange(opp.requiredGroupSizeMin, opp.requiredGroupSizeMax)}
              </p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
