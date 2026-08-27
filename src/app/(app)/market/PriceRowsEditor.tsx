"use client";

import { useState } from "react";
import { RECOMMENDED_PRICE_TYPE_OPTIONS } from "@/lib/constants";
import { PRICE_TYPE_LABELS } from "@/lib/constants";

export type PriceRow = {
  priceType: string;
  amount: string;
  unit: string;
  taxIncluded: boolean;
  materialIncluded: boolean;
  target: string;
  notes: string;
  // Market Research v2: 価格条件の構造化（notesへの埋没を防ぐ）
  conditionAgeMin: string;
  conditionAgeMax: string;
  residencyCondition: string;
  courseName: string;
  // Market Research v2: 体験本体価格ではなく付随費用（入館料・駐車場代等）かどうか
  isAncillary: boolean;
  // 付随費用のうち必須（入館料等）かオプション（駐車場等）か。isAncillary=falseの行では実質無視される。
  isRequired: boolean;
};

const EMPTY_ROW: PriceRow = {
  priceType: "child",
  amount: "",
  unit: "",
  taxIncluded: true,
  materialIncluded: false,
  target: "",
  notes: "",
  conditionAgeMin: "",
  conditionAgeMax: "",
  residencyCondition: "",
  courseName: "",
  isAncillary: false,
  isRequired: true,
};

export function PriceRowsEditor({ initialRows }: { initialRows?: PriceRow[] }) {
  const [rows, setRows] = useState<PriceRow[]>(
    initialRows && initialRows.length > 0 ? initialRows : [{ ...EMPTY_ROW }]
  );

  function update(index: number, patch: Partial<PriceRow>) {
    setRows((prev) => prev.map((r, i) => (i === index ? { ...r, ...patch } : r)));
  }
  function addRow() {
    setRows((prev) => [...prev, { ...EMPTY_ROW }]);
  }
  function removeRow(index: number) {
    setRows((prev) => prev.filter((_, i) => i !== index));
  }

  return (
    <div className="space-y-3">
      <input type="hidden" name="priceRowsJson" value={JSON.stringify(rows)} />
      <div className="space-y-3">
        {rows.map((row, i) => (
          <div key={i} data-testid="price-row" className="rounded-lg border border-stone-200 p-3 space-y-2">
            <div className="grid sm:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-stone-500">価格種別</label>
                <select
                  data-testid="price-row-type"
                  className="input"
                  value={row.priceType}
                  onChange={(e) => update(i, { priceType: e.target.value })}
                >
                  {RECOMMENDED_PRICE_TYPE_OPTIONS.map((t) => (
                    <option key={t} value={t}>
                      {PRICE_TYPE_LABELS[t]}
                    </option>
                  ))}
                </select>
              </div>
              <div>
                <label className="text-xs text-stone-500">金額（円）</label>
                <input
                  data-testid="price-row-amount"
                  type="number"
                  min={0}
                  className="input"
                  value={row.amount}
                  onChange={(e) => update(i, { amount: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">単位</label>
                <input
                  className="input"
                  placeholder="例：1名あたり"
                  value={row.unit}
                  onChange={(e) => update(i, { unit: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">コース名（任意）</label>
                <input
                  className="input"
                  placeholder="例：じっくりコース"
                  value={row.courseName}
                  onChange={(e) => update(i, { courseName: e.target.value })}
                />
              </div>
            </div>

            <div className="grid sm:grid-cols-4 gap-2">
              <div>
                <label className="text-xs text-stone-500">条件：年齢（下限〜上限）</label>
                <div className="flex items-center gap-1">
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={row.conditionAgeMin}
                    onChange={(e) => update(i, { conditionAgeMin: e.target.value })}
                  />
                  <span className="text-stone-400">〜</span>
                  <input
                    type="number"
                    min={0}
                    className="input"
                    value={row.conditionAgeMax}
                    onChange={(e) => update(i, { conditionAgeMax: e.target.value })}
                  />
                </div>
              </div>
              <div>
                <label className="text-xs text-stone-500">条件：居住地区分（任意）</label>
                <input
                  className="input"
                  placeholder="例：市内 / 市外"
                  value={row.residencyCondition}
                  onChange={(e) => update(i, { residencyCondition: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">補足条件（その他）</label>
                <input
                  className="input"
                  placeholder="例：3歳以下無料"
                  value={row.target}
                  onChange={(e) => update(i, { target: e.target.value })}
                />
              </div>
              <div>
                <label className="text-xs text-stone-500">メモ</label>
                <input className="input" value={row.notes} onChange={(e) => update(i, { notes: e.target.value })} />
              </div>
            </div>

            <div className="flex flex-wrap items-center gap-4 text-xs text-stone-600">
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={row.taxIncluded}
                  onChange={(e) => update(i, { taxIncluded: e.target.checked })}
                />
                税込
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  type="checkbox"
                  checked={row.materialIncluded}
                  onChange={(e) => update(i, { materialIncluded: e.target.checked })}
                />
                材料費込
              </label>
              <label className="flex items-center gap-1.5">
                <input
                  data-testid="price-row-ancillary"
                  type="checkbox"
                  checked={row.isAncillary}
                  onChange={(e) => update(i, { isAncillary: e.target.checked, isRequired: e.target.checked ? row.isRequired : true })}
                />
                付随費用（体験本体価格ではない：入館料・駐車場代等）
              </label>
              {row.isAncillary && (
                <label className="flex items-center gap-1.5">
                  <input
                    type="checkbox"
                    checked={row.isRequired}
                    onChange={(e) => update(i, { isRequired: e.target.checked })}
                  />
                  必須（任意の場合はチェックを外す：例 駐車場代）
                </label>
              )}
              <button
                type="button"
                onClick={() => removeRow(i)}
                className="ml-auto text-xs text-red-600 hover:underline"
                disabled={rows.length === 1}
              >
                この価格行を削除
              </button>
            </div>
          </div>
        ))}
      </div>
      <button type="button" onClick={addRow} className="btn btn-secondary text-xs">
        + 価格行を追加
      </button>
      <p className="text-xs text-stone-400">
        家族料金・団体料金などをそのまま人数で割った金額は「事実」ではなく参考値です。1人あたりの参考換算価格は保存後、詳細画面・市場インサイトで自動計算され、換算根拠とともに表示されます。付随費用（入館料・駐車場代等）としてマークした行は、参考換算価格の算出対象から除外されます。
      </p>
    </div>
  );
}
