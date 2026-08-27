import Link from "next/link";
import { notFound } from "next/navigation";
import { eq } from "drizzle-orm";
import { db } from "@/db";
import { programs } from "@/db/schema";
import { isAiConfigured } from "@/lib/ai-review/claude-client";
import { buildAiReviewContext } from "@/lib/ai-review/context";
import { DIAGNOSIS_AXIS_LABELS, type DiagnosisStatus } from "@/lib/ai-review/types";
import { isExperienceDesignReviewIdea } from "@/lib/ai-review/experience-design";
import { FACT_STATUS_BADGE, DEMO_PROGRAM_ID } from "@/lib/constants";
import { getLatestAiReview } from "./lib";
import {
  runDiagnosisAction,
  runImprovementIdeasAction,
  approveIdeasAction,
  runProductDraftAction,
  resolveMissingResearchAction,
  adoptDraftSectionsAction,
} from "./actions";
import { StageActionButton } from "./StageActionButton";
import { ApproveIdeasForm } from "./ApproveIdeasForm";
import { ResolveMissingResearchForm } from "./ResolveMissingResearchForm";
import { AdoptDraftForm } from "./AdoptDraftForm";

const STATUS_LABELS: Record<DiagnosisStatus, string> = {
  sufficient: "十分",
  needs_improvement: "要改善",
  insufficient_data: "情報不足",
};
const STATUS_BADGE: Record<DiagnosisStatus, string> = {
  sufficient: "bg-emerald-100 text-emerald-800",
  needs_improvement: "bg-amber-100 text-amber-800",
  insufficient_data: "bg-stone-200 text-stone-700",
};

