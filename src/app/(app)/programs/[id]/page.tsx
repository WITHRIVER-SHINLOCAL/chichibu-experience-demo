import Link from "next/link";
import { notFound } from "next/navigation";
import { desc, eq } from "drizzle-orm";
import { db } from "@/db";
import {
  programs,
  regions,
  users,
  programActivityOpportunities,
  activityOpportunities,
  programResources,
  resources,
  itineraries,
  programWizardLogs,
  programFeedback,
} from "@/db/schema";
import {
  PROGRAM_STATUS_BADGE,
  PROGRAM_STATUS_LABELS,
  SEASON_LABELS,
  FACT_STATUS_BADGE,
  FACT_STATUS_LABELS,
  CATEGORY_LABELS,
  EASE_RATING_BADGE,
  EASE_RATING_LABELS,
  IDEATION_COUNTERFACTUAL_BADGE,
  IDEATION_COUNTERFACTUAL_LABELS,
  DEMO_PROGRAM_ID,
} from "@/lib/constants";
import { formatAgeRange, formatDurationRange, formatYen, formatDateTime } from "@/lib/utils";
import {
  deleteProgramActivityOpportunityAction,
  deleteProgramResourceAction,
  createProgramFeedbackAction,
} from "../actions";
import { FeedbackForm } from "./FeedbackForm";

