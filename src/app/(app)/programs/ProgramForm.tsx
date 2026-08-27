"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { ProgramFormState } from "./actions";
import { useRetryFormKey, strValue, arrValue } from "@/lib/use-retry-form";
import { SEASONS, PROGRAM_STATUSES } from "@/db/schema";
import { SEASON_LABELS, PROGRAM_STATUS_LABELS } from "@/lib/constants";

type RegionOption = { id: string; name: string };

type Defaults = {
  regionId?: string;
  title?: string;
  concept?: string | null;
  targetAudience?: string | null;
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  marketNeeds?: string | null;
  whyChichibu?: string | null;
  experienceContent?: string | null;
  inquiryTheme?: string | null;
  participantQuestions?: string | null;
  seasons?: string[];
  durationMinutes?: number | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  recommendedPrice?: number | null;
  status?: string;
};

export function ProgramForm({
  action,
  regions,
  defaults,
  submitLabel,
}: {
  action: (state: ProgramFormState, formData: FormData) => Promise<ProgramFormState>;
  regions: RegionOption[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<ProgramFormState, FormData>(action, undefined);
  const router = useRouter();
  const formKey = useRetryFormKey(state);
  const v = state?.values;
  const num = (n: number | null | undefined) => (n == null ? "" : String(n));
  const selectedSeasons = new Set(arrValue(v, "seasons", defaults?.seasons ?? []));

  return (
    <form key={formKey} action={formAction} className="space-y-6">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="label">地域 *</label>
          <select name="regionId" required defaultValue={strValue(v, "regionId", defaults?.regionId ?? "")} className="input">
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
          <label className="label">ステータス</label>
          <select name="status" defaultValue={strValue(v, "status", defaults?.status ?? "IDEA")} className="input">
            {PROGRAM_STATUSES.map((s) => (
              <option key={s} value={s}>
                {PROGRAM_STATUS_LABELS[s]}
              </option>
            ))}
          </select>
        </div>
        <div className="sm:col-span-2">
          <label className="label">タイトル *</label>
          <input name="title" required defaultValue={strValue(v, "title", defaults?.title)} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">コンセプト</label>
          <textarea name="concept" rows={2} defaultValue={strValue(v, "concept", defaults?.concept ?? "")} className="input" />
        </div>
        <div>
          <label className="label">ターゲット層</label>
          <input name="targetAudience" defaultValue={strValue(v, "targetAudience", defaults?.targetAudience ?? "")} className="input" />
        </div>
        <div>
          <label className="label">市場ニーズ</label>
          <input name="marketNeeds" defaultValue={strValue(v, "marketNeeds", defaults?.marketNeeds ?? "")} className="input" />
        </div>
        <div>
          <label className="label">対象年齢</label>
          <div className="flex items-center gap-2">
            <input name="targetAgeMin" type="number" min={0} defaultValue={strValue(v, "targetAgeMin", num(defaults?.targetAgeMin))} className="input" placeholder="下限" />
            <span className="text-stone-400">〜</span>
            <input name="targetAgeMax" type="number" min={0} defaultValue={strValue(v, "targetAgeMax", num(defaults?.targetAgeMax))} className="input" placeholder="上限" />
          </div>
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
        <div className="sm:col-span-2">
          <label className="label">なぜこの地域か</label>
          <textarea name="whyChichibu" rows={2} defaultValue={strValue(v, "whyChichibu", defaults?.whyChichibu ?? "")} className="input" />
        </div>
        <div className="sm:col-span-2">
          <label className="label">体験内容</label>
          <textarea name="experienceContent" rows={3} defaultValue={strValue(v, "experienceContent", defaults?.experienceContent ?? "")} className="input" />
        </div>
        <div>
          <label className="label">探究テーマ</label>
          <input name="inquiryTheme" defaultValue={strValue(v, "inquiryTheme", defaults?.inquiryTheme ?? "")} className="input" />
        </div>
        <div>
          <label className="label">参加者への問いかけ</label>
          <input name="participantQuestions" defaultValue={strValue(v, "participantQuestions", defaults?.participantQuestions ?? "")} className="input" />
        </div>
        <div>
          <label className="label">所要時間（分）</label>
          <input name="durationMinutes" type="number" min={0} defaultValue={strValue(v, "durationMinutes", num(defaults?.durationMinutes))} className="input" />
        </div>
        <div>
          <label className="label">想定価格（1人あたり・円）</label>
          <input name="recommendedPrice" type="number" min={0} defaultValue={strValue(v, "recommendedPrice", num(defaults?.recommendedPrice))} className="input" />
        </div>
        <div>
          <label className="label">定員</label>
          <div className="flex items-center gap-2">
            <input name="capacityMin" type="number" min={0} defaultValue={strValue(v, "capacityMin", num(defaults?.capacityMin))} className="input" placeholder="下限" />
            <span className="text-stone-400">〜</span>
            <input name="capacityMax" type="number" min={0} defaultValue={strValue(v, "capacityMax", num(defaults?.capacityMax))} className="input" placeholder="上限" />
          </div>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
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
