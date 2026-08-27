import Link from "next/link";
import { desc, eq, lt, or, isNull, sql } from "drizzle-orm";
import { db } from "@/db";
import {
  resources,
  sources,
  resourceRelationships,
  activityOpportunities,
  marketPrograms,
  programs,
  users,
  PROGRAM_STATUSES,
} from "@/db/schema";
import {
  CATEGORY_LABELS,
  FACT_STATUS_BADGE,
  FACT_STATUS_LABELS,
  PROGRAM_STATUS_BADGE,
  PROGRAM_STATUS_LABELS,
} from "@/lib/constants";
import { daysAgo, formatDate } from "@/lib/utils";
import { DemoIntro } from "@/components/DemoIntro";

const SOURCE_STALE_DAYS = 180;

export default async function DashboardPage() {
  const [
    resourceCount,
    sourceCount,
    relationshipCount,
    activityOpportunityCount,
    marketProgramCount,
    programCount,
  ] = await Promise.all([
    db.select({ count: sql<number>`count(*)` }).from(resources),
    db.select({ count: sql<number>`count(*)` }).from(sources),
    db.select({ count: sql<number>`count(*)` }).from(resourceRelationships),
    db.select({ count: sql<number>`count(*)` }).from(activityOpportunities),
    db.select({ count: sql<number>`count(*)` }).from(marketPrograms),
    db.select({ count: sql<number>`count(*)` }).from(programs),
  ]);

  const recentResources = await db
    .select()
    .from(resources)
    .orderBy(desc(resources.updatedAt))
    .limit(5);

  const recentPrograms = await db
    .select({
      id: programs.id,
      title: programs.title,
      status: programs.status,
      updatedAt: programs.updatedAt,
      ownerName: users.name,
    })
    .from(programs)
    .leftJoin(users, eq(programs.ownerId, users.id))
    .orderBy(desc(programs.updatedAt))
    .limit(5);

  const programStatusRows = await db
    .select({ status: programs.status, count: sql<number>`count(*)` })
    .from(programs)
    .groupBy(programs.status);
  const programStatusCounts = new Map(programStatusRows.map((r) => [r.status, Number(r.count)]));

  const staleDate = daysAgo(SOURCE_STALE_DAYS);
  const [staleSourceCount] = await db
    .select({ count: sql<number>`count(*)` })
    .from(sources)
    .where(or(lt(sources.accessedAt, staleDate), isNull(sources.accessedAt)));

  const stats = [
    { label: "地域資源", value: resourceCount[0]?.count ?? 0, href: "/resources" },
    { label: "出典", value: sourceCount[0]?.count ?? 0, href: "/sources" },
    { label: "関係性", value: relationshipCount[0]?.count ?? 0, href: "/relationships" },
    { label: "体験機会", value: activityOpportunityCount[0]?.count ?? 0, href: "/activity-opportunities" },
    { label: "市場プログラム", value: marketProgramCount[0]?.count ?? 0, href: "/market" },
    { label: "自社プログラム企画", value: programCount[0]?.count ?? 0, href: "/programs" },
  ];

  return (
    <div className="space-y-10">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">ダッシュボード</h1>
        <p className="mt-1 text-sm text-stone-500">
          地域資源DB・市場データ・プログラム企画の状況を一覧できます。
        </p>
      </div>

      <DemoIntro />

      <div className="grid grid-cols-2 sm:grid-cols-3 lg:grid-cols-6 gap-4">
        {stats.map((s) => (
          <Link key={s.label} href={s.href} className="card p-4 hover:border-river-200">
            <p className="text-xs font-medium text-stone-500">{s.label}</p>
            <p className="mt-1 text-2xl font-bold text-river-700">{s.value}</p>
          </Link>
        ))}
      </div>

      <div className="flex flex-wrap gap-3">
        <Link href="/resources/new" className="btn btn-primary">
          + 地域資源を登録
        </Link>
        <Link href="/sources/new" className="btn btn-secondary">
          + 出典を登録
        </Link>
        <Link href="/programs/new" className="btn btn-secondary">
          + 新しい企画を作る
        </Link>
        <Link href="/admin/sample-data" className="btn btn-secondary text-fuchsia-700">
          サンプルデータ管理
        </Link>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card p-5">
          <h2 className="font-semibold text-stone-900 mb-3">企画のステータス別件数</h2>
          {programCount[0]?.count ? (
            <ul className="space-y-1.5">
              {PROGRAM_STATUSES.map((s) => (
                <li key={s} className="flex items-center justify-between text-sm">
                  <span className={`badge ${PROGRAM_STATUS_BADGE[s]}`}>{PROGRAM_STATUS_LABELS[s]}</span>
                  <span className="font-semibold text-stone-900">{programStatusCounts.get(s) ?? 0}件</span>
                </li>
              ))}
            </ul>
          ) : (
            <p className="text-sm text-stone-400">まだプログラム企画がありません。</p>
          )}
        </section>
        <section className="card p-5">
          <h2 className="font-semibold text-stone-900 mb-3">出典の鮮度</h2>
          <p className="text-sm text-stone-700">
            確認日から{SOURCE_STALE_DAYS}日以上経過（未確認含む）:{" "}
            <span className="font-bold text-amber-700">{staleSourceCount?.count ?? 0}件</span>
          </p>
          <p className="mt-1 text-xs text-stone-500">情報の陳腐化を防ぐため、定期的な再確認をおすすめします。</p>
          <Link href="/sources" className="mt-3 inline-block text-xs font-medium text-river-600 hover:underline">
            出典一覧を確認する →
          </Link>
        </section>
      </div>

      <div className="grid md:grid-cols-2 gap-6">
        <section className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900">最近更新された地域資源</h2>
            <Link href="/resources" className="text-xs font-medium text-river-600 hover:underline">
              もっと見る →
            </Link>
          </div>
          <ul className="divide-y divide-stone-100">
            {recentResources.length === 0 && (
              <li className="px-5 py-6 text-sm text-stone-400">まだ地域資源が登録されていません。</li>
            )}
            {recentResources.map((r) => (
              <li key={r.id}>
                <Link href={`/resources/${r.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{r.name}</p>
                    <p className="text-xs text-stone-500">
                      {CATEGORY_LABELS[r.category]} ／ {formatDate(r.updatedAt)}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ml-3 ${FACT_STATUS_BADGE[r.factStatus]}`}>
                    {FACT_STATUS_LABELS[r.factStatus]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>

        <section className="card">
          <div className="flex items-center justify-between px-5 py-4 border-b border-stone-100">
            <h2 className="font-semibold text-stone-900">進行中のプログラム企画</h2>
            <Link href="/programs" className="text-xs font-medium text-river-600 hover:underline">
              もっと見る →
            </Link>
          </div>
          <ul className="divide-y divide-stone-100">
            {recentPrograms.length === 0 && (
              <li className="px-5 py-6 text-sm text-stone-400">まだプログラム企画がありません。</li>
            )}
            {recentPrograms.map((p) => (
              <li key={p.id}>
                <Link href={`/programs/${p.id}`} className="flex items-center justify-between px-5 py-3 hover:bg-stone-50">
                  <div className="min-w-0">
                    <p className="text-sm font-medium text-stone-900 truncate">{p.title}</p>
                    <p className="text-xs text-stone-500">
                      担当: {p.ownerName ?? "未設定"} ／ {formatDate(p.updatedAt)}
                    </p>
                  </div>
                  <span className={`badge shrink-0 ml-3 ${PROGRAM_STATUS_BADGE[p.status]}`}>
                    {PROGRAM_STATUS_LABELS[p.status]}
                  </span>
                </Link>
              </li>
            ))}
          </ul>
        </section>
      </div>
    </div>
  );
}
