"use client";

import { useEffect, useMemo, useRef, useState } from "react";
import { useActionState } from "react";
import { useRouter } from "next/navigation";
import { createProgramAction, type ProgramFormState } from "../actions";
import {
  CATEGORY_LABELS,
  FACT_STATUS_BADGE,
  FACT_STATUS_LABELS,
  RELATIONSHIP_CATEGORY_LABELS,
  SEASON_LABELS,
} from "@/lib/constants";
import { RESOURCE_CATEGORIES, SEASONS, PROGRAM_STATUSES } from "@/db/schema";
import {
  formatAgeRange,
  formatDurationRange,
  formatYen,
  estimatePerPersonPrice,
  matchesSeason,
} from "@/lib/utils";
import { PROGRAM_STATUS_LABELS } from "@/lib/constants";

type Region = { id: string; name: string };
type Resource = {
  id: string;
  regionId: string;
  category: string;
  name: string;
  summary: string;
  seasons: string[];
  tags: string[];
  factStatus: string;
};
type ActivityOpportunity = {
  id: string;
  primaryResourceId: string;
  title: string;
  appropriateAgeMin: number | null;
  appropriateAgeMax: number | null;
  durationMinutesMin: number | null;
  durationMinutesMax: number | null;
  seasons: string[];
  factStatus: string;
  requiredGroupSizeMin: number | null;
  requiredGroupSizeMax: number | null;
};
type Relationship = {
  id: string;
  fromResourceId: string;
  toResourceId: string;
  relationshipCategory: string;
  relationshipLabel: string;
  factStatus: string;
};
type MarketProgram = {
  id: string;
  title: string | null;
  matchedRegionId: string | null;
  targetAgeMin: number | null;
  targetAgeMax: number | null;
  durationMinutes: number | null;
};
type MarketPrice = { marketProgramId: string; priceType: string; amount: number; isAncillary?: boolean | null };

const STEPS = [
  "① 条件入力",
  "② 市場インサイト",
  "③ 地域資源探索",
  "④ 関連性探索",
  "⑤ 体験素材選択",
  "⑥ 企画作成・保存",
] as const;

