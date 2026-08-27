"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import type { ActivityOpportunityFormState } from "./actions";
import {
  FACT_STATUS_LABELS,
  FACT_STATUS_DESCRIPTIONS,
  PERMISSION_STATUS_LABELS,
  SEASON_LABELS,
} from "@/lib/constants";
import { FACT_STATUSES, PERMISSION_STATUSES, SEASONS } from "@/db/schema";
import { useRetryFormKey, strValue, arrValue } from "@/lib/use-retry-form";

type ResourceOption = { id: string; name: string };
type SourceOption = { id: string; sourceName: string };

type Defaults = {
  primaryResourceId?: string;
  title?: string;
  description?: string | null;
  requiredGroupSizeMin?: number | null;
  requiredGroupSizeMax?: number | null;
  appropriateAgeMin?: number | null;
  appropriateAgeMax?: number | null;
  durationMinutesMin?: number | null;
  durationMinutesMax?: number | null;
  requiredEquipment?: string[];
  permissionRequired?: boolean | null;
  permissionRequiredFrom?: string | null;
  permissionStatus?: string | null;
  safetyRisks?: string | null;
  seasons?: string[];
  rainPolicy?: string | null;
  needsGuide?: boolean | null;
  collaboratorsNote?: string | null;
  accessNotes?: string | null;
  tags?: string[];
  factStatus?: string;
  confidence?: number | null;
  sourceId?: string | null;
};

