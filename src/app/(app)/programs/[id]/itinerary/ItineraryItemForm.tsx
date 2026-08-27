"use client";

import { useActionState } from "react";
import { addItineraryItemAction, type ItineraryItemFormState } from "./actions";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

type ResourceOption = { id: string; name: string };

export function ItineraryItemForm({ programId, resources }: { programId: string; resources: ResourceOption[] }) {
  const action = addItineraryItemAction.bind(null, programId);
  const [state, formAction, pending] = useActionState<ItineraryItemFormState, FormData>(action, undefined);
  const formKey = useRetryFormKey(state);
  const v = state?.error ? state.values : undefined;

  return (
    <form key={formKey} action={formAction} className="grid sm:grid-cols-6 gap-2 items-end p-4 bg-stone-50 rounded-lg border border-stone-100">
      <div>
        <label className="label">開始 *</label>
        <input name="startTime" required defaultValue={strValue(v, "startTime", "")} className="input" placeholder="09:30" />
      </div>
      <div>
        <label className="label">終了</label>
        <input name="endTime" defaultValue={strValue(v, "endTime", "")} className="input" placeholder="10:00" />
      </div>
      <div className="sm:col-span-2">
        <label className="label">内容 *</label>
        <input name="activity" required defaultValue={strValue(v, "activity", "")} className="input" placeholder="例：西武秩父駅 集合・受付" />
      </div>
      <div>
        <label className="label">関連資源</label>
        <select name="resourceId" defaultValue={strValue(v, "resourceId", "")} className="input">
          <option value="">なし</option>
          {resources.map((r) => (
            <option key={r.id} value={r.id}>
              {r.name}
            </option>
          ))}
        </select>
      </div>
      <div>
        <button type="submit" disabled={pending} className="btn btn-primary w-full">
          {pending ? "追加中..." : "追加"}
        </button>
      </div>
      <div className="sm:col-span-6">
        <label className="label">スタッフ向けメモ</label>
        <input name="staffNote" defaultValue={strValue(v, "staffNote", "")} className="input" />
      </div>
      {state?.error && <p className="sm:col-span-6 text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
