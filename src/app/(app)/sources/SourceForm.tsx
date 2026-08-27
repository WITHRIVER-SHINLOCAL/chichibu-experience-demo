"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { SourceFormState } from "./actions";
import { RELIABILITY_GRADE_LABELS, SOURCE_TYPE_LABELS } from "@/lib/constants";
import { RELIABILITY_GRADES, SOURCE_TYPES } from "@/db/schema";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

type Defaults = {
  sourceName?: string;
  sourceUrl?: string | null;
  organization?: string | null;
  sourceType?: string;
  reliabilityGrade?: string;
  publishedAt?: string | null;
  accessedAt?: string | null;
  notes?: string | null;
};

function toDateInputValue(v?: string | null) {
  if (!v) return "";
  return new Date(v).toISOString().slice(0, 10);
}

export function SourceForm({
  action,
  defaults,
  submitLabel,
}: {
  action: (state: SourceFormState, formData: FormData) => Promise<SourceFormState>;
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<SourceFormState, FormData>(
    action,
    undefined
  );
  const router = useRouter();
  const today = new Date().toISOString().slice(0, 10);
  const formKey = useRetryFormKey(state);
  const v = state?.values;

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div className="sm:col-span-2">
          <label className="label" htmlFor="sourceName">
            出典名 <span className="text-red-500">*</span>
          </label>
          <input
            id="sourceName"
            name="sourceName"
            required
            defaultValue={strValue(v, "sourceName", defaults?.sourceName)}
            className="input"
            placeholder="例：ジオパーク秩父 公式サイト"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="sourceUrl">
            URL
          </label>
          <input
            id="sourceUrl"
            name="sourceUrl"
            defaultValue={strValue(v, "sourceUrl", defaults?.sourceUrl ?? "")}
            className="input"
            placeholder="https://..."
          />
        </div>

        <div>
          <label className="label" htmlFor="organization">
            組織名
          </label>
          <input
            id="organization"
            name="organization"
            defaultValue={strValue(v, "organization", defaults?.organization ?? "")}
            className="input"
            placeholder="例：秩父市"
          />
        </div>

        <div>
          <label className="label" htmlFor="sourceType">
            種別 <span className="text-red-500">*</span>
          </label>
          <select
            id="sourceType"
            name="sourceType"
            required
            defaultValue={strValue(v, "sourceType", defaults?.sourceType ?? SOURCE_TYPES[0])}
            className="input"
          >
            {SOURCE_TYPES.map((t) => (
              <option key={t} value={t}>
                {SOURCE_TYPE_LABELS[t]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="reliabilityGrade">
            信頼性グレード <span className="text-red-500">*</span>
          </label>
          <select
            id="reliabilityGrade"
            name="reliabilityGrade"
            required
            defaultValue={strValue(v, "reliabilityGrade", defaults?.reliabilityGrade ?? "B")}
            className="input"
          >
            {RELIABILITY_GRADES.map((g) => (
              <option key={g} value={g}>
                {RELIABILITY_GRADE_LABELS[g]}
              </option>
            ))}
          </select>
        </div>

        <div>
          <label className="label" htmlFor="publishedAt">
            情報源の公開日
          </label>
          <input
            id="publishedAt"
            name="publishedAt"
            type="date"
            defaultValue={strValue(v, "publishedAt", toDateInputValue(defaults?.publishedAt))}
            className="input"
          />
        </div>

        <div>
          <label className="label" htmlFor="accessedAt">
            確認日 <span className="text-red-500">*</span>
          </label>
          <input
            id="accessedAt"
            name="accessedAt"
            type="date"
            required
            defaultValue={strValue(v, "accessedAt", toDateInputValue(defaults?.accessedAt) || today)}
            className="input"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="notes">
            メモ
          </label>
          <textarea
            id="notes"
            name="notes"
            rows={3}
            defaultValue={strValue(v, "notes", defaults?.notes ?? "")}
            className="input"
          />
        </div>
      </div>

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
