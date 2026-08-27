"use client";

import { useActionState } from "react";
import { addResourceNoteAction, type NoteFormState } from "../actions";
import { FACT_STATUS_LABELS, FACT_STATUS_DESCRIPTIONS } from "@/lib/constants";
import { FACT_STATUSES } from "@/db/schema";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

type SourceOption = { id: string; sourceName: string };

export function NoteForm({ resourceId, sources }: { resourceId: string; sources: SourceOption[] }) {
  const action = addResourceNoteAction.bind(null, resourceId);
  const [state, formAction, pending] = useActionState<NoteFormState, FormData>(action, undefined);
  const formKey = useRetryFormKey(state);
  const v = state?.error ? state.values : undefined;

  return (
    <form key={formKey} action={formAction} className="space-y-3 p-4 bg-stone-50 rounded-lg border border-stone-100">
      <div>
        <label className="label" htmlFor="note-body">
          考察・補足情報を追加
        </label>
        <textarea
          id="note-body"
          name="body"
          rows={2}
          required
          defaultValue={strValue(v, "body", "")}
          className="input"
          placeholder="例：河原の石は上流ほど角が取れており、地質の違いが観察できそう"
        />
      </div>
      <div className="grid sm:grid-cols-3 gap-3">
        <div>
          <label className="label" htmlFor="note-factStatus">
            確度
          </label>
          <select id="note-factStatus" name="factStatus" defaultValue={strValue(v, "factStatus", "INFERENCE")} className="input">
            {FACT_STATUSES.map((f) => (
              <option key={f} value={f}>
                {FACT_STATUS_LABELS[f]}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note-sourceId">
            出典（任意）
          </label>
          <select id="note-sourceId" name="sourceId" defaultValue={strValue(v, "sourceId", "")} className="input">
            <option value="">なし</option>
            {sources.map((s) => (
              <option key={s.id} value={s.id}>
                {s.sourceName}
              </option>
            ))}
          </select>
        </div>
        <div>
          <label className="label" htmlFor="note-confidence">
            確信度（0〜100）
          </label>
          <input
            id="note-confidence"
            name="confidence"
            type="number"
            min={0}
            max={100}
            defaultValue={strValue(v, "confidence", "")}
            className="input"
          />
        </div>
      </div>
      <p className="text-xs text-stone-400">
        {Object.entries(FACT_STATUS_DESCRIPTIONS)
          .map(([k, v]) => `${FACT_STATUS_LABELS[k]}＝${v}`)
          .join(" ／ ")}
      </p>
      {state?.error && <p className="text-sm text-red-600">{state.error}</p>}
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "追加中..." : "追加する"}
      </button>
    </form>
  );
}
