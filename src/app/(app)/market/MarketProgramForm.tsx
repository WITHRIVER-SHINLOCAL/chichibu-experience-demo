"use client";

import { useActionState } from "react";
import { useRouter } from "next/navigation";
import type { MarketProgramFormState } from "./actions";
import { useRetryFormKey, strValue } from "@/lib/use-retry-form";
import { PriceRowsEditor, type PriceRow } from "./PriceRowsEditor";
import { MARKET_RESEARCH_CHECKLIST_ITEMS } from "@/lib/constants";

// Market Research v2: 「確認したが記載なし」チェックボックス。任意入力であり、
// チェックしなくても保存は可能（＝未収集のまま途中保存できる）。
function ConfirmedEmptyCheckbox({
  itemKey,
  defaultChecked,
  label,
}: {
  itemKey: string;
  defaultChecked: boolean;
  label?: string;
}) {
  const itemLabel = label ?? MARKET_RESEARCH_CHECKLIST_ITEMS.find((i) => i.key === itemKey)?.label ?? itemKey;
  return (
    <label className="flex items-center gap-1.5 text-xs text-stone-500 mt-1">
      <input type="checkbox" name="researchedEmptyItems" value={itemKey} defaultChecked={defaultChecked} />
      「{itemLabel}」を確認したが記載なし
    </label>
  );
}

type RegionOption = { id: string; name: string };
type SourceOption = { id: string; sourceName: string };
type PlatformOption = { id: string; name: string };

type Defaults = {
  programName?: string | null;
  platformName?: string | null;
  url?: string | null;
  categoryRaw?: string | null;
  areaText?: string | null;
  matchedRegionId?: string | null;
  targetAgeMin?: number | null;
  targetAgeMax?: number | null;
  durationMinutes?: number | null;
  capacityMin?: number | null;
  capacityMax?: number | null;
  parentAccompaniment?: string | null;
  title?: string;
  catchCopy?: string | null;
  description?: string | null;
  flow?: string | null;
  mainActivities?: string[];
  learningElements?: string[];
  takeawayElements?: string[];
  marketingMessages?: string[];
  instructorNotes?: string[];
  reviewRating?: number | null;
  reviewCount?: number | null;
  reviewCheckedAt?: string | null;
  researchedEmptyItems?: string[];
  eventDates?: string[];
  bookingStatus?: string | null;
  fullBookedFlag?: boolean | null;
  safetyManagement?: string | null;
  rainPolicy?: string | null;
  cancellationPolicy?: string | null;
  sourceId?: string | null;
  lastCheckedAt?: string | null;
  priceRows?: PriceRow[];
};