export default async function ProgramDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [program] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!program) notFound();

  const [region, owner, opportunityLinks, resourceLinks, itinerary, wizardLog] = await Promise.all([
    db.select().from(regions).where(eq(regions.id, program.regionId)).limit(1),
    program.ownerId ? db.select().from(users).where(eq(users.id, program.ownerId)).limit(1) : Promise.resolve([]),
    db
      .select({ link: programActivityOpportunities, opp: activityOpportunities })
      .from(programActivityOpportunities)
      .innerJoin(activityOpportunities, eq(programActivityOpportunities.activityOpportunityId, activityOpportunities.id))
      .where(eq(programActivityOpportunities.programId, id))
      .orderBy(programActivityOpportunities.sortOrder),
    db
      .select({ link: programResources, resource: resources })
      .from(programResources)
      .innerJoin(resources, eq(programResources.resourceId, resources.id))
      .where(eq(programResources.programId, id))
      .orderBy(programResources.sortOrder),
    db.select().from(itineraries).where(eq(itineraries.programId, id)).limit(1),
    db
      .select()
      .from(programWizardLogs)
      .where(eq(programWizardLogs.programId, id))
      .orderBy(desc(programWizardLogs.createdAt))
      .limit(1),
  ]);

  const feedbackRows = await db
    .select({ fb: programFeedback, userName: users.name })
    .from(programFeedback)
    .leftJoin(users, eq(programFeedback.createdById, users.id))
    .where(eq(programFeedback.programId, id))
    .orderBy(desc(programFeedback.createdAt));

  const STEP_LABELS: Record<string, string> = {
    "1": "① 条件入力",
    "2": "② 市場インサイト",
    "3": "③ 地域資源探索",
    "4": "④ 関連性探索",
    "5": "⑤ 体験素材選択",
    "6": "⑥ 企画作成・保存",
  };
  let stepDurations: Record<string, number> = {};
  if (wizardLog[0]) {
    try {
      stepDurations = JSON.parse(wizardLog[0].stepDurationsJson);
    } catch {
      stepDurations = {};
    }
  }

  const deleteOpp = deleteProgramActivityOpportunityAction.bind(null, id);
  const deleteRes = deleteProgramResourceAction.bind(null, id);
  const feedbackAction = createProgramFeedbackAction.bind(null, id);
  const isDemoProgram = id === DEMO_PROGRAM_ID;

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">{program.title}</h1>
            <span className={`badge ${PROGRAM_STATUS_BADGE[program.status]}`}>
              {PROGRAM_STATUS_LABELS[program.status]}
            </span>
            <span className={`badge ${FACT_STATUS_BADGE[program.factStatus]}`}>
              {FACT_STATUS_LABELS[program.factStatus]}
            </span>
            {isDemoProgram && (
              <span className="badge bg-river-600 text-white font-bold tracking-wide">DEMO</span>
            )}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            {region[0]?.name ?? "-"} ／ 担当: {owner[0]?.name ?? "未設定"}
          </p>
        </div>
        <div className="flex flex-col items-end gap-1.5">
          <div className="flex gap-2">
            <Link href={`/programs/${id}/ai-review`} className="btn btn-primary">
              AIで商品を磨く
            </Link>
            <Link href={`/programs/${id}/itinerary`} className="btn btn-secondary">
              行程表
            </Link>
            <Link href={`/programs/${id}/edit`} className="btn btn-secondary">
              編集
            </Link>
          </div>
          {isDemoProgram && (
            <p className="text-[11px] text-stone-500 max-w-xs text-right">
              このPROGRAMはデモ用の中心企画です。「AIで商品を磨く」では、保存済みの無料ドライラン結果（診断・不足FACT・市場比較・改善IDEA・Experience
              Design Review・Product Draft）を確認できます。
            </p>
          )}
        </div>
      </div>

      <div className="card p-6 space-y-4">
        {program.concept && <p className="text-sm text-stone-700 whitespace-pre-wrap">{program.concept}</p>}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          {program.targetAudience && (
            <div>
              <h2 className="label">ターゲット層</h2>
              <p className="text-stone-700">{program.targetAudience}</p>
            </div>
          )}
          <div>
            <h2 className="label">対象年齢</h2>
            <p className="text-stone-700">{formatAgeRange(program.targetAgeMin, program.targetAgeMax)}</p>
          </div>
          <div>
            <h2 className="label">季節</h2>
            <p className="text-stone-700">
              {program.seasons.length > 0 ? program.seasons.map((s) => SEASON_LABELS[s]).join("・") : "未設定"}
            </p>
          </div>
          <div>
            <h2 className="label">所要時間</h2>
            <p className="text-stone-700">{formatDurationRange(program.durationMinutes, program.durationMinutes)}</p>
          </div>
          <div>
            <h2 className="label">想定価格（1人あたり）</h2>
            <p className="text-stone-700">{formatYen(program.recommendedPrice)}</p>
          </div>
          {program.marketNeeds && (
            <div className="sm:col-span-2">
              <h2 className="label">市場ニーズ</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{program.marketNeeds}</p>
            </div>
          )}
          {program.whyChichibu && (
            <div className="sm:col-span-2">
              <h2 className="label">なぜこの地域か</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{program.whyChichibu}</p>
            </div>
          )}
          {program.experienceContent && (
            <div className="sm:col-span-2">
              <h2 className="label">体験内容</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{program.experienceContent}</p>
            </div>
          )}
          {program.inquiryTheme && (
            <div>
              <h2 className="label">探究テーマ</h2>
              <p className="text-stone-700">{program.inquiryTheme}</p>
            </div>
          )}
          {program.participantQuestions && (
            <div>
              <h2 className="label">参加者への問いかけ</h2>
              <p className="text-stone-700">{program.participantQuestions}</p>
            </div>
          )}
        </div>
        <p className="text-xs text-stone-400">最終更新: {formatDateTime(program.updatedAt)}</p>
      </div>

      {wizardLog[0] && (
        <div className="card p-5 bg-fuchsia-50 border-fuchsia-200">
          <h2 className="text-sm font-bold text-fuchsia-700 tracking-wide mb-2">
            MVP検証ログ: 企画作成にかかった時間（開発用・正式機能ではありません）
          </h2>
          <p className="text-sm text-stone-700">
            合計 <span className="font-bold">{Math.floor(wizardLog[0].totalSeconds / 60)}分{wizardLog[0].totalSeconds % 60}秒</span>
            （開始: {formatDateTime(wizardLog[0].startedAt)} ／ 保存: {formatDateTime(wizardLog[0].savedAt)}）
          </p>
          <ul className="mt-2 grid sm:grid-cols-2 gap-x-6 gap-y-1 text-xs text-stone-600">
            {Object.entries(stepDurations)
              .sort(([a], [b]) => Number(a) - Number(b))
              .map(([stepNum, seconds]) => (
                <li key={stepNum} className="flex items-center justify-between">
                  <span>{STEP_LABELS[stepNum] ?? `STEP${stepNum}`}</span>
                  <span className="font-semibold text-stone-900">
                    {Math.floor(seconds / 60)}分{seconds % 60}秒
                  </span>
                </li>
              ))}
          </ul>
        </div>
      )}

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">使用する体験機会（{opportunityLinks.length}件）</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {opportunityLinks.length === 0 && (
            <li className="px-5 py-4 text-sm text-stone-400">体験機会が紐付けられていません。</li>
          )}
          {opportunityLinks.map(({ link, opp }) => (
            <li key={link.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/activity-opportunities/${opp.id}`} className="min-w-0 flex-1">
                <p className="text-sm font-medium text-stone-900">{opp.title}</p>
                <p className="text-xs text-stone-500">
                  対象年齢: {formatAgeRange(opp.appropriateAgeMin, opp.appropriateAgeMax)} ／ 所要時間:{" "}
                  {formatDurationRange(opp.durationMinutesMin, opp.durationMinutesMax)}
                </p>
              </Link>
              <form action={deleteOpp.bind(null, link.id)}>
                <button type="submit" className="text-xs text-red-600 hover:underline shrink-0">
                  外す
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="card">
        <div className="px-5 py-4 border-b border-stone-100">
          <h2 className="font-semibold text-stone-900">関連する地域資源（{resourceLinks.length}件）</h2>
        </div>
        <ul className="divide-y divide-stone-100">
          {resourceLinks.length === 0 && (
            <li className="px-5 py-4 text-sm text-stone-400">地域資源が紐付けられていません。</li>
          )}
          {resourceLinks.map(({ link, resource }) => (
            <li key={link.id} className="flex items-center justify-between gap-3 px-5 py-3">
              <Link href={`/resources/${resource.id}`} className="min-w-0 flex-1">
                <span className="badge bg-stone-100 text-stone-700 mr-2">{CATEGORY_LABELS[resource.category]}</span>
                <span className="text-sm font-medium text-stone-900">{resource.name}</span>
              </Link>
              <form action={deleteRes.bind(null, link.id)}>
                <button type="submit" className="text-xs text-red-600 hover:underline shrink-0">
                  外す
                </button>
              </form>
            </li>
          ))}
        </ul>
      </div>

      <div className="card p-5 flex items-center justify-between">
        <div>
          <h2 className="font-semibold text-stone-900">行程表</h2>
          <p className="text-xs text-stone-500">
            {itinerary[0] ? "行程表が作成されています。" : "まだ行程表が作成されていません。"}
          </p>
        </div>
        <Link href={`/programs/${id}/itinerary`} className="btn btn-secondary">
          行程表を{itinerary[0] ? "編集" : "作成"}する
        </Link>
      </div>

      <div className="card p-5 space-y-5 bg-fuchsia-50 border-fuchsia-200">
        <div>
          <h2 className="text-sm font-bold text-fuchsia-700 tracking-wide">
            MVP検証フィードバック（開発用・正式機能ではありません）
          </h2>
          <p className="mt-1 text-xs text-stone-500">
            この企画を作ってみて感じたことを残してください。Phase 2の優先順位づけに使います。
          </p>
        </div>
        <FeedbackForm action={feedbackAction} />
        {feedbackRows.length > 0 && (
          <div className="space-y-3 pt-3 border-t border-fuchsia-200">
            <h3 className="text-xs font-bold text-stone-500">これまでのフィードバック（{feedbackRows.length}件）</h3>
            {feedbackRows.map(({ fb, userName }) => (
              <div key={fb.id} className="rounded-lg bg-white border border-stone-200 p-3 text-sm space-y-1.5">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${EASE_RATING_BADGE[fb.easeRating]}`}>
                    {EASE_RATING_LABELS[fb.easeRating]}
                  </span>
                  <span
                    className={`badge ${IDEATION_COUNTERFACTUAL_BADGE[fb.ideationCounterfactual]}`}
                  >
                    未使用なら: {IDEATION_COUNTERFACTUAL_LABELS[fb.ideationCounterfactual]}
                  </span>
                  <span className="text-xs text-stone-400">
                    {userName ?? "不明"} ／ {formatDateTime(fb.createdAt)}
                  </span>
                </div>
                {fb.confusionPoints && (
                  <p className="text-xs text-stone-600">
                    <span className="font-semibold">迷った点:</span> {fb.confusionPoints}
                  </p>
                )}
                {fb.missingInfo && (
                  <p className="text-xs text-stone-600">
                    <span className="font-semibold">足りなかった情報:</span> {fb.missingInfo}
                  </p>
                )}
                {fb.unnecessaryInfo && (
                  <p className="text-xs text-stone-600">
                    <span className="font-semibold">不要だった情報:</span> {fb.unnecessaryInfo}
                  </p>
                )}
              </div>
            ))}
          </div>
        )}
      </div>
    </div>
  );
}
