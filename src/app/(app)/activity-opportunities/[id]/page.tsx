import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { activityOpportunities, resources, sources, users } from "@/db/schema";
import {
  FACT_STATUS_BADGE,
  FACT_STATUS_LABELS,
  PERMISSION_STATUS_LABELS,
  SEASON_LABELS,
} from "@/lib/constants";
import {
  formatAgeRange,
  formatDurationRange,
  formatGroupSizeRange,
  formatDateTime,
} from "@/lib/utils";
import { markFieldCheckedAction } from "../actions";
import { SampleBadge } from "@/components/SampleBadge";

export default async function ActivityOpportunityDetailPage({
  params,
}: {
  params: Promise<{ id: string }>;
}) {
  const { id } = await params;
  const [opp] = await db
    .select()
    .from(activityOpportunities)
    .where(eq(activityOpportunities.id, id))
    .limit(1);
  if (!opp) notFound();

  const [resource] = await db.select().from(resources).where(eq(resources.id, opp.primaryResourceId)).limit(1);
  const source = opp.sourceId
    ? (await db.select().from(sources).where(eq(sources.id, opp.sourceId)).limit(1))[0]
    : null;
  const fieldChecker = opp.fieldCheckedById
    ? (await db.select().from(users).where(eq(users.id, opp.fieldCheckedById)).limit(1))[0]
    : null;

  const markFieldChecked = markFieldCheckedAction.bind(null, id);

  return (
    <div className="max-w-3xl space-y-6">
      <div className="flex items-start justify-between gap-4 flex-wrap">
        <div>
          <div className="flex items-center gap-2 flex-wrap">
            <h1 className="text-2xl font-bold text-stone-900">{opp.title}</h1>
            <span className={`badge ${FACT_STATUS_BADGE[opp.factStatus]}`}>
              {FACT_STATUS_LABELS[opp.factStatus]}
            </span>
            {opp.fieldCheckedAt && <span className="badge bg-sky-100 text-sky-800">現地確認済み</span>}
            {opp.isSample && <SampleBadge />}
          </div>
          <p className="mt-1 text-sm text-stone-500">
            対象資源:{" "}
            {resource ? (
              <Link href={`/resources/${resource.id}`} className="text-river-600 hover:underline">
                {resource.name}
              </Link>
            ) : (
              "-"
            )}
          </p>
        </div>
        <Link href={`/activity-opportunities/${id}/edit`} className="btn btn-secondary">
          編集
        </Link>
      </div>

      {!opp.fieldCheckedAt && (
        <div className="card p-4 flex items-center justify-between gap-4 flex-wrap bg-amber-50 border-amber-200">
          <p className="text-sm text-amber-800">
            まだ現地確認されていません。現地で確認できたら記録してください（FACTへ引き上げる根拠になります）。
          </p>
          <form action={markFieldChecked}>
            <button type="submit" className="btn btn-secondary whitespace-nowrap">
              現地確認済みにする
            </button>
          </form>
        </div>
      )}
      {opp.fieldCheckedAt && (
        <p className="text-xs text-stone-500">
          現地確認日時: {formatDateTime(opp.fieldCheckedAt)}
          {fieldChecker && ` （確認者: ${fieldChecker.name}）`}
        </p>
      )}

      <div className="card p-6 space-y-4">
        {opp.description && <p className="text-sm text-stone-700 whitespace-pre-wrap">{opp.description}</p>}
        <div className="grid sm:grid-cols-2 gap-4 text-sm">
          <div>
            <h2 className="label">適正年齢</h2>
            <p className="text-stone-700">{formatAgeRange(opp.appropriateAgeMin, opp.appropriateAgeMax)}</p>
          </div>
          <div>
            <h2 className="label">必要人数</h2>
            <p className="text-stone-700">{formatGroupSizeRange(opp.requiredGroupSizeMin, opp.requiredGroupSizeMax)}</p>
          </div>
          <div>
            <h2 className="label">所要時間</h2>
            <p className="text-stone-700">{formatDurationRange(opp.durationMinutesMin, opp.durationMinutesMax)}</p>
          </div>
          <div>
            <h2 className="label">季節</h2>
            <p className="text-stone-700">
              {opp.seasons.length > 0 ? opp.seasons.map((s) => SEASON_LABELS[s]).join("・") : "未設定"}
            </p>
          </div>
          {opp.requiredEquipment.length > 0 && (
            <div>
              <h2 className="label">必要装備</h2>
              <p className="text-stone-700">{opp.requiredEquipment.join("、")}</p>
            </div>
          )}
          <div>
            <h2 className="label">利用許可</h2>
            <p className="text-stone-700">
              {opp.permissionRequired == null ? "未確認" : opp.permissionRequired ? "必要" : "不要"}
              {opp.permissionRequiredFrom && `（許可先: ${opp.permissionRequiredFrom}）`}
              {opp.permissionStatus && ` ／ ${PERMISSION_STATUS_LABELS[opp.permissionStatus]}`}
            </p>
          </div>
          <div>
            <h2 className="label">ガイド要否</h2>
            <p className="text-stone-700">{opp.needsGuide == null ? "未確認" : opp.needsGuide ? "必要" : "不要"}</p>
          </div>
          {opp.safetyRisks && (
            <div className="sm:col-span-2">
              <h2 className="label">安全リスク</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{opp.safetyRisks}</p>
            </div>
          )}
          {opp.rainPolicy && (
            <div>
              <h2 className="label">雨天時の扱い</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{opp.rainPolicy}</p>
            </div>
          )}
          {opp.accessNotes && (
            <div>
              <h2 className="label">アクセスメモ</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{opp.accessNotes}</p>
            </div>
          )}
          {opp.collaboratorsNote && (
            <div className="sm:col-span-2">
              <h2 className="label">協力者メモ</h2>
              <p className="text-stone-700 whitespace-pre-wrap">{opp.collaboratorsNote}</p>
            </div>
          )}
          {opp.confidence != null && (
            <div>
              <h2 className="label">確信度</h2>
              <p className="text-stone-700">{opp.confidence}</p>
            </div>
          )}
          {source && (
            <div>
              <h2 className="label">出典</h2>
              <Link href={`/sources/${source.id}`} className="text-river-600 hover:underline">
                {source.sourceName}
              </Link>
            </div>
          )}
        </div>
        {opp.tags.length > 0 && (
          <p className="text-xs text-river-700">{opp.tags.map((t) => `#${t}`).join(" ")}</p>
        )}
        <p className="text-xs text-stone-400">最終更新: {formatDateTime(opp.updatedAt)}</p>
      </div>
    </div>
  );
}
