import { FACT_STATUS_BADGE, FACT_STATUS_LABELS, FACT_STATUS_DESCRIPTIONS } from "@/lib/constants";

const ORDER = ["FACT", "INFERENCE", "IDEA"] as const;

// デモ・初見の人向け: FACT / INFERENCE / IDEA の違いを常に同じ見た目で説明するための共通部品。
// 「AIはFACTを作らない。既存のFACTからINFERENCE（解釈）とIDEA（提案）を出すだけ」という
// このプロダクトの中核ルールを、ページを跨いでも同じバッジ・同じ説明文で示す。
export function FactStatusLegend({ className = "" }: { className?: string }) {
  return (
    <div className={`flex flex-wrap gap-x-5 gap-y-2 ${className}`}>
      {ORDER.map((s) => (
        <div key={s} className="flex items-center gap-1.5">
          <span className={`badge ${FACT_STATUS_BADGE[s]}`}>{FACT_STATUS_LABELS[s]}</span>
          <span className="text-xs text-stone-500">{FACT_STATUS_DESCRIPTIONS[s]}</span>
        </div>
      ))}
    </div>
  );
}
