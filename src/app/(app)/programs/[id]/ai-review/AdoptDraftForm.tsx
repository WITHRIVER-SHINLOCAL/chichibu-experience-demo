"use client";

import { useActionState, useState } from "react";
import type { AiReviewActionState } from "./actions";
import type { ProductDraft } from "@/lib/ai-review/types";

function joinSection(...parts: (string | undefined)[]): string {
  return parts.filter(Boolean).join("\n\n");
}

export function AdoptDraftForm({
  action,
  draft,
  readOnly,
}: {
  action: (state: AiReviewActionState, formData: FormData) => Promise<AiReviewActionState>;
  draft: ProductDraft;
  // true の場合、PROGRAM本体・行程表への書き込み操作を一切提示しない（デモPROGRAM向けの閲覧専用モード）。
  readOnly?: boolean;
}) {
  if (readOnly) {
    return <ReadOnlyDraftView draft={draft} />;
  }
  return <EditableAdoptDraftForm action={action} draft={draft} />;
}

// デモPROGRAM向け: PROGRAM本体・行程表への書き込みフォームを一切レンダリングせず、
// Product Draftの内容を読み取り専用で提示する。
function ReadOnlyDraftView({ draft }: { draft: ProductDraft }) {
  return (
    <div className="space-y-4">
      <div className="rounded-lg border border-amber-300 bg-amber-50 px-4 py-3 text-sm text-amber-800 font-medium">
        デモでは編集できません。このPROGRAMはデモ閲覧専用のため、PROGRAM本体・行程表への採用・保存操作は無効化されています。
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <h3 className="font-medium text-sm mb-2">体験概要（PROGRAM.experience_content 相当）</h3>
        <p className="text-sm text-stone-700 whitespace-pre-wrap">
          {joinSection(
            `【商品概要】\n${draft.overview}`,
            `【体験の魅力】\n${draft.appeal}`,
            `【学びのポイント】\n${draft.learning_points}`,
            draft.takeaway ? `【持ち帰れる成果】\n${draft.takeaway}` : undefined,
            draft.guide_needed ? `【必要な専門家・ガイド】\n${draft.guide_needed}` : undefined,
            draft.safety_check_items.length > 0
              ? `【安全上確認すべきこと】\n${draft.safety_check_items.map((s) => `・${s}`).join("\n")}`
              : undefined
          )}
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <h3 className="font-medium text-sm mb-2">市場ニーズ・価格根拠（PROGRAM.market_needs 相当）</h3>
        <p className="text-sm text-stone-700 whitespace-pre-wrap">
          {joinSection(`【親への価値】\n${draft.parent_value}`, `【価格の考え方】\n${draft.price_reasoning}`)}
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <h3 className="font-medium text-sm mb-2">地域独自性の理由（PROGRAM.why_chichibu 相当）</h3>
        <p className="text-sm text-stone-700 whitespace-pre-wrap">
          {joinSection(`【子どもの体験価値】\n${draft.child_value}`)}
        </p>
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <h3 className="font-medium text-sm mb-2">当日の流れ（行程表 / itineraries 相当）</h3>
        {draft.flow.length === 0 ? (
          <p className="text-sm text-stone-400">flowが登録されていません。</p>
        ) : (
          <ul className="space-y-1">
            {draft.flow.map((row, i) => (
              <li key={i} className="text-sm text-stone-700 flex gap-2">
                <span className="font-medium text-stone-500 w-16 shrink-0">{row.time}</span>
                <span>{row.activity}</span>
              </li>
            ))}
          </ul>
        )}
      </div>
    </div>
  );
}

