"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { ResourceFormState } from "./actions";
import { CATEGORY_LABELS, FACT_STATUS_LABELS, FACT_STATUS_DESCRIPTIONS, SEASON_LABELS } from "@/lib/constants";
import { RESOURCE_CATEGORIES, FACT_STATUSES, SEASONS } from "@/db/schema";
import { useRetryFormKey, strValue, arrValue } from "@/lib/use-retry-form";

type RegionOption = { id: string; name: string };

type Defaults = {
  regionId?: string;
  category?: string;
  name?: string;
  summary?: string | null;
  background?: string | null;
  history?: string | null;
  seasons?: string[];
  targetAge?: string | null;
  educationTheme?: string | null;
  experiencePotentialNote?: string | null;
  ownerManager?: string | null;
  collaborators?: string | null;
  url?: string | null;
  lat?: number | null;
  lng?: number | null;
  safetyNotes?: string | null;
  rainPolicy?: string | null;
  priceInfo?: string | null;
  tags?: string[];
  memo?: string | null;
  factStatus?: string;
  confidence?: number | null;
};

export function ResourceForm({
  action,
  regions,
  defaults,
  submitLabel,
}: {
  action: (state: ResourceFormState, formData: FormData) => Promise<ResourceFormState>;
  regions: RegionOption[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ResourceFormState, FormData>(
    action,
    undefined
  );
  const router = useRouter();
  const formKey = useRetryFormKey(state);
  const v = state?.values;
  const selectedSeasons = new Set(arrValue(v, "seasons", defaults?.seasons ?? []));
  const num = (n: number | null | undefined) => (n == null ? "" : String(n));

  return (
    <form key={formKey} action={formAction} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">基本情報</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="name">
              資源名 <span className="text-red-500">*</span>
            </label>
            <input
              id="name"
              name="name"
              required
              defaultValue={strValue(v, "name", defaults?.name)}
              className="input"
              placeholder="例：荒川"
            />
          </div>

          <div>
            <label className="label" htmlFor="regionId">
              地域 <span className="text-red-500">*</span>
            </label>
            <select
              id="regionId"
              name="regionId"
              required
              defaultValue={strValue(v, "regionId", defaults?.regionId ?? "")}
              className="input"
            >
              <option value="" disabled>
                選択してください
              </option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>

          <div>
            <label className="label" htmlFor="category">
              カテゴリー <span className="text-red-500">*</span>
            </label>
            <select
              id="category"
              name="category"
              required
              defaultValue={strValue(v, "category", defaults?.category ?? "")}
              className="input"
            >
              <option value="" disabled>
                選択してください
              </option>
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
          </div>

          <div className="sm:col-span-2">
            <label className="label" htmlFor="summary">
              概要
            </label>
            <textarea
              id="summary"
              name="summary"
              rows={2}
              defaultValue={strValue(v, "summary", defaults?.summary ?? "")}
              className="input"
              placeholder="この資源がどんなものか、一言で"
            />
          </div>

          <div>
            <label className="label">季節</label>
            <div className="flex flex-wrap gap-3 pt-1">
              {SEASONS.map((s) => (
                <label key={s} className="flex items-center gap-1.5 text-sm text-stone-700">
                  <input
                    type="checkbox"
                    name="seasons"
                    value={s}
                    defaultChecked={selectedSeasons.has(s)}
                  />
                  {SEASON_LABELS[s]}
                </label>
              ))}
            </div>
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
              placeholder="例：川、水質、生き物"
            />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">
          事実確度（FACT / INFERENCE / IDEA）
        </h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="factStatus">
              この資源の基本情報の確度 <span className="text-red-500">*</span>
            </label>
            <select
              id="factStatus"
              name="factStatus"
              required
              defaultValue={strValue(v, "factStatus", defaults?.factStatus ?? "INFERENCE")}
              className="input"
            >
              {FACT_STATUSES.map((f) => (
                <option key={f} value={f}>
                  {FACT_STATUS_LABELS[f]}
                </option>
              ))}
            </select>
            <p className="mt-1 text-xs text-stone-400">
              {FACT_STATUS_DESCRIPTIONS[defaults?.factStatus ?? "INFERENCE"]}
              　※存在・名称・位置など客観的な基本情報が出典や現地確認で裏付けられている場合のみFACTにしてください。
            </p>
          </div>
          <div>
            <label className="label" htmlFor="confidence">
              確信度（0〜100、INFERENCEの場合の目安）
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
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">詳細情報</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="background">
              背景
            </label>
            <textarea
              id="background"
              name="background"
              rows={2}
              defaultValue={strValue(v, "background", defaults?.background ?? "")}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="history">
              歴史
            </label>
            <textarea
              id="history"
              name="history"
              rows={2}
              defaultValue={strValue(v, "history", defaults?.history ?? "")}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="targetAge">
              想定対象年齢
            </label>
            <input
              id="targetAge"
              name="targetAge"
              defaultValue={strValue(v, "targetAge", defaults?.targetAge ?? "")}
              className="input"
              placeholder="例：小学生以上"
            />
          </div>
          <div>
            <label className="label" htmlFor="educationTheme">
              教育テーマ
            </label>
            <input
              id="educationTheme"
              name="educationTheme"
              defaultValue={strValue(v, "educationTheme", defaults?.educationTheme ?? "")}
              className="input"
              placeholder="例：水循環、地域産業"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="experiencePotentialNote">
              体験可能性メモ（走り書き。正式な体験可能性はACTIVITY OPPORTUNITYで管理）
            </label>
            <textarea
              id="experiencePotentialNote"
              name="experiencePotentialNote"
              rows={2}
              defaultValue={strValue(v, "experiencePotentialNote", defaults?.experiencePotentialNote ?? "")}
              className="input"
              placeholder="例：河原で石を観察できそう、水質調査ができそう　※これは推測メモであり、体験機会として正式に扱うにはACTIVITY OPPORTUNITYへ"
            />
          </div>
          <div>
            <label className="label" htmlFor="ownerManager">
              所有者・管理者
            </label>
            <input
              id="ownerManager"
              name="ownerManager"
              defaultValue={strValue(v, "ownerManager", defaults?.ownerManager ?? "")}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="collaborators">
              協力者
            </label>
            <input
              id="collaborators"
              name="collaborators"
              defaultValue={strValue(v, "collaborators", defaults?.collaborators ?? "")}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="url">
              参考URL
            </label>
            <input
              id="url"
              name="url"
              defaultValue={strValue(v, "url", defaults?.url ?? "")}
              className="input"
              placeholder="https://..."
            />
          </div>
          <div>
            <label className="label" htmlFor="lat">
              緯度
            </label>
            <input
              id="lat"
              name="lat"
              type="number"
              step="any"
              defaultValue={strValue(v, "lat", num(defaults?.lat))}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="lng">
              経度
            </label>
            <input
              id="lng"
              name="lng"
              type="number"
              step="any"
              defaultValue={strValue(v, "lng", num(defaults?.lng))}
              className="input"
            />
          </div>
          <div>
            <label className="label" htmlFor="safetyNotes">
              安全上の注意
            </label>
            <textarea
              id="safetyNotes"
              name="safetyNotes"
              rows={2}
              defaultValue={strValue(v, "safetyNotes", defaults?.safetyNotes ?? "")}
              className="input"
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
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="priceInfo">
              価格情報（参考）
            </label>
            <input
              id="priceInfo"
              name="priceInfo"
              defaultValue={strValue(v, "priceInfo", defaults?.priceInfo ?? "")}
              className="input"
            />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="memo">
              その他メモ
            </label>
            <textarea
              id="memo"
              name="memo"
              rows={2}
              defaultValue={strValue(v, "memo", defaults?.memo ?? "")}
              className="input"
            />
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
