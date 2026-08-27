"use client";

import { useActionState, useState } from "react";
import type { AiReviewActionState } from "./actions";

export function ResolveMissingResearchForm({
  action,
  referenceOptions,
}: {
  action: (state: AiReviewActionState, formData: FormData) => Promise<AiReviewActionState>;
  referenceOptions: { ref: string; label: string }[];
}) {
  const [state, formAction, pending] = useActionState<AiReviewActionState, FormData>(action, undefined);
  const [open, setOpen] = useState(false);

  if (!open) {
    return (
      <button type="button" onClick={() => setOpen(true)} className="btn btn-secondary text-xs">
        解決済みとして記録する
      </button>
    );
  }

  return (
    <form action={formAction} className="mt-2 space-y-2 rounded-lg border border-stone-200 bg-stone-50 p-3">
      <div>
        <label className="label text-xs">根拠となった既存FACT（複数選択可・任意）</label>
        <select name="resolvedReferenceIds" multiple size={4} className="input text-xs">
          {referenceOptions.map((o) => (
            <option key={o.ref} value={o.ref}>
              {o.label}
            </option>
          ))}
        </select>
      </div>
      <div>
        <label className="label text-xs">解決メモ（何によって解決したか）</label>
        <textarea name="resolvedNote" rows={2} className="input text-xs" placeholder="例：現地確認により…／新しいSOURCEを登録済み" />
      </div>
      {state?.error && <p className="text-xs text-red-600">{state.error}</p>}
      <div className="flex gap-2">
        <button type="submit" disabled={pending} className="btn btn-primary text-xs">
          {pending ? "保存中..." : "解決を記録する"}
        </button>
        <button type="button" onClick={() => setOpen(false)} className="btn btn-secondary text-xs">
          キャンセル
        </button>
      </div>
    </form>
  );
}
