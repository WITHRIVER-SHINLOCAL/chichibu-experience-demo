"use client";

// Market Research v2: MARKET_PROGRAM_ANALYSIS（INFERENCE層）の編集フォーム。
// RAW FACT（marketing_messages・review_rating等）とは明確に分離し、
// ここに入力される内容はすべて「登録データからの解釈（INFERENCE）」であることを明示する。

import { useActionState } from "react";
import type { MarketProgramAnalysisFormState } from "../actions";

type Defaults = {
  parentAppeal?: string | null;
  childAppeal?: string | null;
  specialness?: string | null;
  educationalValue?: string | null;
  childReactionFromReviews?: string | null;
  safetyEvaluationFromReviews?: string | null;
  guideEvaluationFromReviews?: string | null;
  learningValueFromReviews?: string | null;
  analyzedAt?: string | null;
};

export function MarketProgramAnalysisForm({
  action,
  defaults,
}: {
  action: (state: MarketProgramAnalysisFormState, formData: FormData) => Promise<MarketProgramAnalysisFormState>;
  defaults?: Defaults;
}) {
  const [state, formAction, pending] = useActionState<MarketProgramAnalysisFormState, FormData>(
    action,
    undefined
  );

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
        このセクションはすべてINFERENCE（登録済みのRAW
        FACTからの解釈）です。事実そのものではありません。空欄のまま保存しても構いません。
      </div>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="parentAppeal">
            親向け訴求（INFERENCE）
          </label>
          <textarea
            id="parentAppeal"
            name="parentAppeal"
            rows={2}
            defaultValue={defaults?.parentAppeal ?? ""}
            className="input"
            placeholder="訴求文（RAW FACT）のうち、親に向けたものと解釈できるものを要約"
          />
        </div>
        <div>
          <label className="label" htmlFor="childAppeal">
            子ども向け訴求（INFERENCE）
          </label>
          <textarea id="childAppeal" name="childAppeal" rows={2} defaultValue={defaults?.childAppeal ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="specialness">
            特別感・希少性（INFERENCE）
          </label>
          <textarea id="specialness" name="specialness" rows={2} defaultValue={defaults?.specialness ?? ""} className="input" />
        </div>
        <div>
          <label className="label" htmlFor="educationalValue">
            教育価値（INFERENCE）
          </label>
          <textarea
            id="educationalValue"
            name="educationalValue"
            rows={2}
            defaultValue={defaults?.educationalValue ?? ""}
            className="input"
            placeholder="学び要素（RAW FACT）から、教育的な価値をどう評価できるか"
          />
        </div>
      </div>

      <h3 className="text-xs font-bold text-stone-500 tracking-wide pt-2">レビューからの解釈（INFERENCE）</h3>
      <div className="grid sm:grid-cols-2 gap-4">
        <div>
          <label className="label" htmlFor="childReactionFromReviews">
            子どもの反応
          </label>
          <textarea
            id="childReactionFromReviews"
            name="childReactionFromReviews"
            rows={2}
            defaultValue={defaults?.childReactionFromReviews ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="safetyEvaluationFromReviews">
            安全への評価
          </label>
          <textarea
            id="safetyEvaluationFromReviews"
            name="safetyEvaluationFromReviews"
            rows={2}
            defaultValue={defaults?.safetyEvaluationFromReviews ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="guideEvaluationFromReviews">
            ガイドへの評価
          </label>
          <textarea
            id="guideEvaluationFromReviews"
            name="guideEvaluationFromReviews"
            rows={2}
            defaultValue={defaults?.guideEvaluationFromReviews ?? ""}
            className="input"
          />
        </div>
        <div>
          <label className="label" htmlFor="learningValueFromReviews">
            学習価値
          </label>
          <textarea
            id="learningValueFromReviews"
            name="learningValueFromReviews"
            rows={2}
            defaultValue={defaults?.learningValueFromReviews ?? ""}
            className="input"
          />
        </div>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      {defaults?.analyzedAt && <p className="text-xs text-stone-400">最終分析日時: {defaults.analyzedAt}</p>}

      <button type="submit" disabled={pending} className="btn btn-secondary">
        {pending ? "保存中..." : "分析（INFERENCE）を保存する"}
      </button>
    </form>
  );
}
