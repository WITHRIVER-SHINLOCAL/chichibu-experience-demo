import Link from "next/link";
import { DEMO_PROGRAM_ID } from "@/lib/constants";
import { FactStatusLegend } from "./FactStatusLegend";

const DEMO_STEPS = [
  { n: 1, label: "ダッシュボード", href: "/", desc: "資源・市場・企画の全体像を俯瞰する" },
  { n: 2, label: "地域資源を見る", href: "/resources", desc: "地域に眠る資源（FACT）を確認する" },
  { n: 3, label: "RESOURCE RELATIONSHIPを見る", href: "/relationships", desc: "資源同士のつながりを見る" },
  { n: 4, label: "ACTIVITY OPPORTUNITYを見る", href: "/activity-opportunities", desc: "資源を体験に変える案を見る" },
  { n: 5, label: "市場データ・インサイトを見る", href: "/market/insight", desc: "他社の実データと比較する土台を見る" },
  {
    n: 6,
    label: "PROGRAMを見る",
    href: `/programs/${DEMO_PROGRAM_ID}`,
    desc: "「東京を作った武甲さんをクエスト！」の企画を見る",
  },
  {
    n: 7,
    label: "AI Reviewを見る",
    href: `/programs/${DEMO_PROGRAM_ID}/ai-review`,
    desc: "診断・不足FACT・市場比較・改善IDEA・Experience Design Review・Product Draft",
  },
];

// デモ用トップ説明 + おすすめの見る順番（7ステップ）。
// 初めて見る人が5分でプロダクトの全体像をつかめることを目的にした導線。
export function DemoIntro() {
  return (
    <div className="card p-6 space-y-5 border-river-200 bg-river-50/40">
      <div>
        <span className="badge bg-river-600 text-white font-bold tracking-wide">DEMO</span>
        <h2 className="mt-2 text-lg font-bold text-stone-900">
          地域に眠る資源と市場データをつなぎ、体験プログラムの商品開発を支援するOS。
        </h2>
        <p className="mt-1 text-sm text-stone-600">地域を知る。市場を知る。体験を考える。AIと磨く。</p>
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 tracking-wide mb-2">FACT / INFERENCE / IDEAの違い</h3>
        <FactStatusLegend />
      </div>

      <div>
        <h3 className="text-xs font-bold text-stone-500 tracking-wide mb-2">
          おすすめの見る順番（この順にたどると全体の流れがわかります）
        </h3>
        <ol className="grid sm:grid-cols-2 lg:grid-cols-4 gap-2">
          {DEMO_STEPS.map((s) => (
            <li key={s.n}>
              <Link
                href={s.href}
                className="flex flex-col h-full rounded-lg border border-stone-200 bg-white px-3 py-2.5 hover:border-river-300 hover:bg-river-50"
              >
                <span className="text-[10px] font-bold text-river-600">STEP {s.n}</span>
                <span className="text-sm font-semibold text-stone-900">{s.label}</span>
                <span className="text-xs text-stone-500 mt-0.5">{s.desc}</span>
              </Link>
            </li>
          ))}
        </ol>
      </div>
    </div>
  );
}