export function ActivityOpportunityForm({
  action,
  resources,
  sources,
  defaults,
  submitLabel,
  canUseFactWithoutFieldCheck,
}: {
  action: (state: ActivityOpportunityFormState, formData: FormData) => Promise<ActivityOpportunityFormState>;
  resources: ResourceOption[];
  sources: SourceOption[];
  defaults?: Defaults;
  submitLabel: string;
  canUseFactWithoutFieldCheck?: boolean;
}) {
  const [state, formAction, pending] = useActionState<ActivityOpportunityFormState, FormData>(
    action,
    undefined
  );
  const router = useRouter();
  const formKey = useRetryFormKey(state);
  const v = state?.values;
  const selectedSeasons = new Set(arrValue(v, "seasons", defaults?.seasons ?? []));
  const boolToStr = (b: boolean | null | undefined) => (b == null ? "" : String(b));
  const num = (n: number | null | undefined) => (n == null ? "" : String(n));

  // 確度セレクトの説明文を「今選ばれている値」に追従させるための表示用state。
  // フォーム自体は非制御のまま（retry-keyパターンと共存させるため）。
  const [factStatusForHint, setFactStatusForHint] = useState(
    strValue(v, "factStatus", defaults?.factStatus ?? "IDEA")
  );

  return (
    <form key={formKey} action={formAction} className="space-y-8">
      <div className="rounded-lg border border-river-200 bg-river-50 px-4 py-3 text-xs text-stone-700 space-y-1">
        <p className="font-semibold text-river-700">
          必須は「名称」「対象資源」「確度」の3つだけです。
        </p>
        <p>
          その他はすべて任意です。まずはアイデアの段階で登録し、現地確認や出典確認が進んだタイミングで
          少しずつ埋めていく使い方を想定しています。分からない項目は空欄のままで構いません。
        </p>
      </div>

      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        「できそう」という段階の推測は<strong>IDEA</strong>または<strong>INFERENCE</strong>
        として登録してください。<strong>FACT</strong>
        にできるのは、出典で確認済み、または現地確認済みの場合のみです
        {canUseFactWithoutFieldCheck === false &&
          "（この体験機会はまだ現地確認されていません。FACTにするには出典を紐付けてください）"}
        。
      </div>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">
          基本情報 <span className="ml-1 font-normal text-stone-400">（<span className="text-red-500">*</span> 印のみ必須）</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">
              名称 <span className="text-red-500">*</span>
            </label>
            <input
              id="title"
              name="title"
              required
              defaultValue={strValue(v, "title", defaults?.title)}
              className="input"
              placeholder="例：河原で石を観察できる（「〜できる」の形で書くと分かりやすい）"
            />
          </div>
          <div>
            <label className="label" htmlFor="primaryResourceId">
              対象資源 <span className="text-red-500">*</span>
            </label>
            <select
              id="primaryResourceId"
              name="primaryResourceId"
              required
              defaultValue={strValue(v, "primaryResourceId", defaults?.primaryResourceId ?? "")}
              className="input"
            >
              <option value="" disabled>
                選択してください
              </option>
              {resources.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">
              説明
            </label>
            <textarea
              id="description"
              name="description"
              rows={2}
              defaultValue={strValue(v, "description", defaults?.description ?? "")}
              className="input"
              placeholder="例：荒川の河原で石を拾い、上流・下流での丸みの違いなどを観察する。"
            />
          </div>
          <div>
            <label className="label" htmlFor="tags">
              タグ（カンマ区切り）
            </label>
            <input
              id="tags"
              name="tags"
              defaultValue={strValue(v, "tags", (defaults?.tags ?? []).join("、"))}
              className="input"
              placeholder="例：水辺、観察、ジオ"
            />
          </div>
          <div>
            <label className="label">季節</label>
            <div className="flex flex-wrap gap-3 pt-1">
              {SEASONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm text-stone-700">
                  <input type="checkbox" name="seasons" value={s} defaultChecked={selectedSeasons.has(s)} />
                  {SEASON_LABELS[s]}
                </label>
              ))}
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">
          対象・規模・所要時間
          <span className="ml-2 badge bg-stone-100 text-stone-500 font-normal">すべて任意・分かる範囲でOK</span>
        </h2>
        <p className="text-xs text-stone-400 -mt-3">
          企画作成ウィザードの絞り込み（年齢・所要時間・季節）に使われるため、分かっている場合は入れておくと後で役立ちます。
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label">適正年齢</label>
            <div className="flex items-center gap-2">
              <input
                name="appropriateAgeMin"
                type="number"
                min={0}
                defaultValue={strValue(v, "appropriateAgeMin", num(defaults?.appropriateAgeMin))}
                className="input"
                placeholder="下限"
              />
              <span className="text-stone-400">〜</span>
              <input
                name="appropriateAgeMax"
                type="number"
                min={0}
                defaultValue={strValue(v, "appropriateAgeMax", num(defaults?.appropriateAgeMax))}
                className="input"
                placeholder="上限"
              />
            </div>
          </div>
          <div>
            <label className="label">必要人数</label>
            <div className="flex items-center gap-2">
              <input
                name="requiredGroupSizeMin"
                type="number"
                min={0}
                defaultValue={strValue(v, "requiredGroupSizeMin", num(defaults?.requiredGroupSizeMin))}
                className="input"
                placeholder="下限"
              />
              <span className="text-stone-400">〜</span>
              <input
                name="requiredGroupSizeMax"
                type="number"
                min={0}
                defaultValue={strValue(v, "requiredGroupSizeMax", num(defaults?.requiredGroupSizeMax))}
                className="input"
                placeholder="上限"
              />
            </div>
          </div>
          <div>
            <label className="label">所要時間（分）</label>
            <div className="flex items-center gap-2">
              <input
                name="durationMinutesMin"
                type="number"
                min={0}
                defaultValue={strValue(v, "durationMinutesMin", num(defaults?.durationMinutesMin))}
                className="input"
                placeholder="下限"
              />
              <span className="text-stone-400">〜</span>
              <input
                name="durationMinutesMax"
                type="number"
                min={0}
                defaultValue={strValue(v, "durationMinutesMax", num(defaults?.durationMinutesMax))}
                className="input"
                placeholder="上限"
              />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="requiredEquipment">
              必要装備（カンマ区切り）
            </label>
            <input
              id="requiredEquipment"
              name="requiredEquipment"
              defaultValue={strValue(v, "requiredEquipment", (defaults?.requiredEquipment ?? []).join("、"))}
              className="input"
              placeholder="例：長靴、軍手"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">
          許可・安全・実施条件
          <span className="ml-2 badge bg-stone-100 text-stone-500 font-normal">すべて任意・分かる範囲でOK</span>
        </h2>
        <p className="text-xs text-stone-400 -mt-3">
          現地確認や関係者への相談で分かったことを記録する欄です。登録時点で埋まっていなくても問題ありません。
        </p>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="permissionRequired">
              利用許可の要否
            </label>
            <select
              id="permissionRequired"
              name="permissionRequired"
              defaultValue={strValue(v, "permissionRequired", boolToStr(defaults?.permissionRequired))}
              className="input"
            >
              <option value="">未確認</option>
              <option value="true">必要</option>
              <option value="false">不要</option>
            </select>
          </div>
          <div>
            <label className="label" htmlFor="permissionRequiredFrom">
              許可先
            </label>
            <input
              id="permissionRequiredFrom"
              name="permissionRequiredFrom"
              defaultValue={strValue(v, "permissionRequiredFrom", defaults?.permissionRequiredFrom ?? "")}
              className="input"
              placeholder="例：河川管理者（県）、土地所有者"
            />
          </div>
          <div>
            <label className="label" htmlFor="permissionStatus">
              許可の状況
            </label>
            <select
              id="permissionStatus"
              name="permissionStatus"
              defaultValue={strValue(v, "permissionStatus", defaults?.permissionStatus ?? "")}
              className="input"
            >
              <option value="">未設定</option>
              {PERMISSION_STATUSES.map((s) => (
                <option key={s} value={s}>
                  {PERMISSION_STATUS_LABELS[s]}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="needsGuide">
              ガイド要否
            </label>
            <select
              id="needsGuide"
              name="needsGuide"
              defaultValue={strValue(v, "needsGuide", boolToStr(defaults?.needsGuide))}
              className="input"
            >
              <option value="">未確認</option>
              <option value="true">必要</option>
              <option value="false">不要</option>
            </select>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="safetyRisks">
              安全リスク
            </label>
            <textarea
              id="safetyRisks"
              name="safetyRisks"
              rows={2}
              defaultValue={strValue(v, "safetyRisks", defaults?.safetyRisks ?? "")}
              className="input"
              placeholder="例：増水時は河原に近づけない。滑りやすい石があるため長靴必須。"
            />
          </div>
          <div>
            <label className="label" htmlFor="rainPolicy">
              雨天時の扱い
            </label>
            <textarea
              id="rainPolicy"
              name="rainPolicy"
              rows={2}
              defaultValue={strValue(v, "rainPolicy", defaults?.rainPolicy ?? "")}
              className="input"
              placeholder="例：小雨決行。増水時は屋内の石の標本観察に変更。"
            />
          </div>
          <div>
            <label className="label" htmlFor="accessNotes">
              アクセスに関するメモ
            </label>
            <textarea
              id="accessNotes"
              name="accessNotes"
              rows={2}
              defaultValue={strValue(v, "accessNotes", defaults?.accessNotes ?? "")}
              className="input"
              placeholder="例：西武秩父駅から車で10分。駐車スペース5台分。"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="collaboratorsNote">
              協力者メモ
            </label>
            <textarea
              id="collaboratorsNote"
              name="collaboratorsNote"
              rows={2}
              defaultValue={strValue(v, "collaboratorsNote", defaults?.collaboratorsNote ?? "")}
              className="input"
              placeholder="例：地元ガイドの〇〇さんに相談済み。器材は△△商店で借りられる。"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">
          事実確度（FACT / INFERENCE / IDEA）
          <span className="ml-2 badge bg-stone-100 text-stone-500 font-normal">確度のみ必須・迷ったらIDEA</span>
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="factStatus">
              確度 <span className="text-red-500">*</span>
            </label>
            <select
              id="factStatus"
              name="factStatus"
              required
              defaultValue={strValue(v, "factStatus", defaults?.factStatus ?? "IDEA")}
              onChange={(e) => setFactStatusForHint(e.target.value)}
              className="input"
            >
              {FACT_STATUSES.map((f) => (
                <option key={f} value={f}>
                  {FACT_STATUS_LABELS[f]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400">{FACT_STATUS_DESCRIPTIONS[factStatusForHint]}</p>
          </div>
          <div>
            <label className="label" htmlFor="confidence">
              確信度（0〜100）
            </label>
            <input
              id="confidence"
              name="confidence"
              type="number"
              min={0}
              max={100}
              defaultValue={strValue(v, "confidence", num(defaults?.confidence))}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sourceId">
              出典（任意。FACTにする場合は出典または現地確認が必要）
            </label>
            <select id="sourceId" name="sourceId" defaultValue={strValue(v, "sourceId", defaults?.sourceId ?? "")} className="input">
              <option value="">なし</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sourceName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "保存中..." : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          キャンセル
        </button>
      </div>
    </form>
  );
}