function EditableAdoptDraftForm({
  action,
  draft,
}: {
  action: (state: AiReviewActionState, formData: FormData) => Promise<AiReviewActionState>;
  draft: ProductDraft;
}) {
  const [state, formAction, pending] = useActionState<AiReviewActionState, FormData>(action, undefined);

  const [overviewText, setOverviewText] = useState(
    joinSection(
      `【商品概要】\n${draft.overview}`,
      `【体験の魅力】\n${draft.appeal}`,
      `【学びのポイント】\n${draft.learning_points}`,
      draft.takeaway ? `【持ち帰れる成果】\n${draft.takeaway}` : undefined,
      draft.guide_needed ? `【必要な専門家・ガイド】\n${draft.guide_needed}` : undefined,
      draft.safety_check_items.length > 0
        ? `【安全上確認すべきこと】\n${draft.safety_check_items.map((s) => `・${s}`).join("\n")}`
        : undefined
    )
  );
  const [parentValueText, setParentValueText] = useState(
    joinSection(`【親への価値】\n${draft.parent_value}`, `【価格の考え方】\n${draft.price_reasoning}`)
  );
  const [regionalText, setRegionalText] = useState(
    joinSection(`【子どもの体験価値】\n${draft.child_value}`)
  );
  const [flowRows, setFlowRows] = useState(
    draft.flow.length > 0 ? draft.flow : [{ time: "", activity: "" }]
  );

  const [checkedSections, setCheckedSections] = useState<Set<string>>(new Set());
  function toggle(section: string) {
    setCheckedSections((prev) => {
      const next = new Set(prev);
      if (next.has(section)) next.delete(section);
      else next.add(section);
      return next;
    });
  }

  return (
    <form action={formAction} className="space-y-4">
      <div className="rounded-lg border border-stone-200 p-3">
        <label className="flex items-center gap-2 font-medium text-sm">
          <input
            type="checkbox"
            name="sections"
            value="overview_appeal_learning"
            checked={checkedSections.has("overview_appeal_learning")}
            onChange={() => toggle("overview_appeal_learning")}
          />
          体験概要へ採用する（PROGRAM.experience_content）
        </label>
        <textarea
          name="text_overview_appeal_learning"
          rows={8}
          className="input mt-2 text-sm"
          value={overviewText}
          onChange={(e) => setOverviewText(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <label className="flex items-center gap-2 font-medium text-sm">
          <input
            type="checkbox"
            name="sections"
            value="parent_value_price"
            checked={checkedSections.has("parent_value_price")}
            onChange={() => toggle("parent_value_price")}
          />
          市場ニーズ・価格根拠へ採用する（PROGRAM.market_needs）
        </label>
        <textarea
          name="text_parent_value_price"
          rows={5}
          className="input mt-2 text-sm"
          value={parentValueText}
          onChange={(e) => setParentValueText(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <label className="flex items-center gap-2 font-medium text-sm">
          <input
            type="checkbox"
            name="sections"
            value="regional_reasoning"
            checked={checkedSections.has("regional_reasoning")}
            onChange={() => toggle("regional_reasoning")}
          />
          地域独自性の理由へ採用する（PROGRAM.why_chichibu）
        </label>
        <textarea
          name="text_regional_reasoning"
          rows={4}
          className="input mt-2 text-sm"
          value={regionalText}
          onChange={(e) => setRegionalText(e.target.value)}
        />
      </div>

      <div className="rounded-lg border border-stone-200 p-3">
        <label className="flex items-center gap-2 font-medium text-sm">
          <input
            type="checkbox"
            name="sections"
            value="flow"
            checked={checkedSections.has("flow")}
            onChange={() => toggle("flow")}
          />
          当日の流れへ採用する（行程表 / itineraries）
        </label>
        <div className="mt-2 space-y-2">
          {flowRows.map((row, i) => (
            <div key={i} className="flex gap-2">
              <input
                name="flow_time"
                className="input text-sm w-28"
                placeholder="例：09:30"
                value={row.time}
                onChange={(e) =>
                  setFlowRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, time: e.target.value } : r)))
                }
              />
              <input
                name="flow_activity"
                className="input text-sm flex-1"
                placeholder="活動内容"
                value={row.activity}
                onChange={(e) =>
                  setFlowRows((prev) => prev.map((r, idx) => (idx === i ? { ...r, activity: e.target.value } : r)))
                }
              />
            </div>
          ))}
        </div>
        <button
          type="button"
          className="btn btn-secondary text-xs mt-2"
          onClick={() => setFlowRows((prev) => [...prev, { time: "", activity: "" }])}
        >
          + 行を追加
        </button>
      </div>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
      )}
      <button type="submit" disabled={pending} className="btn btn-primary">
        {pending ? "採用中..." : "選択したセクションをPROGRAMに採用する"}
      </button>
      <p className="text-xs text-stone-500">
        Product Draft自体（program_ai_reviews.product_draft）はこの操作では変更されません。ここで編集した文章のみがPROGRAM本体に書き込まれます。
      </p>
    </form>
  );
}
