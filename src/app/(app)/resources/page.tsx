import Link from "next/link";
import { and, desc, eq, like, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { resources, regions, RESOURCE_CATEGORIES, SEASONS } from "@/db/schema";
import { CATEGORY_LABELS, FACT_STATUS_BADGE, FACT_STATUS_LABELS, SEASON_LABELS } from "@/lib/constants";
import { matchesSeason } from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";
import { FactStatusLegend } from "@/components/FactStatusLegend";

export default async function ResourcesPage({
  searchParams,
}: {
  searchParams: Promise<{ q?: string; category?: string; regionId?: string; season?: string; hideSample?: string }>;
}) {
  const params = await searchParams;
  const conditions: SQL[] = [];
  if (params.q) conditions.push(like(resources.name, `%${params.q}%`));
  if (params.category)
    conditions.push(eq(resources.category, params.category as (typeof RESOURCE_CATEGORIES)[number]));
  if (params.regionId) conditions.push(eq(resources.regionId, params.regionId));
  if (params.hideSample) conditions.push(eq(resources.isSample, false));

  const [rows, regionList] = await Promise.all([
    db
      .select()
      .from(resources)
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(resources.createdAt)),
    db.select().from(regions).orderBy(regions.name),
  ]);

  const filtered = params.season
    ? rows.filter((r) => matchesSeason(r.seasons, params.season))
    : rows;

  const regionName = (id: string) => regionList.find((r) => r.id === id)?.name ?? "-";

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">地域資源</h1>
          <p className="mt-1 text-sm text-stone-500">
            自然・生き物・地質・文化・歴史・産業・食・人・場所・物語の10カテゴリーで地域の資源を蓄積します。
          </p>
        </div>
        <Link href="/resources/new" className="btn btn-primary">
          + 地域資源を登録
        </Link>
      </div>

      <div className="card p-4 space-y-2 border-river-100 bg-river-50/30">
        <p className="text-xs text-stone-600">
          地域資源（RESOURCE）はすべての起点です。ここに登録された資源が、
          <Link href="/relationships" className="text-river-700 hover:underline">
            RESOURCE RELATIONSHIP
          </Link>
          で他の資源とつながり、
          <Link href="/activity-opportunities" className="text-river-700 hover:underline">
            ACTIVITY OPPORTUNITY
          </Link>
          （体験の種）に発展し、最終的にPROGRAM（体験プログラム企画）になります。
        </p>
        <FactStatusLegend />
      </div>

      <form className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="q">
            キーワード検索
          </label>
          <input id="q" name="q" defaultValue={params.q} className="input" placeholder="資源名" />
        </div>
        <div>
          <label className="label" htmlFor="category">
            カテゴリー
          </label>
          <select id="category" name="category" defaultValue={params.category ?? ""} className="input">
            <option value="">すべて</option>
            {RESOURCE_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="regionId">
            地域
          </label>
          <select id="regionId" name="regionId" defaultValue={params.regionId ?? ""} className="input">
            <option value="">すべて</option>
            {regionList.map((r) => (
              <option key={r.id} value={r.id}>
                {r.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="season">
            季節
          </label>
          <select id="season" name="season" defaultValue={params.season ?? ""} className="input">
            <option value="">すべて</option>
            {SEASONS.map((s) => (
              <option key={s} value={s}>
                {SEASON_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-4 flex items-center gap-4 flex-wrap">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/resources" className="btn btn-secondary">
            条件をクリア
          </Link>
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" name="hideSample" value="1" defaultChecked={!!params.hideSample} />
            サンプルデータを非表示にする
          </label>
        </div>
      </form>

      <div className="card divide-y divide-stone-100">
        {filtered.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-stone-400">
            該当する地域資源がありません。
          </p>
        )}
        {filtered.map((r) => (
          <Link
            key={r.id}
            href={`/resources/${r.id}`}
            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <span className="badge bg-stone-100 text-stone-700">{CATEGORY_LABELS[r.category]}</span>
                <p className="text-sm font-semibold text-stone-900">{r.name}</p>
                <span className={`badge ${FACT_STATUS_BADGE[r.factStatus]}`}>
                  {FACT_STATUS_LABELS[r.factStatus]}
                </span>
                {r.isSample && <SampleBadge />}
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {regionName(r.regionId)}
                {r.seasons.length > 0 && ` ／ ${r.seasons.map((s) => SEASON_LABELS[s]).join("・")}`}
              </p>
              {r.summary && (
                <p className="mt-1 text-xs text-stone-500 line-clamp-1">{r.summary}</p>
              )}
              {r.tags.length > 0 && (
                <p className="mt-1 text-xs text-river-700">
                  {r.tags.map((t) => `#${t}`).join(" ")}
                </p>
              )}
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