export function ProgramWizard({
  regions,
  resources,
  activityOpportunities,
  relationships,
  marketPrograms,
  marketPrices,
}: {
  regions: Region[];
  resources: Resource[];
  activityOpportunities: ActivityOpportunity[];
  relationships: Relationship[];
  marketPrograms: MarketProgram[];
  marketPrices: MarketPrice[];
}) {
  const router = useRouter();
  const [step, setStep] = useState(1);

  // ── MVP実運用テスト用の操作時間計測（正式なプロダクト機能ではない） ──
  // ウィザード開始時刻・各STEPの滞在時間（戻る操作を含め合算）をrefで記録し、
  // 保存時にhidden fieldへ書き込んでサーバー側でprogram_wizard_logsに保存する。
  // stateではなくrefを使うのは、頻繁なstate更新による再レンダーを避けるためと、
  // 保存直前のonSubmitで最新の値を同期的にDOMへ反映させたいため。
  // Date.now()はレンダー中に呼べない（react-hooks/purity）ため、
  // マウント後のeffectで一度だけ開始時刻を記録する。
  const wizardStartedAtRef = useRef<number>(0);
  const stepEnteredAtRef = useRef<number>(0);
  const stepDurationsRef = useRef<Record<number, number>>({});
  const wizardStartedAtInputRef = useRef<HTMLInputElement>(null);
  const stepDurationsInputRef = useRef<HTMLInputElement>(null);

  useEffect(() => {
    if (wizardStartedAtRef.current === 0) {
      const now = Date.now();
      wizardStartedAtRef.current = now;
      stepEnteredAtRef.current = now;
    }
  }, []);

  function goToStep(n: number) {
    // goToStepは各STEPボタンのonClickからのみ呼ばれるイベントハンドラで、レンダー中には実行されない。
    // react-hooks/purityはこれを静的に判別できず誤検知するため、この行のみ無効化する。
    // eslint-disable-next-line react-hooks/purity
    const now = Date.now();
    const elapsed = now - stepEnteredAtRef.current;
    stepDurationsRef.current[step] = (stepDurationsRef.current[step] ?? 0) + elapsed;
    stepEnteredAtRef.current = now;
    setStep(n);
  }

  function handleWizardSubmit() {
    const now = Date.now();
    const elapsed = now - stepEnteredAtRef.current;
    const finalDurations = {
      ...stepDurationsRef.current,
      [step]: (stepDurationsRef.current[step] ?? 0) + elapsed,
    };
    // 秒単位に丸めてJSONで保持する（開発用ログとして十分な精度）
    const durationsSeconds: Record<string, number> = {};
    for (const [k, v] of Object.entries(finalDurations)) {
      durationsSeconds[k] = Math.round(v / 1000);
    }
    if (wizardStartedAtInputRef.current) {
      wizardStartedAtInputRef.current.value = new Date(wizardStartedAtRef.current).toISOString();
    }
    if (stepDurationsInputRef.current) {
      stepDurationsInputRef.current.value = JSON.stringify(durationsSeconds);
    }
    // 開発用ログ: 実運用テスト中にどのSTEPで時間がかかっているかをその場で確認できるよう
    // ブラウザのconsoleにも出力する（正式な分析基盤の代わり）
    console.log("[wizard-timing] 企画作成にかかった時間（STEP別・秒）:", durationsSeconds);
  }

  // ── ①条件入力 ──
  const [regionId, setRegionId] = useState(regions[0]?.id ?? "");
  const [ageMin, setAgeMin] = useState("");
  const [ageMax, setAgeMax] = useState("");
  const [season, setSeason] = useState<string>("");
  const [targetDuration, setTargetDuration] = useState("");
  const [targetPrice, setTargetPrice] = useState("");

  // ── ③④体験素材の選択状態 ──
  const [selectedResourceIds, setSelectedResourceIds] = useState<Set<string>>(new Set());
  const [selectedOpportunityIds, setSelectedOpportunityIds] = useState<Set<string>>(new Set());
  const [resourceKeyword, setResourceKeyword] = useState("");
  const [resourceCategory, setResourceCategory] = useState("");

  // ── ⑥企画作成 ──
  const [fields, setFields] = useState({
    title: "",
    concept: "",
    targetAudience: "",
    marketNeeds: "",
    whyChichibu: "",
    experienceContent: "",
    inquiryTheme: "",
    participantQuestions: "",
    durationMinutes: "",
    capacityMin: "",
    capacityMax: "",
    recommendedPrice: "",
    status: "IDEA" as string,
  });
  const [fieldsInitializedFromConditions, setFieldsInitializedFromConditions] = useState(false);

  const [state, formAction, pending] = useActionState<ProgramFormState, FormData>(
    createProgramAction,
    undefined
  );

  function toggleResource(id: string) {
    setSelectedResourceIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }
  function toggleOpportunity(id: string) {
    setSelectedOpportunityIds((prev) => {
      const next = new Set(prev);
      if (next.has(id)) next.delete(id);
      else next.add(id);
      return next;
    });
  }

  // ── ②市場インサイト（選択条件でフィルタした簡易集計） ──
  const marketInsight = useMemo(() => {
    const age = ageMin ? Number(ageMin) : ageMax ? Number(ageMax) : null;
    const filtered = marketPrograms.filter((p) => {
      if (regionId && p.matchedRegionId && p.matchedRegionId !== regionId) return false;
      if (age != null) {
        if (p.targetAgeMin != null && age < p.targetAgeMin) return false;
        if (p.targetAgeMax != null && age > p.targetAgeMax) return false;
      }
      return true;
    });
    const estimates = filtered
      .map((p) => estimatePerPersonPrice(marketPrices.filter((pr) => pr.marketProgramId === p.id)))
      .filter((e): e is NonNullable<typeof e> => e !== null);
    const avg = estimates.length
      ? Math.round(estimates.reduce((a, b) => a + b.value, 0) / estimates.length)
      : null;
    const durations = filtered.map((p) => p.durationMinutes).filter((d): d is number => d != null);
    const avgDuration = durations.length
      ? Math.round(durations.reduce((a, b) => a + b, 0) / durations.length)
      : null;
    return { filtered, avg, avgDuration, estimateCount: estimates.length };
  }, [marketPrograms, marketPrices, regionId, ageMin, ageMax]);

  // ── ③候補資源 ──
  const filteredResources = useMemo(() => {
    return resources.filter((r) => {
      if (regionId && r.regionId !== regionId) return false;
      if (season && !matchesSeason(r.seasons, season)) return false;
      if (resourceCategory && r.category !== resourceCategory) return false;
      if (resourceKeyword) {
        const kw = resourceKeyword.toLowerCase();
        const hay = `${r.name} ${r.summary} ${r.tags.join(" ")}`.toLowerCase();
        if (!hay.includes(kw)) return false;
      }
      return true;
    });
  }, [resources, regionId, season, resourceCategory, resourceKeyword]);

  // ── ④選択中の資源に関連する関係性 ──
  const relatedRelationships = useMemo(() => {
    return relationships.filter(
      (rel) => selectedResourceIds.has(rel.fromResourceId) || selectedResourceIds.has(rel.toResourceId)
    );
  }, [relationships, selectedResourceIds]);

  // ── ⑤選択資源に紐づく体験機会（条件マッチを先頭に） ──
  const candidateOpportunities = useMemo(() => {
    const age = ageMin ? Number(ageMin) : ageMax ? Number(ageMax) : null;
    const list = activityOpportunities.filter((o) => selectedResourceIds.has(o.primaryResourceId));
    const matches = (o: ActivityOpportunity) => {
      let score = 0;
      if (age != null) {
        const okAge =
          (o.appropriateAgeMin == null || age >= o.appropriateAgeMin) &&
          (o.appropriateAgeMax == null || age <= o.appropriateAgeMax);
        if (okAge) score += 1;
      }
      if (season && matchesSeason(o.seasons, season)) score += 1;
      if (targetDuration) {
        const target = Number(targetDuration);
        const okDuration =
          (o.durationMinutesMin == null || target >= o.durationMinutesMin - 30) &&
          (o.durationMinutesMax == null || target <= o.durationMinutesMax + 30);
        if (okDuration) score += 1;
      }
      return score;
    };
    return [...list].sort((a, b) => matches(b) - matches(a));
  }, [activityOpportunities, selectedResourceIds, ageMin, ageMax, season, targetDuration]);

  function resourceName(id: string) {
    return resources.find((r) => r.id === id)?.name ?? "-";
  }

  function goToStep6() {
    if (!fieldsInitializedFromConditions) {
      setFields((f) => ({
        ...f,
        durationMinutes: targetDuration || f.durationMinutes,
        recommendedPrice: targetPrice || f.recommendedPrice,
      }));
      setFieldsInitializedFromConditions(true);
    }
    goToStep(6);
  }

  return (
    <div className="space-y-6">
      <div className="card p-3 flex flex-wrap gap-1">
        {STEPS.map((label, i) => {
          const n = i + 1;
          const reachable = n === 1 || regionId; // 地域未選択の間はstep1に留める簡易ガード
          return (
            <button
              key={label}
              type="button"
              disabled={!reachable}
              onClick={() => (n === 6 ? goToStep6() : goToStep(n))}
              className={`px-3 py-1.5 rounded-lg text-xs font-medium whitespace-nowrap ${
                step === n
                  ? "bg-river-600 text-white"
                  : "text-stone-600 hover:bg-stone-100 disabled:opacity-40"
              }`}
            >
              {label}
            </button>
          );
        })}
      </div>

      <div className="card p-3 flex flex-wrap gap-4 text-xs text-stone-500 bg-stone-50">
        <span>
          選択中の地域資源: <span className="font-semibold text-stone-900">{selectedResourceIds.size}件</span>
        </span>
        <span>
          選択中の体験機会: <span className="font-semibold text-stone-900">{selectedOpportunityIds.size}件</span>
        </span>
        {regionId && (
          <span>
            地域: <span className="font-semibold text-stone-900">{regions.find((r) => r.id === regionId)?.name}</span>
          </span>
        )}
      </div>

      {step === 1 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">① 条件入力</h2>
          <div className="grid sm:grid-cols-2 gap-5">
            <div>
              <label className="label" htmlFor="wizard-region">地域 *</label>
              <select id="wizard-region" className="input" value={regionId} onChange={(e) => setRegionId(e.target.value)}>
                <option value="" disabled>
                  選択してください
                </option>
                {regions.map((r) => (
                  <option key={r.id} value={r.id}>
                    {r.name}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label" htmlFor="wizard-season">季節</label>
              <select id="wizard-season" className="input" value={season} onChange={(e) => setSeason(e.target.value)}>
                <option value="">指定なし</option>
                {SEASONS.map((s) => (
                  <option key={s} value={s}>
                    {SEASON_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
            <div>
              <label className="label">対象年齢</label>
              <div className="flex items-center gap-2">
                <input id="wizard-age-min" className="input" type="number" min={0} value={ageMin} onChange={(e) => setAgeMin(e.target.value)} placeholder="下限" />
                <span className="text-stone-400">〜</span>
                <input id="wizard-age-max" className="input" type="number" min={0} value={ageMax} onChange={(e) => setAgeMax(e.target.value)} placeholder="上限" />
              </div>
            </div>
            <div>
              <label className="label" htmlFor="wizard-duration">希望所要時間（分）</label>
              <input id="wizard-duration" className="input" type="number" min={0} value={targetDuration} onChange={(e) => setTargetDuration(e.target.value)} placeholder="例：180" />
            </div>
            <div>
              <label className="label" htmlFor="wizard-price">希望価格（1人あたり・円）</label>
              <input id="wizard-price" className="input" type="number" min={0} value={targetPrice} onChange={(e) => setTargetPrice(e.target.value)} placeholder="例：6000" />
            </div>
          </div>
          <div className="flex justify-end">
            <button type="button" disabled={!regionId} className="btn btn-primary" onClick={() => goToStep(2)}>
              次へ：市場インサイトを見る →
            </button>
          </div>
        </div>
      )}

      {step === 2 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">② 市場インサイト</h2>
          <p className="text-xs text-stone-500">
            指定した地域・年齢に近い市場プログラム（{marketInsight.filtered.length}件）の参考集計です。
          </p>
          <div className="grid sm:grid-cols-3 gap-4">
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">平均 参考換算価格</p>
              <p className="mt-1 text-xl font-bold text-river-700">
                {marketInsight.avg != null ? formatYen(marketInsight.avg) : "データ不足"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">平均所要時間</p>
              <p className="mt-1 text-xl font-bold text-river-700">
                {marketInsight.avgDuration != null ? `${marketInsight.avgDuration}分` : "データ不足"}
              </p>
            </div>
            <div className="card p-4">
              <p className="text-xs font-medium text-stone-500">価格情報あり件数</p>
              <p className="mt-1 text-xl font-bold text-river-700">{marketInsight.estimateCount}件</p>
            </div>
          </div>
          {targetPrice && marketInsight.avg != null && (
            <p className="text-xs text-stone-500">
              希望価格（{formatYen(Number(targetPrice))}）は市場平均（{formatYen(marketInsight.avg)}）と比較して
              {Number(targetPrice) > marketInsight.avg ? "やや高め" : Number(targetPrice) < marketInsight.avg ? "やや控えめ" : "同程度"}
              です。※参考値であり判断はご自身で行ってください。
            </p>
          )}
          <div className="rounded-lg border border-amber-200 bg-amber-50 px-4 py-3 text-xs text-amber-800">
            表示価格はすべて「参考換算価格」（家族・団体料金の按分概算を含む）です。詳細は市場プログラム一覧・市場インサイト画面で確認できます。
          </div>
          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(1)}>
              ← 戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={() => goToStep(3)}>
              次へ：地域資源を探索する →
            </button>
          </div>
        </div>
      )}

      {step === 3 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">③ 地域資源探索</h2>
          <div className="grid sm:grid-cols-3 gap-3">
            <input id="wizard-resource-keyword" className="input" placeholder="キーワード検索" value={resourceKeyword} onChange={(e) => setResourceKeyword(e.target.value)} />
            <select id="wizard-resource-category" className="input" value={resourceCategory} onChange={(e) => setResourceCategory(e.target.value)}>
              <option value="">カテゴリー：すべて</option>
              {RESOURCE_CATEGORIES.map((c) => (
                <option key={c} value={c}>
                  {CATEGORY_LABELS[c]}
                </option>
              ))}
            </select>
            <p className="text-xs text-stone-400 self-center">
              季節「{season ? SEASON_LABELS[season] : "指定なし"}」で絞り込み中（①で変更可）
            </p>
          </div>
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg max-h-[28rem] overflow-y-auto">
            {filteredResources.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">
                該当する地域資源が見つかりません。条件を変えるか、先に地域資源DBへ登録してください。
              </p>
            )}
            {filteredResources.map((r) => (
              <label key={r.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={selectedResourceIds.has(r.id)} onChange={() => toggleResource(r.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <span className="badge bg-stone-100 text-stone-700">{CATEGORY_LABELS[r.category]}</span>
                    <p className="text-sm font-medium text-stone-900">{r.name}</p>
                    <span className={`badge ${FACT_STATUS_BADGE[r.factStatus]}`}>{FACT_STATUS_LABELS[r.factStatus]}</span>
                  </div>
                  {r.summary && <p className="mt-0.5 text-xs text-stone-500 line-clamp-1">{r.summary}</p>}
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(2)}>
              ← 戻る
            </button>
            <button type="button" disabled={selectedResourceIds.size === 0} className="btn btn-primary" onClick={() => goToStep(4)}>
              次へ：関連性を探索する →
            </button>
          </div>
        </div>
      )}

      {step === 4 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">④ 関連性探索</h2>
          <p className="text-xs text-stone-500">
            選択中の地域資源に関わる関係性です。関連する資源を選択に追加できます（任意のステップです）。
          </p>
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg max-h-[28rem] overflow-y-auto">
            {relatedRelationships.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">
                選択中の資源に関する関係性はまだ登録されていません。このまま次へ進めます。
              </p>
            )}
            {relatedRelationships.map((rel) => {
              const other = selectedResourceIds.has(rel.fromResourceId) ? rel.toResourceId : rel.fromResourceId;
              const already = selectedResourceIds.has(other);
              return (
                <div key={rel.id} className="flex items-center justify-between gap-3 px-4 py-3">
                  <div className="min-w-0">
                    <p className="text-sm text-stone-900">
                      {resourceName(rel.fromResourceId)}
                      <span className="mx-1.5 text-stone-400">→</span>
                      {resourceName(rel.toResourceId)}
                    </p>
                    <p className="text-xs text-stone-500">
                      {rel.relationshipLabel}（{RELATIONSHIP_CATEGORY_LABELS[rel.relationshipCategory]}） ／{" "}
                      <span className={`badge ${FACT_STATUS_BADGE[rel.factStatus]}`}>{FACT_STATUS_LABELS[rel.factStatus]}</span>
                    </p>
                  </div>
                  <button
                    type="button"
                    className="btn btn-secondary text-xs shrink-0"
                    disabled={already}
                    onClick={() => toggleResource(other)}
                  >
                    {already ? "選択済み" : `${resourceName(other)}を追加`}
                  </button>
                </div>
              );
            })}
          </div>
          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(3)}>
              ← 戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={() => goToStep(5)}>
              次へ：体験素材を選ぶ →
            </button>
          </div>
        </div>
      )}

      {step === 5 && (
        <div className="card p-6 space-y-5">
          <h2 className="text-lg font-bold text-stone-900">⑤ 体験素材選択</h2>
          <p className="text-xs text-stone-500">
            選択中の地域資源に紐づく体験機会です。条件（年齢・季節・所要時間）に近いものを上位に表示しています。2〜3個ほど選ぶことをおすすめします。
          </p>
          <div className="divide-y divide-stone-100 border border-stone-100 rounded-lg max-h-[28rem] overflow-y-auto">
            {candidateOpportunities.length === 0 && (
              <p className="px-4 py-8 text-center text-sm text-stone-400">
                選択中の資源に体験機会がまだ登録されていません。資源詳細ページから体験機会を追加するか、③に戻って他の資源を選んでください。
              </p>
            )}
            {candidateOpportunities.map((o) => (
              <label key={o.id} className="flex items-start gap-3 px-4 py-3 hover:bg-stone-50 cursor-pointer">
                <input type="checkbox" className="mt-1" checked={selectedOpportunityIds.has(o.id)} onChange={() => toggleOpportunity(o.id)} />
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2 flex-wrap">
                    <p className="text-sm font-medium text-stone-900">{o.title}</p>
                    <span className={`badge ${FACT_STATUS_BADGE[o.factStatus]}`}>{FACT_STATUS_LABELS[o.factStatus]}</span>
                  </div>
                  <p className="mt-0.5 text-xs text-stone-500">
                    資源: {resourceName(o.primaryResourceId)} ／ 対象年齢: {formatAgeRange(o.appropriateAgeMin, o.appropriateAgeMax)} ／ 所要時間:{" "}
                    {formatDurationRange(o.durationMinutesMin, o.durationMinutesMax)}
                  </p>
                </div>
              </label>
            ))}
          </div>
          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(4)}>
              ← 戻る
            </button>
            <button type="button" className="btn btn-primary" onClick={goToStep6}>
              次へ：企画を作成する →
            </button>
          </div>
        </div>
      )}

      {step === 6 && (
        <form action={formAction} onSubmit={handleWizardSubmit} className="card p-6 space-y-6">
          <h2 className="text-lg font-bold text-stone-900">⑥ 企画作成・保存</h2>

          <div className="card p-4 bg-stone-50 space-y-2">
            <p className="text-xs font-semibold text-stone-500">選択中の地域資源（{selectedResourceIds.size}件）</p>
            <div className="flex flex-wrap gap-1.5">
              {[...selectedResourceIds].map((id) => (
                <span key={id} className="badge bg-white border border-stone-200 text-stone-700">
                  {resourceName(id)}
                </span>
              ))}
            </div>
            <p className="text-xs font-semibold text-stone-500 pt-2">選択中の体験機会（{selectedOpportunityIds.size}件）</p>
            <div className="flex flex-wrap gap-1.5">
              {[...selectedOpportunityIds].map((id) => (
                <span key={id} className="badge bg-white border border-stone-200 text-stone-700">
                  {activityOpportunities.find((o) => o.id === id)?.title ?? id}
                </span>
              ))}
            </div>
          </div>

          <input type="hidden" name="regionId" value={regionId} />
          {[...selectedResourceIds].map((id) => (
            <input key={id} type="hidden" name="resourceIds" value={id} />
          ))}
          {[...selectedOpportunityIds].map((id) => (
            <input key={id} type="hidden" name="activityOpportunityIds" value={id} />
          ))}
          {season && <input type="hidden" name="seasons" value={season} />}
          {/* MVP実運用テスト用の操作時間計測ログ（正式なプロダクト機能ではない）。
              値はhandleWizardSubmit内でrefから直接DOMに書き込む。 */}
          <input type="hidden" name="wizardStartedAt" ref={wizardStartedAtInputRef} defaultValue="" />
          <input type="hidden" name="wizardStepDurationsJson" ref={stepDurationsInputRef} defaultValue="" />
          <input type="hidden" name="targetAgeMin" value={ageMin} />
          <input type="hidden" name="targetAgeMax" value={ageMax} />

          <div className="grid sm:grid-cols-2 gap-5">
            <div className="sm:col-span-2">
              <label className="label">タイトル *</label>
              <input
                name="title"
                required
                className="input"
                value={fields.title}
                onChange={(e) => setFields((f) => ({ ...f, title: e.target.value }))}
                placeholder="例：秋の荒川ジオ探検＆水生生物観察ツアー"
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">コンセプト</label>
              <textarea
                name="concept"
                rows={2}
                className="input"
                value={fields.concept}
                onChange={(e) => setFields((f) => ({ ...f, concept: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">ターゲット層</label>
              <input
                name="targetAudience"
                className="input"
                value={fields.targetAudience}
                onChange={(e) => setFields((f) => ({ ...f, targetAudience: e.target.value }))}
                placeholder="例：小学3〜6年の親子"
              />
            </div>
            <div>
              <label className="label">市場ニーズ（②を踏まえたメモ）</label>
              <input
                name="marketNeeds"
                className="input"
                value={fields.marketNeeds}
                onChange={(e) => setFields((f) => ({ ...f, marketNeeds: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">なぜこの地域か</label>
              <textarea
                name="whyChichibu"
                rows={2}
                className="input"
                value={fields.whyChichibu}
                onChange={(e) => setFields((f) => ({ ...f, whyChichibu: e.target.value }))}
              />
            </div>
            <div className="sm:col-span-2">
              <label className="label">体験内容</label>
              <textarea
                name="experienceContent"
                rows={3}
                className="input"
                value={fields.experienceContent}
                onChange={(e) => setFields((f) => ({ ...f, experienceContent: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">探究テーマ</label>
              <input
                name="inquiryTheme"
                className="input"
                value={fields.inquiryTheme}
                onChange={(e) => setFields((f) => ({ ...f, inquiryTheme: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">参加者への問いかけ</label>
              <input
                name="participantQuestions"
                className="input"
                value={fields.participantQuestions}
                onChange={(e) => setFields((f) => ({ ...f, participantQuestions: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">所要時間（分）</label>
              <input
                name="durationMinutes"
                type="number"
                min={0}
                className="input"
                value={fields.durationMinutes}
                onChange={(e) => setFields((f) => ({ ...f, durationMinutes: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">想定価格（1人あたり・円）</label>
              <input
                name="recommendedPrice"
                type="number"
                min={0}
                className="input"
                value={fields.recommendedPrice}
                onChange={(e) => setFields((f) => ({ ...f, recommendedPrice: e.target.value }))}
              />
            </div>
            <div>
              <label className="label">定員</label>
              <div className="flex items-center gap-2">
                <input
                  name="capacityMin"
                  type="number"
                  min={0}
                  className="input"
                  value={fields.capacityMin}
                  onChange={(e) => setFields((f) => ({ ...f, capacityMin: e.target.value }))}
                  placeholder="下限"
                />
                <span className="text-stone-400">〜</span>
                <input
                  name="capacityMax"
                  type="number"
                  min={0}
                  className="input"
                  value={fields.capacityMax}
                  onChange={(e) => setFields((f) => ({ ...f, capacityMax: e.target.value }))}
                  placeholder="上限"
                />
              </div>
            </div>
            <div>
              <label className="label">ステータス</label>
              <select
                name="status"
                className="input"
                value={fields.status}
                onChange={(e) => setFields((f) => ({ ...f, status: e.target.value }))}
              >
                {PROGRAM_STATUSES.map((s) => (
                  <option key={s} value={s}>
                    {PROGRAM_STATUS_LABELS[s]}
                  </option>
                ))}
              </select>
            </div>
          </div>

          {state?.error && (
            <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
          )}

          <div className="flex justify-between">
            <button type="button" className="btn btn-secondary" onClick={() => goToStep(5)}>
              ← 戻る
            </button>
            <div className="flex gap-3">
              <button type="button" onClick={() => router.push("/programs")} className="btn btn-secondary">
                キャンセル
              </button>
              <button type="submit" disabled={pending} className="btn btn-primary">
                {pending ? "保存中..." : "企画を保存する"}
              </button>
            </div>
          </div>
        </form>
      )}
    </div>
  );
}
