import Link from "next/link";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import { marketPrograms, marketProgramPrices, marketProgramAnalysis, platforms } from "@/db/schema";
import {
  formatDurationRange,
  formatAgeRange,
  formatYen,
  estimatePerPersonPrice,
  computeResearchCompleteness,
} from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";

export default async function MarketProgramsPage({
  searchParams,
}: {
  searchParams: Promise<{ platformId?: string; maxPrice?: string; age?: string; hideSample?: string }>;
}) {
  const params = await searchParams;

  const [rows, platformList] = await Promise.all([
    db
      .select({ program: marketPrograms, platformName: platforms.name })
      .from(marketPrograms)
      .leftJoin(platforms, eq(marketPrograms.platformId, platforms.id))
      .orderBy(desc(marketPrograms.createdAt)),
    db.select().from(platforms).orderBy(platforms.name),
  ]);

  const [allPrices, allAnalysis] = await Promise.all([
    db.select().from(marketProgramPrices),
    db.select().from(marketProgramAnalysis),
  ]);
  const pricesByProgram = new Map<string, typeof allPrices>();
  for (const p of allPrices) {
    const list = pricesByProgram.get(p.marketProgramId) ?? [];
    list.push(p);
    pricesByProgram.set(p.marketProgramId, list);
  }
  const analysisByProgram = new Map(allAnalysis.map((a) => [a.marketProgramId, a]));

  let filtered = rows;
  if (params.hideSample) {
    filtered = filtered.filter((r) => !r.program.isSample);
  }
  if (params.platformId) {
    filtered = filtered.filter((r) => r.program.platformId === params.platformId);
  }
  if (params.age) {
    const age = Number(params.age);
    filtered = filtered.filter((r) => {
      const p = r.program;
      if (p.targetAgeMin == null && p.targetAgeMax == null) return true;
      if (p.targetAgeMin != null && age < p.targetAgeMin) return false;
      if (p.targetAgeMax != null && age > p.targetAgeMax) return false;
      return true;
    });
  }
  if (params.maxPrice) {
    const max = Number(params.maxPrice);
    filtered = filtered.filter((r) => {
      const est = estimatePerPersonPrice(pricesByProgram.get(r.program.id) ?? []);
      return est ? est.value <= max : true;
    });
  }

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">市場プログラム</h1>
          <p className="mt-1 text-sm text-stone-500">
            他社・他地域の体験プログラムの実データ（RAW FACT）を蓄積します。
          </p>
        </div>
        <div className="flex gap-2">
          <Link href="/market/insight" className="btn btn-secondary">
            市場インサイトを見る
          </Link>
          <Link href="/market/new" className="btn btn-primary">
            + 市場プログラムを登録
          </Link>
        </div>
      </div>

      <div className="card p-4 border-river-100 bg-river-50/30">
        <p className="text-xs text-stone-600">
          ここに集めた他社・他地域の実データ（RAW FACT）が、AI Reviewの「③市場比較」で自社PROGRAMと突き合わせる材料になります。
          価格は<code>unit</code>（何人分の料金か）を根拠にできる場合のみ1人あたり参考価格に換算し、判断できない場合は算出しません。
        </p>
      </div>

      <form className="card p-4 grid sm:grid-cols-4 gap-3 items-end">
        <div>
          <label className="label" htmlFor="platformId">
            プラットフォーム
          </label>
          <select id="platformId" name="platformId" defaultValue={params.platformId ?? ""} className="input">
            <option value="">すべて</option>
            {platformList.map((p) => (
              <option key={p.id} value={p.id}>
                {p.name}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="age">
            対象年齢（歳）
          </label>
          <input id="age" name="age" type="number" min={0} defaultValue={params.age} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="maxPrice">
            参考価格の上限（円・1人あたり）
          </label>
          <input id="maxPrice" name="maxPrice" type="number" min={0} defaultValue={params.maxPrice} className="input" />
        </div>
        <div className="flex items-center gap-4 flex-wrap sm:col-span-4">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/market" className="btn btn-secondary">
            クリア
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
            該当する市場プログラムがありません。
          </p>
        )}
        {filtered.map(({ program, platformName }) => {
          const est = estimatePerPersonPrice(pricesByProgram.get(program.id) ?? []);
          const completeness = computeResearchCompleteness(
            program,
            pricesByProgram.get(program.id) ?? [],
            analysisByProgram.get(program.id) ?? null
          );
          return (
            <Link
              key={program.id}
              href={`/market/${program.id}`}
              className="flex items-start justify-between gap-4 px-5 py-4 hover:bg-stone-50"
            >
              <div className="min-w-0">
                <div className="flex items-center gap-2 flex-wrap">
                  <p className="text-sm font-semibold text-stone-900">{program.title}</p>
                  {platformName && <span className="badge bg-stone-100 text-stone-700">{platformName}</span>}
                  {program.isSample && <SampleBadge />}
                  <span className="badge bg-stone-100 text-stone-500">
                    completeness {completeness.filled}/{completeness.total}
                  </span>
                </div>
                <p className="mt-1 text-xs text-stone-500">
                  {program.areaText && `${program.areaText} ／ `}
                  対象年齢: {formatAgeRange(program.targetAgeMin, program.targetAgeMax)} ／ 所要時間:{" "}
                  {formatDurationRange(program.durationMinutes, program.durationMinutes)}
                </p>
              </div>
              <div className="text-right shrink-0">
                {est ? (
                  <>
                    <p className="text-sm font-semibold text-river-700">{formatYen(est.value)}〜</p>
                    <p className="text-[10px] text-stone-400">参考換算価格</p>
                  </>
                ) : (
                  <p className="text-xs text-stone-400">価格未登録</p>
                )}
              </div>
            </Link>
          );
        })}
      </div>
    </div>
  );
}
