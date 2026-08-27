"use client";

import { useActionState } from "react";
import type { AiReviewActionState } from "./actions";
import type { ImprovementIdea } from "@/lib/ai-review/types";
import { DIAGNOSIS_AXIS_LABELS } from "@/lib/ai-review/types";
import { isExperienceDesignReviewIdea } from "@/lib/ai-review/experience-design";
import { FACT_STATUS_BADGE } from "@/lib/constants";

export function ApproveIdeasForm({
  action,
  ideas,
  approvedIdeaIds,
}: {
  action: (state: AiReviewActionState, formData: FormData) => Promise<AiReviewActionState>;
  ideas: ImprovementIdea[];
  approvedIdeaIds: string[];
}) {
  const [state, formAction, pending] = useActionState<AiReviewActionState, FormData>(action, undefined);
  const approvedSet = new Set(approvedIdeaIds);

  return (
    <form action={formAction} className="space-y-3">
      <div className="space-y-2">
        {ideas.map((idea) => (
          <label
            key={idea.id}
            className="flex items-start gap-3 rounded-lg border border-stone-200 p-3 cursor-pointer hover:bg-stone-50"
          >
            <input
              type="checkbox"
              name="ideaIds"
              value={idea.id}
              defaultChecked={approvedSet.has(idea.id)}
              className="mt-1"
            />
            <div className="flex-1">
              <div className="flex items-center gap-2 flex-wrap">
                <span className={`badge ${FACT_STATUS_BADGE.IDEA}`}>IDEA</span>
                <span className="text-xs text-stone-500">対応軸: {DIAGNOSIS_AXIS_LABELS[idea.target_axis]}</span>
                {isExperienceDesignReviewIdea(idea.title) && (
                  <span className="badge bg-violet-50 text-violet-700 border border-violet-200">
                    ⑦ Experience Design Review由来
                  </span>
                )}
              </div>
              <p className="font-medium text-stone-900 mt-1">{idea.title}</p>
              <p className="text-sm text-stone-600 mt-1 whitespace-pre-wrap">{idea.description}</p>
            </div>
          </label>
        ))}
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "保存中..." : "選択したアイデアを承認してProduct Draftへ進む"}
      </button>
      <p className="text-xs text-stone-500">何も選択せずに承認することもできます（その場合、FACT/INFERENCEのみからDraftが作られます）。</p>
    </form>
  );
}
