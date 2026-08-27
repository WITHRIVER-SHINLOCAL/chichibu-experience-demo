import Link from "next/link";
import { and, desc, eq, like, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { sources, SOURCE_TYPES, RELIABILITY_GRADES } from "@/db/schema";
import {
  RELIABILITY_GRADE_BADGE,
  SOURCE_TYPE_LABELS,
} from "@/lib/constants";
import { formatDate } from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";

export default async function SourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; sourceType?: string; reliabilityGrade?: string; hideSample?: string }>;
}) {
  const params = await searchParams;
  const conditions: SQL[] = [];
  if (params.q) conditions.push(like(sources.sourceName, `%${params.q}%`));
  if (params.sourceType)
    conditions.push(eq(sources.sourceType, params.sourceType as (typeof SOURCE_TYPES)[number]));
  if (params.reliabilityGrade)
    conditions.push(
      eq(sources.reliabilityGrade, params.reliabilityGrade as (typeof RELIABILITY_GRADES)[number])
    );
  if (params.hideSample) conditions.push(eq(sources.isSample, false));

  const rows = await db
    .select()
    .from(sources)
    .where(conditions.length ? and(...conditions) : undefined)
    .orderBy(desc(sources.createdAt));

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">出典管理</h1>
          <p className="mt-1 text-sm text-stone-500">
            地域資源・関係性・市場データの根拠となる出典を一元管理します。
          </p>
        </div>
        <Link href="/sources/new" className="btn btn-primary">
          + 出典を登録
        </Link>
      </div>

      <form className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q">
            キーワード検索
          </label>
          <input id="q" name="q" defaultValue={params.q} className="input" placeholder="出典名" />
        </div>
        <div>
          <label className="label" htmlFor="sourceType">
            種別
          </label>
          <select id="sourceType" name="sourceType" defaultValue={params.sourceType ?? ""} className="input">
            <option value="">すべて</option>
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="reliabilityGrade">
            信頼性グレード
          </label>
          <select
            id="reliabilityGrade"
            name="reliabilityGrade"
            defaultValue={params.reliabilityGrade ?? ""}
            className="input"
          >
            <option value="">すべて</option>
            {RELIABILITY_GRADES.map((g) => (
              <option key={g} value={g}>
                {g}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4 flex items-center gap-4 flex-wrap">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/sources" className="btn btn-secondary">
            条件をクリア
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
            出典が登録されていません。
          </p>
        )}
        {rows.map((s) => (
          <Link
            key={s.id}
            href={`/sources/${s.id}`}
            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-stone-900">{s.sourceName}</p>
                <span className={`badge ${RELIABILITY_GRADE_BADGE[s.reliabilityGrade]}`}>
                  {s.reliabilityGrade}
                </span>
                {s.isSample && <SampleBadge />}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {SOURCE_TYPE_LABELS[s.sourceType]}
                {s.organization ? ` ／ ${s.organization}` : ""} ／ 確認日:{" "}
                {formatDate(s.accessedAt)}
              </p>
              {s.sourceUrl && (
                <p className="mt-1 text-xs text-river-600 truncate max-w-md">{s.sourceUrl}</p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
