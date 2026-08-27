"use client";

import { useActionState } from "react";
import { linkResourceSourceAction, type LinkSourceFormState } from "../actions";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

type SourceOption = { id: string; sourceName: string };

export function LinkSourceForm({
  resourceId,
  sources,
}: {
  resourceId: string;
  sources: SourceOption[];
}) {
  const action = linkResourceSourceAction.bind(null, resourceId);
  const [state, formAction, pending] = useActionState<LinkSourceFormState, FormData>(
    action,
    undefined
  );
  const formKey = useRetryFormKey(state);
  const v = state?.error ? state.values : undefined;

  if (sources.length === 0) {
    return (
      <p className="text-xs text-stone-400">
        紐付けられる出典がありません。先に「出典管理」から出典を登録してください。
      </p>
    );
  }

  return (
    <form key={formKey} action={formAction} className="flex flex-wrap items-end gap-2">
      <div className="flex-1 min-w-[10rem]">
        <label className="label" htmlFor="link-sourceId">
          出典を紐付け
        </label>
        <select id="link-sourceId" name="sourceId" required defaultValue={strValue(v, "sourceId", "")} className="input">
          <option value="" disabled>
            選択してください
          </option>
          {sources.map((s) => (
            <option key={s.id} value={s.id}>
              {s.sourceName}
            </option>
          ))}
        </select>
      </div>
      <div className="flex-1 min-w-[10rem]">
        <label className="label" htmlFor="link-note">
          メモ（任意）
        </label>
        <input id="link-note" name="note" defaultValue={strValue(v, "note", "")} className="input" />
      </div>
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "追加中..." : "紐付ける"}
      </button>
      {state?.error && <p className="w-full text-sm text-red-600">{state.error}</p>}
    </form>
  );
}
