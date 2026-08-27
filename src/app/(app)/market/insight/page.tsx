import Link from "next/link";
import { db } from "@/db";
import { marketPrograms, marketProgramPrices, regions } from "@/db/schema";
import {
  estimatePerPersonPrice,
  formatYen,
  ageBucket,
  durationBucket,
  AGE_BUCKETS,
  DURATION_BUCKETS,
} from "@/lib/utils";

function median(values: number[]): number | null {
  if (values.length === 0) return null;
  const sorted = [...values].sort((a, b) => a - b);
  const mid = Math.floor(sorted.length / 2);
  return sorted.length % 2 === 0 ? Math.round((sorted[mid - 1] + sorted[mid]) / 2) : sorted[mid];
}

export default async function MarketInsightPage({
  searchParams,
}: {
  searchParams: Promise<{ regionId?: string; age?: string; hideSample?: string }>;
}) {
  const params = await searchParams;

  const [allPrograms, allPrices, regionList] = await Promise.all([
    db.select().from(marketPrograms),
    db.select().from(marketProgramPrices),
    db.select().from(regions).orderBy(regions.name),
  ]);

  const pricesByProgram = new Map<string, typeof allPrices>();
  for (const p of allPrices) {
    const list = pricesByProgram.get(p.marketProgramId) ?? [];
    list.push(p);
    pricesByProgram.set(p.marketProgramId, list);
  }

  let programs = allPrograms;
  if (params.hideSample) programs = programs.filter((p) => !p.isSample);
  if (params.regionId) programs = programs.filter((p) => p.matchedRegionId === params.regionId);
  if (params.age) {
    const age = Number(params.age);
    programs = programs.filter((p) => {
      if (p.targetAgeMin == null && p.targetAgeMax == null) return true;
      if (p.targetAgeMin != null && age < p.targetAgeMin) return false;
      if (p.targetAgeMax != null && age > p.targetAgeMax) return false;
      return true;
    });
  }

  const estimates = programs
    .map((p) => estimatePerPersonPrice(pricesByProgram.get(p.id) ?? []))
    .filter((e): e is NonNullable<typeof e> => e !== null);
  const priceValues = estimates.map((e) => e.value);
  const avgPrice = priceValues.length
    ? Math.round(priceValues.reduce((a, b) => a + b, 0) / priceValues.length)
    : null;
  const medianPrice = median(priceValues);

  const durations = programs.map((p) => p.durationMinutes).filter((d): d is number => d != null);
  const avgDuration = durations.length
    ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
    : null;

  const ageBucketCounts = new Map<string, number>();
  for (const p of programs) {
    const b = ageBucket(p.targetAgeMin, p.targetAgeMax);
    ageBucketCounts.set(b, (ageBucketCounts.get(b) ?? 0) + 1);
  }
  const durationBucketCounts = new Map<string, number>();
  for (const p of programs) {
    const b = durationBucket(p.durationMinutes);
    durationBucketCounts.set(b, (durationBucketCounts.get(b) ?? 0) + 1);
  }
  const categoryCounts = new Map<string, number>();
  for (const p of programs) {
    if (!p.categoryRaw) continue;
    categoryCounts.set(p.categoryRaw, (categoryCounts.get(p.categoryRaw) ?? 0) + 1);
  }
  const priceBandCounts = new Map<string, number>();
  for (const v of priceValues) {
    const band = `${Math.floor(v / 1000) * 1000}〜${Math.floor(v / 1000) * 1000 + 999}円`;
    priceBandCounts.set(band, (priceBandCounts.get(band) ?? 0) + 1);
  }
  const topPriceBand = [...priceBandCounts.entries()].sort((a, b) => b[1] - a[1])[0];
  const topCategory = [...categoryCounts.entries()].sort((a, b) => b[1] - a[1])[0];

  return (
    <div className="space-y-6">
      <div className="flex items-center justify-between flex-wrap gap-3">
        <div>
          <h1 className="text-2xl font-bold text-stone-900">市場インサイト</h1>
          <p className="mt-1 text-sm text-stone-500">
            登録済みの市場プログラム（RAW FACT）を集計した参考値です。件数が少ないうちは統計的な信頼性が低い点に注意してください。
          </p>
        </div>
        <Link href="/market" className="btn btn-secondary">
          市場プログラム一覧へ
        </Link>
      </div>

      <div className="card p-4 border-river-100 bg-river-50/30">
        <p className="text-xs text-stone-600">
          この集計は、PROGRAM企画時にAI Reviewが「価格は妥当か」「対象年齢・所要時間は市場と比べてどうか」を判断する際の参考データとして使われます。
          AIはこの実データと自社PROGRAMの内容を比較して助言するだけで、ここにない情報を事実として作り出すことはありません。
        </p>
      </div>

      <form className="card p-4 grid sm:grid-cols-3 gap-3 items-end">
        <div>
          <label className="label" htmlFor="regionId">
            地域で絞り込み
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
          <label className="label" htmlFor="age">
            対象年齢（歳）で絞り込み
          </label>
          <input id="age" name="age" type="number" min={0} defaultValue={params.age} className="input" />
        </div>
        <div className="flex items-center gap-4 flex-wrap sm:col-span-3">
          <button type="submit" className="btn btn-primary">
            絞り込む
          </button>
          <Link href="/market/insight" className="btn btn-secondary">
            クリア
          </Link>
          <label className="flex items-center gap-1.5 text-xs text-stone-600">
            <input type="checkbox" name="hideSample" value="1" defaultChecked={!!params.hideSample} />
            サンプルデータを除いて集計する
          </label>
        </div>
      </form>

      <p className="text-sm text-stone-500">
        対象件数: <span className="font-semibold text-stone-900">{programs.length}件</span>
        （うち価格情報あり: {estimates.length}件 ／ うちサンプルデータ:{" "}
        {programs.filter((p) => p.isSample).length}件）
      </p>

      {programs.length === 0 ? (
        <div className="card p-10 text-center text-sm text-stone-400">
          該当する市場プログラムがありません。「市場プログラムを登録」から追加してください。
        </div>
      ) : (
        <>
          <div className="grid sm:grid-cols-2 lg:grid-cols-4 gap-4">
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">平均 参考換算価格（1人あたり）</p>
              <p className="mt-1 text-2xl font-bold text-river-700">{avgPrice != null ? formatYen(avgPrice) : "-"}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">中央値 参考換算価格</p>
              <p className="mt-1 text-2xl font-bold text-river-700">{medianPrice != null ? formatYen(medianPrice) : "-"}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">平均所要時間</p>
              <p className="mt-1 text-2xl font-bold text-river-700">{avgDuration != null ? `${avgDuration}分` : "-"}</p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">人気価格帯</p>
              <p className="mt-1 text-lg font-bold text-river-700">{topPriceBand ? topPriceBand[0] : "-"}</p>
            </div>
          </div>

          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            上記はすべて「参考換算価格」（家族・団体料金等を人数按分した概算を含む）と登録済みデータの単純集計です。事実（RAW
            FACT）そのものではなく、件数が増えるほど参考精度が上がります。
          </div>

          <div className="grid md:grid-cols-2 gap-6">
            <div className="card p-5">
              <h2 className="text-sm font-bold text-stone-500 tracking-wide mb-3">年齢帯別 件数</h2>
              <ul className="space-y-2">
                {AGE_BUCKETS.map((b) => (
                  <li key={b} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{b}</span>
                    <span className="font-semibold text-stone-900">{ageBucketCounts.get(b) ?? 0}件</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5">
              <h2 className="text-sm font-bold text-stone-500 tracking-wide mb-3">所要時間帯別 件数</h2>
              <ul className="space-y-2">
                {DURATION_BUCKETS.map((b) => (
                  <li key={b} className="flex items-center justify-between text-sm">
                    <span className="text-stone-700">{b}</span>
                    <span className="font-semibold text-stone-900">{durationBucketCounts.get(b) ?? 0}件</span>
                  </li>
                ))}
              </ul>
            </div>
            <div className="card p-5 md:col-span-2">
              <h2 className="text-sm font-bold text-stone-500 tracking-wide mb-3">
                カテゴリー別 件数（プラットフォーム表記そのまま集計）
                {topCategory && <span className="ml-2 font-normal text-stone-400">人気: {topCategory[0]}</span>}
              </h2>
              {categoryCounts.size === 0 ? (
                <p className="text-sm text-stone-400">カテゴリー情報が登録されているプログラムがありません。</p>
              ) : (
                <ul className="space-y-2">
                  {[...categoryCounts.entries()]
                    .sort((a, b) => b[1] - a[1])
                    .map(([cat, count]) => (
                      <li key={cat} className="flex items-center justify-between text-sm">
                        <span className="text-stone-700">{cat}</span>
                        <span className="font-semibold text-stone-900">{count}件</span>
                      </li>
                    ))}
                </ul>
              )}
            </div>
          </div>
        </>
      )}
    </div>
  );
}