export default async function AiReviewPage({ params }: { params: Promise<{ id: string }> }) {
  const { id } = await params;
  const [program] = await db.select().from(programs).where(eq(programs.id, id)).limit(1);
  if (!program) notFound();

  const aiConfigured = isAiConfigured();
  const review = await getLatestAiReview(id);

  // 不足FACTの解決フォーム用に、参照可能なFACT一覧をラベル付きで用意する
  const { catalog } = await buildAiReviewContext(id);
  const referenceOptions = Array.from(catalog.labels.entries()).map(([ref, label]) => ({ ref, label }));

  const hasDiagnosis = !!review?.diagnosis;
  const hasIdeas = !!review?.improvementIdeas;
  const hasApproval = !!review?.approvedAt;
  const hasDraft = !!review?.productDraft;
  const allIdeas = review?.improvementIdeas ?? [];
  const experienceDesignIdeas = allIdeas.filter((i) => isExperienceDesignReviewIdea(i.title));
  const hasExperienceDesignReview = experienceDesignIdeas.length > 0;
  // 保存済みのレビューが「有料APIではなく無料ドライランで作られた結果」かどうか。
  // デモでは、このフラグが立っている場合に「保存済みのサンプル結果を見ている」ことを明示する。
  const isDryRunSample = !!review?.model?.startsWith("manual-dry-run");
  const isDemoProgram = id === DEMO_PROGRAM_ID;
  // 公開デモ向けの安全対策: ANTHROPIC_API_KEY未設定時、デモPROGRAM以外ではAI生成ボタンの
  // 無効理由メッセージを「保存済みサンプルを見てください」という案内に統一する。
  const aiDisabledReason = !aiConfigured
    ? isDemoProgram
      ? "このPROGRAMは保存済みのサンプル結果を表示しています。"
      : "このデモではAI ReviewはデモPROGRAMの保存済みサンプルをご覧ください。"
    : undefined;

  const steps = [
    { key: "diagnosis", label: "① 商品診断", done: hasDiagnosis },
    { key: "missing", label: "② 不足FACT", done: hasDiagnosis },
    { key: "market", label: "③ 市場比較", done: hasDiagnosis },
    { key: "ideas", label: "④ 改善アイデア", done: hasIdeas },
    { key: "approve", label: "⑤ 人間による選択・承認", done: hasApproval },
    { key: "draft", label: "⑥ Product Draft", done: hasDraft },
    { key: "experience", label: "⑦ Experience Design Review", done: hasExperienceDesignReview },
  ];

  return (
    <div className="space-y-6">
      <div>
        <Link href={`/programs/${id}`} className="text-sm text-stone-500 hover:underline">
          ← {program.title}
        </Link>
        <h1 className="text-2xl font-bold text-stone-900 mt-1">AIで商品を磨く</h1>
        <p className="text-sm text-stone-500 mt-1">
          MVP-B: AI Product Development Assistant。AIは新しいFACTを作りません。既存のFACTを組み合わせた解釈（INFERENCE）と提案（IDEA）、
          不足FACTの指摘のみを行い、Product Draftの採用は人間の承認を経てはじめて反映されます。
        </p>
      </div>

      <div className="flex flex-wrap gap-2 text-xs">
        {steps.map((s) => (
          <span
            key={s.key}
            className={`badge ${
              s.done ? "bg-emerald-100 text-emerald-800" : "bg-stone-100 text-stone-500"
            }`}
          >
            {s.done ? "✓ " : ""}
            {s.label}
          </span>
        ))}
      </div>

      {isDryRunSample && (
        <div className="card p-4 bg-river-50 border border-river-200 text-sm text-stone-700 flex items-start gap-3">
          <span className="badge bg-river-600 text-white font-bold tracking-wide shrink-0">
            DEMO / AI REVIEW SAMPLE
          </span>
          <p className="text-xs text-stone-600">
            これは実際のClaude
            APIを呼び出した結果ではなく、同じガード・スキーマを通して保存された「無料ドライラン」の結果です。デモ閲覧中に有料APIは呼び出されません。以下の①〜⑦はすべて保存済みデータの閲覧です。
          </p>
        </div>
      )}

      {!aiConfigured && !review && (
        <div className="card p-4 bg-amber-50 border border-amber-200 text-sm text-amber-800">
          AI機能を利用するにはANTHROPIC_API_KEYの設定が必要です。このPROGRAMにはまだ保存済みのAI
          Review結果がありません。管理者に環境変数の設定を依頼するか、保存済み結果のあるデモPROGRAMをご覧ください。
        </div>
      )}

      {/* ① 商品診断 / ② 不足FACT / ③ 市場比較 */}
      <section className="card p-6 space-y-4">
        <h2 className="font-semibold text-stone-900">① 商品診断 ／ ② 不足FACT ／ ③ 市場比較</h2>
        {!hasDiagnosis ? (
          <StageActionButton
            action={runDiagnosisAction.bind(null, id)}
            label="診断を実行する"
            pendingLabel="診断中...（Claude APIを呼び出しています）"
            disabled={!aiConfigured}
            disabledReason={aiDisabledReason}
          />
        ) : (
          <>
            <div className="grid sm:grid-cols-2 gap-3">
              {review!.diagnosis!.map((d) => (
                <div key={d.axis} className="rounded-lg border border-stone-200 p-3">
                  <div className="flex items-center justify-between gap-2">
                    <span className="font-medium text-sm">{DIAGNOSIS_AXIS_LABELS[d.axis]}</span>
                    <span className={`badge ${STATUS_BADGE[d.status]}`}>{STATUS_LABELS[d.status]}</span>
                  </div>
                  <p className="text-xs text-stone-600 mt-1 whitespace-pre-wrap">{d.reasoning}</p>
                  <span className={`badge ${FACT_STATUS_BADGE.INFERENCE} mt-2 inline-block`}>INFERENCE</span>
                </div>
              ))}
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">不足FACT（追加調査が必要）</h3>
              <div className="space-y-2">
                {review!.missingResearch!.length === 0 && (
                  <p className="text-sm text-stone-500">現時点で不足FACTは指摘されませんでした。</p>
                )}
                {review!.missingResearch!.map((item) => (
                  <div key={item.id} className="rounded-lg border border-stone-200 p-3">
                    <div className="flex items-center gap-2 flex-wrap">
                      <span className="badge bg-rose-100 text-rose-800">要追加調査</span>
                      {item.resolved && <span className="badge bg-emerald-100 text-emerald-800">解決済み</span>}
                      <span className="font-medium text-sm">{item.topic}</span>
                    </div>
                    <p className="text-xs text-stone-600 mt-1">{item.why_needed}</p>
                    <p className="text-xs text-stone-400 mt-1">調査の方向性: {item.suggested_source_type}</p>
                    {item.resolved ? (
                      <p className="text-xs text-emerald-700 mt-2">
                        解決メモ: {item.resolved_note ?? "(メモなし)"}
                        {item.resolved_reference_ids.length > 0 &&
                          ` ／ 根拠: ${item.resolved_reference_ids.map((r) => catalog.labels.get(r) ?? r).join("、")}`}
                      </p>
                    ) : (
                      <ResolveMissingResearchForm
                        action={resolveMissingResearchAction.bind(null, id, review!.id, item.id)}
                        referenceOptions={referenceOptions}
                      />
                    )}
                  </div>
                ))}
              </div>
            </div>

            <div>
              <h3 className="font-medium text-sm mb-2">市場比較</h3>
              <div className="rounded-lg border border-stone-200 p-3">
                <span className={`badge ${FACT_STATUS_BADGE.INFERENCE}`}>INFERENCE</span>
                <p className="text-sm text-stone-700 mt-2 whitespace-pre-wrap">{review!.marketComparison!.summary}</p>
                {review!.marketComparison!.high_price_common_factors.length > 0 && (
                  <div className="mt-2">
                    <p className="text-xs text-stone-500">高価格帯に共通する要素:</p>
                    <ul className="text-xs text-stone-600 list-disc list-inside">
                      {review!.marketComparison!.high_price_common_factors.map((f, i) => (
                        <li key={i}>{f}</li>
                      ))}
                    </ul>
                  </div>
                )}
              </div>
            </div>
          </>
        )}
      </section>

      {/* ④ 改善アイデア */}
      {hasDiagnosis && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">④ 改善アイデア</h2>
          {!hasIdeas ? (
            <StageActionButton
              action={runImprovementIdeasAction.bind(null, id, review!.id)}
              label="改善アイデアを生成する"
              pendingLabel="生成中...（Claude APIを呼び出しています）"
              disabled={!aiConfigured}
              disabledReason={!aiConfigured ? "ANTHROPIC_API_KEY未設定のため実行できません。" : undefined}
            />
          ) : (
            <ApproveIdeasForm
              action={approveIdeasAction.bind(null, id, review!.id)}
              ideas={review!.improvementIdeas!}
              approvedIdeaIds={review!.approvedIdeaIds}
            />
          )}
        </section>
      )}

      {/* ⑤⑥ Product Draft */}
      {hasIdeas && hasApproval && (
        <section className="card p-6 space-y-4">
          <h2 className="font-semibold text-stone-900">⑥ Product Draft</h2>
          {!hasDraft ? (
            <StageActionButton
              action={runProductDraftAction.bind(null, id, review!.id)}
              label="承認済みアイデアからProduct Draftを生成する"
              pendingLabel="生成中...（Claude APIを呼び出しています）"
              disabled={!aiConfigured}
              disabledReason={!aiConfigured ? "ANTHROPIC_API_KEY未設定のため実行できません。" : undefined}
            />
          ) : (
            <>
              {review!.productDraft!.unresolved_research_needed.length > 0 && (
                <p className="text-xs text-amber-700 bg-amber-50 border border-amber-200 rounded-lg px-3 py-2">
                  未解決の不足FACTが{review!.productDraft!.unresolved_research_needed.length}件残っています。
                </p>
              )}
              <AdoptDraftForm
                action={adoptDraftSectionsAction.bind(null, id, review!.id)}
                draft={review!.productDraft!}
                readOnly={isDemoProgram}
              />
            </>
          )}
        </section>
      )}

      {/* ⑦ Experience Design Review（Product Draftの体験設計を追加で評価した無料ドライラン） */}
      {hasExperienceDesignReview && (
        <section className="card p-6 space-y-4">
          <div>
            <h2 className="font-semibold text-stone-900">⑦ Experience Design Review</h2>
            <p className="text-xs text-stone-500 mt-1">
              ⑥ Product
              Draftを再生成せず、「5〜12歳が180分夢中になれるか」等の観点で体験設計そのものを追加評価した結果です。特に弱かった【触れる】工程については、最低3案の代替体験IDEAを検討しています。ここで挙げるIDEAは④の改善アイデアと合わせて⑤で採用/保留を判断できます。
            </p>
          </div>
          <div className="grid sm:grid-cols-2 gap-3">
            {experienceDesignIdeas.map((idea) => (
              <div key={idea.id} className="rounded-lg border border-violet-200 bg-violet-50/30 p-3">
                <div className="flex items-center gap-2 flex-wrap">
                  <span className={`badge ${FACT_STATUS_BADGE.IDEA}`}>IDEA</span>
                  <span className="text-xs text-stone-500">対応軸: {DIAGNOSIS_AXIS_LABELS[idea.target_axis]}</span>
                </div>
                <p className="font-medium text-sm text-stone-900 mt-1">{idea.title}</p>
                <p className="text-xs text-stone-600 mt-1 whitespace-pre-wrap">{idea.description}</p>
              </div>
            ))}
          </div>
          {hasIdeas && !hasApproval && (
            <p className="text-xs text-stone-500">
              採用するかどうかは、上の「④ 改善アイデア」内のチェックリストから選択・承認してください（このIDEA一覧もそこに含まれています）。
            </p>
          )}
        </section>
      )}
    </div>
  );
}