export function MarketProgramForm({
  action,
  regions,
  sources,
  platforms,
  defaults,
  submitLabel,
}: {
  action: (state: MarketProgramFormState, formData: FormData) => Promise<MarketProgramFormState>;
  regions: RegionOption[];
  sources: SourceOption[];
  platforms: PlatformOption[];
  defaults?: Defaults;
  submitLabel: string;
}) {
  const [state, formAction, pending] = useActionState<MarketProgramFormState, FormData>(
    action,
    undefined
  );
  const router = useRouter();
  const formKey = useRetryFormKey(state);
  const v = state?.values;
  const num = (n: number | null | undefined) => (n == null ? "" : String(n));
  const emptySet = new Set(defaults?.researchedEmptyItems ?? []);
  const isEmpty = (key: string) => emptySet.has(key);

  let initialRows: PriceRow[] | undefined = defaults?.priceRows;
  const retryRowsJson = strValue(v, "priceRowsJson", "");
  if (retryRowsJson) {
    try {
      const parsed = JSON.parse(retryRowsJson);
      if (Array.isArray(parsed)) initialRows = parsed;
    } catch {
      // ignore malformed retry payload, fall back to defaults
    }
  }

  return (
    <form key={formKey} action={formAction} className="space-y-8">
      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">基本情報</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="title">
              タイトル <span className="text-red-500">*</span>
            </label>
            <input id="title" name="title" required defaultValue={strValue(v, "title", defaults?.title)} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="programName">
              管理用プログラム名（任意）
            </label>
            <input id="programName" name="programName" defaultValue={strValue(v, "programName", defaults?.programName ?? "")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="platformName">
              プラットフォーム
            </label>
            <input
              id="platformName"
              name="platformName"
              list="platform-list"
              defaultValue={strValue(v, "platformName", defaults?.platformName ?? "")}
              className="input"
              placeholder="例：ギフテ！、aini"
            />
            <datalist id="platform-list">
              {platforms.map((p) => (
                <option key={p.id} value={p.name} />
              ))}
            </datalist>
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="url">
              URL
            </label>
            <input id="url" name="url" defaultValue={strValue(v, "url", defaults?.url ?? "")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="categoryRaw">
              カテゴリー（プラットフォーム表記そのまま）
            </label>
            <input id="categoryRaw" name="categoryRaw" defaultValue={strValue(v, "categoryRaw", defaults?.categoryRaw ?? "")} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="areaText">
              エリア（プラットフォーム表記そのまま）
            </label>
            <input id="areaText" name="areaText" defaultValue={strValue(v, "areaText", defaults?.areaText ?? "")} className="input" placeholder="例：埼玉県横瀬町" />
          </div>
          <div>
            <label className="label" htmlFor="matchedRegionId">
              対応する地域（REGIONマスタ）
            </label>
            <select id="matchedRegionId" name="matchedRegionId" defaultValue={strValue(v, "matchedRegionId", defaults?.matchedRegionId ?? "")} className="input">
              <option value="">未設定</option>
              {regions.map((r) => (
                <option key={r.id} value={r.id}>
                  {r.name}
                </option>
              ))}
            </select>
          </div>
          <div>
            <label className="label" htmlFor="lastCheckedAt">
              最終確認日
            </label>
            <input id="lastCheckedAt" name="lastCheckedAt" type="date" defaultValue={strValue(v, "lastCheckedAt", defaults?.lastCheckedAt ?? "")} className="input" />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">対象・規模・所要時間</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label">対象年齢（ターゲット）</label>
            <div className="flex items-center gap-2">
              <input name="targetAgeMin" type="number" min={0} defaultValue={strValue(v, "targetAgeMin", num(defaults?.targetAgeMin))} className="input" placeholder="下限" />
              <span className="text-stone-400">〜</span>
              <input name="targetAgeMax" type="number" min={0} defaultValue={strValue(v, "targetAgeMax", num(defaults?.targetAgeMax))} className="input" placeholder="上限" />
            </div>
            <ConfirmedEmptyCheckbox itemKey="target" defaultChecked={isEmpty("target")} />
          </div>
          <div>
            <label className="label" htmlFor="durationMinutes">
              所要時間（分）
            </label>
            <input id="durationMinutes" name="durationMinutes" type="number" min={0} defaultValue={strValue(v, "durationMinutes", num(defaults?.durationMinutes))} className="input" />
            <ConfirmedEmptyCheckbox itemKey="duration" defaultChecked={isEmpty("duration")} />
          </div>
          <div>
            <label className="label">定員</label>
            <div className="flex items-center gap-2">
              <input name="capacityMin" type="number" min={0} defaultValue={strValue(v, "capacityMin", num(defaults?.capacityMin))} className="input" placeholder="下限" />
              <span className="text-stone-400">〜</span>
              <input name="capacityMax" type="number" min={0} defaultValue={strValue(v, "capacityMax", num(defaults?.capacityMax))} className="input" placeholder="上限" />
            </div>
          </div>
          <div>
            <label className="label" htmlFor="parentAccompaniment">
              保護者同伴の要否等
            </label>
            <input id="parentAccompaniment" name="parentAccompaniment" defaultValue={strValue(v, "parentAccompaniment", defaults?.parentAccompaniment ?? "")} className="input" />
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">内容</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div className="sm:col-span-2">
            <label className="label" htmlFor="catchCopy">
              キャッチコピー
            </label>
            <input id="catchCopy" name="catchCopy" defaultValue={strValue(v, "catchCopy", defaults?.catchCopy ?? "")} className="input" />
            <ConfirmedEmptyCheckbox itemKey="catchCopy" defaultChecked={isEmpty("catchCopy")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="description">
              体験内容（説明文）
            </label>
            <textarea id="description" name="description" rows={3} defaultValue={strValue(v, "description", defaults?.description ?? "")} className="input" />
            <ConfirmedEmptyCheckbox itemKey="description" defaultChecked={isEmpty("description")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="flow">
              当日の流れ
            </label>
            <textarea id="flow" name="flow" rows={2} defaultValue={strValue(v, "flow", defaults?.flow ?? "")} className="input" />
            <ConfirmedEmptyCheckbox itemKey="flow" defaultChecked={isEmpty("flow")} />
          </div>
          <div>
            <label className="label" htmlFor="mainActivities">
              主な活動内容（カンマ区切り）
            </label>
            <input id="mainActivities" name="mainActivities" defaultValue={strValue(v, "mainActivities", (defaults?.mainActivities ?? []).join("、"))} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="learningElements">
              学びの要素（カンマ区切り）
            </label>
            <input id="learningElements" name="learningElements" defaultValue={strValue(v, "learningElements", (defaults?.learningElements ?? []).join("、"))} className="input" />
            <ConfirmedEmptyCheckbox itemKey="learningElements" defaultChecked={isEmpty("learningElements")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="takeawayElements">
              持ち帰れるもの・成果物（カンマ区切り）
            </label>
            <input id="takeawayElements" name="takeawayElements" defaultValue={strValue(v, "takeawayElements", (defaults?.takeawayElements ?? []).join("、"))} className="input" />
            <ConfirmedEmptyCheckbox itemKey="takeawayElements" defaultChecked={isEmpty("takeawayElements")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="instructorNotes">
              講師・ガイド・案内人（カンマ区切り。氏名・役割をそのまま記載）
            </label>
            <input
              id="instructorNotes"
              name="instructorNotes"
              defaultValue={strValue(v, "instructorNotes", (defaults?.instructorNotes ?? []).join("、"))}
              className="input"
              placeholder="例：久米悠平氏（5代目養蚕農家）"
            />
            <ConfirmedEmptyCheckbox itemKey="instructorNotes" defaultChecked={isEmpty("instructorNotes")} />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="marketingMessages">
              訴求文（カンマ区切り・RAW FACT）
            </label>
            <input
              id="marketingMessages"
              name="marketingMessages"
              defaultValue={strValue(v, "marketingMessages", (defaults?.marketingMessages ?? []).join("、"))}
              className="input"
              placeholder="元ページ上の訴求文・特別感を示す文言などをそのまま転記（親向け／子ども向け／特別感などの分類はしない）"
            />
            <p className="mt-1 text-xs text-stone-400">
              ここには元ページの文言をそのまま採取します。「親向け」「子ども向け」「特別感」といった分類・解釈は行いません（分類自体が解釈のため）。分類・解釈は保存後の詳細画面でMARKET_PROGRAM_ANALYSIS（INFERENCE）として別途記録します。
            </p>
            <div className="flex flex-wrap gap-4">
              <ConfirmedEmptyCheckbox itemKey="parentAppeal" defaultChecked={isEmpty("parentAppeal")} />
              <ConfirmedEmptyCheckbox itemKey="childAppeal" defaultChecked={isEmpty("childAppeal")} />
              <ConfirmedEmptyCheckbox itemKey="specialness" defaultChecked={isEmpty("specialness")} />
            </div>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">評価・予約状況</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="reviewRating">
              サイト表示の評価点
            </label>
            <input id="reviewRating" name="reviewRating" type="number" step="0.1" min={0} max={5} defaultValue={strValue(v, "reviewRating", num(defaults?.reviewRating))} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="reviewCount">
              レビュー件数
            </label>
            <input id="reviewCount" name="reviewCount" type="number" min={0} defaultValue={strValue(v, "reviewCount", num(defaults?.reviewCount))} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="reviewCheckedAt">
              レビュー確認日
            </label>
            <input
              id="reviewCheckedAt"
              name="reviewCheckedAt"
              type="date"
              defaultValue={strValue(v, "reviewCheckedAt", defaults?.reviewCheckedAt ?? "")}
              className="input"
            />
            <p className="mt-1 text-xs text-stone-400">
              レビュー本文の全文はここには保存しません。レビューから読み取った子どもの反応・安全性評価等の解釈は詳細画面でMARKET_PROGRAM_ANALYSIS（INFERENCE）として別途記録します。
            </p>
            <ConfirmedEmptyCheckbox itemKey="review" defaultChecked={isEmpty("review")} />
          </div>
          <div>
            <label className="label" htmlFor="eventDates">
              開催日（カンマ区切り）
            </label>
            <input id="eventDates" name="eventDates" defaultValue={strValue(v, "eventDates", (defaults?.eventDates ?? []).join("、"))} className="input" />
          </div>
          <div>
            <label className="label" htmlFor="bookingStatus">
              予約状況
            </label>
            <input id="bookingStatus" name="bookingStatus" defaultValue={strValue(v, "bookingStatus", defaults?.bookingStatus ?? "")} className="input" placeholder="例：残席わずか" />
          </div>
          <div>
            <label className="label" htmlFor="fullBookedFlag">
              満席フラグ
            </label>
            <select id="fullBookedFlag" name="fullBookedFlag" defaultValue={strValue(v, "fullBookedFlag", defaults?.fullBookedFlag == null ? "" : String(defaults.fullBookedFlag))} className="input">
              <option value="">未確認</option>
              <option value="true">満席</option>
              <option value="false">空きあり</option>
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">安全・キャンセル</h2>
        <div className="grid sm:grid-cols-2 gap-5">
          <div>
            <label className="label" htmlFor="safetyManagement">
              安全管理体制
            </label>
            <textarea id="safetyManagement" name="safetyManagement" rows={2} defaultValue={strValue(v, "safetyManagement", defaults?.safetyManagement ?? "")} className="input" />
            <ConfirmedEmptyCheckbox itemKey="safetyManagement" defaultChecked={isEmpty("safetyManagement")} />
          </div>
          <div>
            <label className="label" htmlFor="rainPolicy">
              雨天時の扱い
            </label>
            <textarea id="rainPolicy" name="rainPolicy" rows={2} defaultValue={strValue(v, "rainPolicy", defaults?.rainPolicy ?? "")} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="cancellationPolicy">
              キャンセルポリシー
            </label>
            <textarea id="cancellationPolicy" name="cancellationPolicy" rows={2} defaultValue={strValue(v, "cancellationPolicy", defaults?.cancellationPolicy ?? "")} className="input" />
          </div>
          <div className="sm:col-span-2">
            <label className="label" htmlFor="sourceId">
              出典
            </label>
            <select id="sourceId" name="sourceId" defaultValue={strValue(v, "sourceId", defaults?.sourceId ?? "")} className="input">
              <option value="">なし</option>
              {sources.map((s) => (
                <option key={s.id} value={s.id}>
                  {s.sourceName}
                </option>
              ))}
            </select>
          </div>
        </div>
      </section>

      <section className="space-y-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide">価格（RAW FACT・複数行）</h2>
        <PriceRowsEditor initialRows={initialRows} />
        <div className="flex flex-wrap gap-4">
          <ConfirmedEmptyCheckbox itemKey="price" defaultChecked={isEmpty("price")} label="料金体系（体験本体価格）" />
          <ConfirmedEmptyCheckbox itemKey="ancillary" defaultChecked={isEmpty("ancillary")} label="付随費用（入館料・駐車場代等）" />
        </div>
      </section>

      {state?.error && (
        <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">
          {state.error}
        </p>
      )}

      <div className="flex gap-3">
        <button type="submit" disabled={pending} className="btn btn-primary">
          {pending ? "保存中..." : submitLabel}
        </button>
        <button type="button" onClick={() => router.back()} className="btn btn-secondary">
          キャンセル
        </button>
      </div>
    </form>
  );
}
