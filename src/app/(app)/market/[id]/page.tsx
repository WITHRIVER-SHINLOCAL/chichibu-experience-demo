import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { marketPrograms, marketProgramPrices, marketProgramAnalysis, platforms, regions, sources } from "@/db/schema";
import { PRICE_TYPE_LABELS, RESEARCH_STATUS_LABELS, RESEARCH_STATUS_BADGE } from "@/lib/constants";
import {
  formatAgeRange,
  formatDurationRange,
  formatGroupSizeRange,
  formatYen,
  formatDate,
  formatDateTime,
  estimatePerPersonPrice,
  computeResearchCompleteness,
} from "@/lib/utils";
import { SampleBadge } from "@/components/SampleBadge";
import { MarketProgramAnalysisForm } from "./MarketProgramAnalysisForm";
import { upsertMarketProgramAnalysisAction } from "../actions";

export default async function MarketProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [program] = await db.select().from(marketPrograms).where(eq(marketPrograms.id, id)).limit(1);
  if (!program) notFound();

  const [platform, region, source, prices, analysisRows] = await Promise.all([
    program.platformId
      ? db.select().from(platforms).where(eq(platforms.id, program.platformId)).limit(1)
      : Promise.resolve([]),
    program.matchedRegionId
      ? db.select().from(regions).where(eq(regions.id, program.matchedRegionId)).limit(1)
      : Promise.resolve([]),
    program.sourceId
      ? db.select().from(sources).where(eq(sources.id, program.sourceId)).limit(1)
      : Promise.resolve([]),
    db.select().from(marketProgramPrices).where(eq(marketProgramPrices.marketProgramId, id)),
    db.select().from(marketProgramAnalysis).where(eq(marketProgramAnalysis.marketProgramId, id)).limit(1),
  ]);
  const analysis = analysisRows[0] ?? null;

  const estimate = estimatePerPersonPrice(prices);
  const requiredAncillaryTotal = prices
    .filter((p) => p.isAncillary && p.isRequired)
    .reduce((sum, p) => sum + p.amount, 0);
  const totalWithRequiredAncillary =
    estimate && requiredAncillaryTotal > 0 ? estimate.value + requiredAncillaryTotal : null;
  const completeness = computeResearchCompleteness(program, prices, analysis);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">{program.title}</h1>
            {platform[0] && <span className="badge bg-stone-100 text-stone-700">{platform[0].name}</span>}
            {program.isSample && <SampleBadge />}
          </div>
          {program.catchCopy && <p className="mt-1 text-sm text-stone-500">{program.catchCopy}</p>}
        </div>
        <Link href={`/market/${id}/edit`} className="btn btn-secondary">
          編集
        </Link>
      </div>

      <div className="card p-4 space-y-2">
        <div className="flex items-center justify-between">
          <h2 className="text-sm font-bold text-stone-500 tracking-wide">
            Research completeness {completeness.filled}/{completeness.total}
          </h2>
        </div>
        <div className="flex flex-wrap gap-1.5">
          {completeness.items.map((item) => (
            <span key={item.key} className={`badge ${RESEARCH_STATUS_BADGE[item.status]}`} title={RESEARCH_STATUS_LABELS[item.status]}>
              {item.label}：{RESEARCH_STATUS_LABELS[item.status]}
            </span>
          ))}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">RAW FACT（原データ）</h2>
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {program.url && (
            <div className="sm:col-span-2">
              <h3 className="label">URL</h3>
              <a href={program.url} target="_blank" rel="noreferrer" className="text-river-600 hover:underline break-all">
                {program.url}
              </a>
            </div>
          )}
          <div>
            <h3 className="label">エリア表記</h3>
            <p className="text-stone-700">{program.areaText ?? "-"}</p>
          </div>
          <div>
            <h3 className="label">対応地域</h3>
            <p className="text-stone-700">{region[0]?.name ?? "未設定"}</p>
          </div>
          <div>
            <h3 className="label">カテゴリー（原表記）</h3>
            <p className="text-stone-700">{program.categoryRaw ?? "-"}</p>
          </div>
          <div>
            <h3 className="label">対象年齢</h3>
            <p className="text-stone-700">{formatAgeRange(program.targetAgeMin, program.targetAgeMax)}</p>
          </div>
          <div>
            <h3 className="label">所要時間</h3>
            <p className="text-stone-700">{formatDurationRange(program.durationMinutes, program.durationMinutes)}</p>
          </div>
          <div>
            <h3 className="label">定員</h3>
            <p className="text-stone-700">{formatGroupSizeRange(program.capacityMin, program.capacityMax)}</p>
          </div>
          {program.parentAccompaniment && (
            <div>
              <h3 className="label">保護者同伴等</h3>
              <p className="text-stone-700">{program.parentAccompaniment}</p>
            </div>
          )}
          {program.description && (
            <div className="sm:col-span-2">
              <h3 className="label">説明文</h3>
              <p className="text-stone-700 whitespace-pre-wrap">{program.description}</p>
            </div>
          )}
          {program.flow && (
            <div className="sm:col-span-2">
              <h3 className="label">当日の流れ</h3>
              <p className="text-stone-700 whitespace-pre-wrap">{program.flow}</p>
            </div>
          )}
          {program.mainActivities.length > 0 && (
            <div>
              <h3 className="label">主な活動内容</h3>
              <p className="text-stone-700">{program.mainActivities.join("、")}</p>
            </div>
          )}
          {program.learningElements.length > 0 && (
            <div>
              <h3 className="label">学びの要素</h3>
              <p className="text-stone-700">{program.learningElements.join("、")}</p>
            </div>
          )}
          {program.takeawayElements.length > 0 && (
            <div>
              <h3 className="label">持ち帰れるもの・成果物</h3>
              <p className="text-stone-700">{program.takeawayElements.join("、")}</p>
            </div>
          )}
          {program.instructorNotes.length > 0 && (
            <div>
              <h3 className="label">講師・ガイド・案内人</h3>
              <p className="text-stone-700">{program.instructorNotes.join("、")}</p>
            </div>
          )}
          {program.marketingMessages.length > 0 && (
            <div className="sm:col-span-2">
              <h3 className="label">訴求文（中立採取・分類はしない）</h3>
              <ul className="list-disc list-inside text-stone-700 space-y-0.5">
                {program.marketingMessages.map((m, i) => (
                  <li key={i}>{m}</li>
                ))}
              </ul>
            </div>
          )}
          {(program.reviewRating != null || program.reviewCount != null || program.reviewCheckedAt) && (
            <div>
              <h3 className="label">サイト表示の評価点</h3>
              <p className="text-stone-700">
                {program.reviewRating ?? "-"}
                {program.reviewCount != null && `（${program.reviewCount}件）`}
                {program.reviewCheckedAt && (
                  <span className="block text-xs text-stone-400">確認日: {formatDate(program.reviewCheckedAt)}</span>
                )}
              </p>
            </div>
          )}
          {program.bookingStatus && (
            <div>
              <h3 className="label">予約状況</h3>
              <p className="text-stone-700">{program.bookingStatus}</p>
            </div>
          )}
          {program.safetyManagement && (
            <div className="sm:col-span-2">
              <h3 className="label">安全管理体制</h3>
              <p className="text-stone-700 whitespace-pre-wrap">{program.safetyManagement}</p>
            </div>
          )}
          {program.cancellationPolicy && (
            <div className="sm:col-span-2">
              <h3 className="label">キャンセルポリシー</h3>
              <p className="text-stone-700 whitespace-pre-wrap">{program.cancellationPolicy}</p>
            </div>
          )}
          {source[0] && (
            <div>
              <h3 className="label">出典</h3>
              <Link href={`/sources/${source[0].id}`} className="text-river-600 hover:underline">
                {source[0].sourceName}
              </Link>
            </div>
          )}
          <div>
            <h3 className="label">最終確認日</h3>
            <p className="text-stone-700">{formatDate(program.lastCheckedAt)}</p>
          </div>
        </div>
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">価格（RAW FACT）</h2>
        {prices.length === 0 ? (
          <p className="text-sm text-stone-400">価格情報が登録されていません。</p>
        ) : (
          <div className="overflow-x-auto">
            <table className="w-full text-sm">
              <thead>
                <tr className="text-left text-xs text-stone-500 border-b border-stone-100">
                  <th className="pb-2 pr-4">種別</th>
                  <th className="pb-2 pr-4">金額</th>
                  <th className="pb-2 pr-4">単位</th>
                  <th className="pb-2 pr-4">区分</th>
                  <th className="pb-2 pr-4">補足</th>
                </tr>
              </thead>
              <tbody>
                {prices.map((p) => (
                  <tr key={p.id} className="border-b border-stone-50">
                    <td className="py-2 pr-4">
                      {p.courseName ? `${p.courseName}／` : ""}
                      {PRICE_TYPE_LABELS[p.priceType] ?? p.priceType}
                    </td>
                    <td className="py-2 pr-4 font-medium">{formatYen(p.amount)}</td>
                    <td className="py-2 pr-4 text-stone-500">{p.unit ?? "-"}</td>
                    <td className="py-2 pr-4 text-stone-500">
                      {p.isAncillary ? (
                        <span className="badge bg-amber-100 text-amber-800">
                          付随費用{p.isRequired ? "（必須）" : "（任意）"}
                        </span>
                      ) : (
                        <span className="badge bg-sky-100 text-sky-800">本体価格</span>
                      )}
                    </td>
                    <td className="py-2 pr-4 text-stone-500">
                      {[
                        p.conditionAgeMin != null || p.conditionAgeMax != null
                          ? `対象年齢${formatAgeRange(p.conditionAgeMin, p.conditionAgeMax)}`
                          : null,
                        p.residencyCondition,
                        p.target,
                        p.taxIncluded === false ? "税別" : null,
                        p.materialIncluded ? "材料費込" : null,
                        p.notes,
                      ]
                        .filter(Boolean)
                        .join(" ／ ")}
                    </td>
                  </tr>
                ))}
              </tbody>
            </table>
          </div>
        )}

        {estimate && (
          <div className="rounded-lg border border-sky-200 bg-sky-50 px-4 py-3 space-y-1">
            <p className="text-sm font-semibold text-sky-900">
              参考換算価格（1人あたり・体験本体のみ）: {formatYen(estimate.value)}
            </p>
            <p className="text-xs text-sky-700">
              換算根拠: {estimate.basis}
              　※これは正規化ロジックによる参考値であり、事実（RAW
              FACT）そのものではありません。付随費用は含みません。
            </p>
            {totalWithRequiredAncillary != null && (
              <p className="text-sm font-semibold text-amber-900 pt-1">
                必須付随費用を含めた参考顧客負担額: {formatYen(totalWithRequiredAncillary)}
                <span className="block text-xs font-normal text-amber-700">
                  体験本体（{formatYen(estimate.value)}）＋必須付随費用合計（{formatYen(requiredAncillaryTotal)}）。任意の付随費用（駐車場代等）は含みません。
                </span>
              </p>
            )}
          </div>
        )}
      </div>

      <div className="card p-6 space-y-4">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">MARKET_PROGRAM_ANALYSIS（解釈・INFERENCE）</h2>
        <MarketProgramAnalysisForm
          action={upsertMarketProgramAnalysisAction.bind(null, id)}
          defaults={
            analysis
              ? {
                  parentAppeal: analysis.parentAppeal,
                  childAppeal: analysis.childAppeal,
                  specialness: analysis.specialness,
                  educationalValue: analysis.educationalValue,
                  childReactionFromReviews: analysis.childReactionFromReviews,
                  safetyEvaluationFromReviews: analysis.safetyEvaluationFromReviews,
                  guideEvaluationFromReviews: analysis.guideEvaluationFromReviews,
                  learningValueFromReviews: analysis.learningValueFromReviews,
                  analyzedAt: formatDateTime(analysis.analyzedAt),
                }
              : undefined
          }
        />
      </div>

      <p className="text-xs text-stone-400">最終更新: {formatDateTime(program.updatedAt)}</p>
    </div>
  );
}
