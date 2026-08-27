"use client";

import { useActionState } from "react";
import type { AiReviewActionState } from "./actions";

export function StageActionButton({
  action,
  label,
  pendingLabel,
  disabled,
  disabledReason,
}: {
  action: (state: AiReviewActionState, formData: FormData) => Promise<AiReviewActionState>;
  label: string;
  pendingLabel?: string;
  disabled?: boolean;
  disabledReason?: string;
}) {
  const [state, formAction, pending] = useActionState<AiReviewActionState, FormData>(action, undefined);

  return (
    <form action={formAction} className="space-y-2">
      <button type="submit" disabled={pending || disabled} className="btn btn-primary">
        {pending ? (pendingLabel ?? "実行中...") : label}
      </button>
      {disabled && disabledReason && <p className="text-xs text-stone-500">{disabledReason}</p>}
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
    </form>
  );
}
