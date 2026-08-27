"use client";

// MVP実運用テスト用フィードバックフォーム（正式なプロダクト機能ではない）。
// 企画作成後に「使いやすかった／普通／使いにくかった」の簡易評価と、
// どこで迷ったか・足りなかった情報・不要だった情報を自由記述で残す。

import { useActionState } from "react";
import type { ProgramFeedbackFormState } from "../actions";
import { EASE_RATING_LABELS, IDEATION_COUNTERFACTUAL_LABELS } from "@/lib/constants";
import { EASE_RATINGS, IDEATION_COUNTERFACTUALS } from "@/db/schema";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";

export function FeedbackForm({
  action,
}: {
  action: (state: ProgramFeedbackFormState, formData: FormData) => Promise<ProgramFeedbackFormState>;
}) {
  const [state, formAction, pending] = useActionState<ProgramFeedbackFormState, FormData>(
    action,
    undefined
  );
  const formKey = useRetryFormKey(state);
  const v = state?.values;

  if (state?.success) {
    return (
      <p className="text-sm text-emerald-700 bg-emerald-50 border border-emerald-200 rounded-lg px-3 py-2">
        フィードバックを記録しました。ご協力ありがとうございます。
      </p>
    );
  }

  return (
    <form key={formKey} action={formAction} className="space-y-4">
      <div>
        <p className="label">この企画づくりは使いやすかったですか？ <span className="text-red-500">*</span></p>
        <div className="flex flex-wrap gap-4 pt-1">
          {EASE_RATINGS.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                name="easeRating"
                value={r}
                required
                defaultChecked={strValue(v, "easeRating") === r}
              />
              {EASE_RATING_LABELS[r]}
            </label>
          ))}
        </div>
      </div>
      <div>
        <p className="label">
          このアプリを使わなかった場合、この企画を思いつけたと思いますか？ <span className="text-red-500">*</span>
        </p>
        <div className="flex flex-wrap gap-4 pt-1">
          {IDEATION_COUNTERFACTUALS.map((r) => (
            <label key={r} className="flex items-center gap-1.5 text-sm text-stone-700">
              <input
                type="radio"
                name="ideationCounterfactual"
                value={r}
                required
                defaultChecked={strValue(v, "ideationCounterfactual") === r}
              />
              {IDEATION_COUNTERFACTUAL_LABELS[r]}
            </label>
          ))}
        </div>
      </div>
      <div className="grid sm:grid-cols-3 gap-4">
        <div>
          <label className="label" htmlFor="confusionPoints">
            どこで迷いましたか？（任意）
          </label>
          <textarea
            id="confusionPoints"
            name="confusionPoints"
            rows={3}
            className="input"
            defaultValue={strValue(v, "confusionPoints")}
            placeholder="例：④関連性探索で何をすればいいか分からなかった"
          />
        </div>
        <div>
          <label className="label" htmlFor="missingInfo">
            足りなかった情報（任意）
          </label>
          <textarea
            id="missingInfo"
            name="missingInfo"
            rows={3}
            className="input"
            defaultValue={strValue(v, "missingInfo")}
            placeholder="例：体験機会の安全リスクが一覧で見たかった"
          />
        </div>
        <div>
          <label className="label" htmlFor="unnecessaryInfo">
            不要だった情報（任意）
          </label>
          <textarea
            id="unnecessaryInfo"
            name="unnecessaryInfo"
            rows={3}
            className="input"
            defaultValue={strValue(v, "unnecessaryInfo")}
            placeholder="例：確信度の数値は使わなかった"
          />
        </div>
      </div>
      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}
      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "送信中..." : "フィードバックを送る"}
      </button>
    </form>
  );
}
