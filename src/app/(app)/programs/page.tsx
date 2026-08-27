import Link from "next/link";
import { and, desc, eq, type SQL } from "drizzle-orm";
import { db } from "@/db";
import { programs, regions, users, PROGRAM_STATUSES } from "@/db/schema";
import { PROGRAM_STATUS_BADGE, PROGRAM_STATUS_LABELS } from "@/lib/constants";
import { formatDate, formatYen } from "@/lib/utils";

export default async function ProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ status?: string; regionId?: string }>;
}) {
  const params = await searchParams;
  const conditions: SQL[] = [];
  if (params.status) conditions.push(eq(programs.status, params.status as (typeof PROGRAM_STATUSES)[number]));
  if (params.regionId) conditions.push(eq(programs.regionId, params.regionId));

  const [rows, regionList] = await Promise.all([
    db
      .select({ program: programs, regionName: regions.name, ownerName: users.name })
      .from(programs)
      .leftJoin(regions, eq(programs.regionId, regions.id))
      .leftJoin(users, eq(programs.ownerId, users.id))
      .where(conditions.length ? and(...conditions) : undefined)
      .orderBy(desc(programs.updatedAt)),
    db.select().from(regions).orderBy(regions.name),
  ]);

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">プログラム企画</h1>
          <p className="mt-1 text-sm text-stone-500">
            地域資源・体験機会・市場データをもとに作成した自社の体験プログラム企画です。
          </p>
        </div>
        <Link href="/programs/new" className="btn btn-primary">
          + 新しい企画を作る
        </Link>
      </div>

      <form className="card p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="label" htmlFor="status">
            ステータス
          </label>
          <select id="status" name="status" defaultValue={params.status ?? ""} className="input">
            <option value="">すべて</option>
            {PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROGRAM_STATUS_LABELS[s]}
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
        <div className="flex gap-2">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/programs" className="btn btn-secondary">
            クリア
          </Link>
        </div>
      </form>

      <div className="card divide-y divide-stone-100">
        {rows.length === 0 && (
          <p className="px-5 py-10 text-center text-sm text-stone-400">
            まだプログラム企画がありません。「プログラム開発ウィザード」から作成できます。
          </p>
        )}
        {rows.map(({ program, regionName, ownerName }) => (
          <Link
            key={program.id}
            href={`/programs/${program.id}`}
            className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50"
          >
            <div className="min-w-0">
              <div className="flex items-center gap-2 flex-wrap">
                <p className="text-sm font-semibold text-stone-900">{program.title}</p>
                <span className={`badge ${PROGRAM_STATUS_BADGE[program.status]}`}>
                  {PROGRAM_STATUS_LABELS[program.status]}
                </span>
              </div>
              <p className="mt-1 text-xs text-stone-500">
                {regionName ?? "-"} ／ 担当: {ownerName ?? "未設定"} ／ 更新: {formatDate(program.updatedAt)}
              </p>
            </div>
            <div className="text-right shrink-0">
              <p className="text-sm font-semibold text-river-700">{formatYen(program.recommendedPrice)}</p>
            </div>
          </Link>
        ))}
      </div>
    </div>
  );
}
