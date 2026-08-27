"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { RelationshipFormState } from "./actions";
import { createRelationshipAction } from "./actions";
import {
  FACT_STATUS_LABELS,
  FACT_STATUS_DESCRIPTIONS,
  RELATIONSHIP_CATEGORY_LABELS,
} from "@/lib/constants";
import { RELATIONSHIP_CATEGORIES, FACT_STATUSES } from "@/db/schema";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

type ResourceOption = { id: string; name: string };
type SourceOption = { id: string; sourceName: string };

export function RelationshipForm({
  resources,
  sources,
  defaultFromResourceId,
}: {
  resources: ResourceOption[];
  sources: SourceOption[];
  defaultFromResourceId?: string;
}) {
  const [state, formAction, pending] = useActionState<RelationshipFormState, FormData>(
    createRelationshipAction,
    undefined
  );
  const router = useRouter();
  const formKey = useRetryFormKey(state);
  const v = state?.values;

  return (
    <form key={formKey} action={formAction} className="space-y-5">
      <div className="grid sm:grid-cols-2 gap-5">
        <div>
          <label className="label" htmlFor="fromResourceId">
            資源A（起点） <span className="text-red-500">*</span>
          </label>
          <select
            id="fromResourceId"
            name="fromResourceId"
            required
            defaultValue={strValue(v, "fromResourceId", defaultFromResourceId ?? "")}
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
        <div>
          <label className="label" htmlFor="toResourceId">
            資源B（終点） <span className="text-red-500">*</span>
          </label>
          <select id="toResourceId" name="toResourceId" required defaultValue={strValue(v, "toResourceId", "")} className="input">
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

        <div>
          <label className="label" htmlFor="relationshipCategory">
            関係性の種類 <span className="text-red-500">*</span>
          </label>
          <select
            id="relationshipCategory"
            name="relationshipCategory"
            required
            defaultValue={strValue(v, "relationshipCategory", "other")}
            className="input"
          >
            {RELATIONSHIP_CATEGORIES.map((c) => (
              <option key={c} value={c}>
                {RELATIONSHIP_CATEGORY_LABELS[c]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="relationshipLabel">
            関係性のラベル <span className="text-red-500">*</span>
          </label>
          <input
            id="relationshipLabel"
            name="relationshipLabel"
            required
            defaultValue={strValue(v, "relationshipLabel", "")}
            className="input"
            placeholder="例：の上流に位置する、の原材料である"
          />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="description">
            説明
          </label>
          <textarea id="description" name="description" rows={2} defaultValue={strValue(v, "description", "")} className="input" />
        </div>

        <div>
          <label className="label" htmlFor="factStatus">
            確度 <span className="text-red-500">*</span>
          </label>
          <select id="factStatus" name="factStatus" required defaultValue={strValue(v, "factStatus", "INFERENCE")} className="input">
            {FACT_STATUSES.map((f) => (
              <option key={f} value={f}>
                {FACT_STATUS_LABELS[f]}
              </option>
            ))}
          </select>
          <p className="mt-1 text-xs text-stone-400">
            {Object.entries(FACT_STATUS_DESCRIPTIONS)
              .map(([k, val]) => `${FACT_STATUS_LABELS[k]}＝${val}`)
              .join(" ／ ")}
          </p>
        </div>
        <div>
          <label className="label" htmlFor="confidence">
            確信度（0〜100）
          </label>
          <input id="confidence" name="confidence" type="number" min={0} max={100} defaultValue={strValue(v, "confidence", "")} className="input" />
        </div>

        <div className="sm:col-span-2">
          <label className="label" htmlFor="sourceId">
            出典（任意）
          </label>
          <select id="sourceId" name="sourceId" defaultValue={strValue(v, "sourceId", "")} className="input">
            <option value="">なし</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sourceName}
              </option>
            ))}
          </select>
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "登録中..." : "登録する"}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          キャンセル
        </button>
      </div>
    </form>
  );
}
