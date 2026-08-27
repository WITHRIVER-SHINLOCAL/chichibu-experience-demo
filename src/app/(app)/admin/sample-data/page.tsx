import { eq } from "drizzle-orm";
import { db } from "@/db";
import { sources, resources, resourceRelationships, activityOpportunities, marketPrograms } from "@/db/schema";
import { DeleteSampleDataForm } from "./DeleteSampleDataForm";

export default async function SampleDataAdminPage() {
  const [sourceCount, resourceCount, relCount, oppCount, marketCount] = await Promise.all([
    db.$count(sources, eq(sources.isSample, true)),
    db.$count(resources, eq(resources.isSample, true)),
    db.$count(resourceRelationships, eq(resourceRelationships.isSample, true)),
    db.$count(activityOpportunities, eq(activityOpportunities.isSample, true)),
    db.$count(marketPrograms, eq(marketPrograms.isSample, true)),
  ]);

  const total = sourceCount + resourceCount + relCount + oppCount + marketCount;

  const rows = [
    { label: "地域資源", count: resourceCount },
    { label: "出典", count: sourceCount },
    { label: "資源間の関係性", count: relCount },
    { label: "体験機会（ACTIVITY OPPORTUNITY）", count: oppCount },
    { label: "市場プログラム", count: marketCount },
  ];

  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">サンプルデータ管理</h1>
        <p className="mt-1 text-sm text-stone-500">
          MVP実運用テスト用のツールです。シードデータ（SAMPLEバッジが表示されるもの）を実データと誤認しないよう分けて管理し、
          実データへの移行時にまとめて削除できます。正式なプロダクト機能ではありません。
        </p>
      </div>

      <div className="card p-5">
        <h2 className="text-sm font-bold text-stone-500 tracking-wide mb-3">現在のサンプルデータ件数</h2>
        <ul className="space-y-1.5">
          {rows.map((r) => (
            <li key={r.label} className="flex items-center justify-between text-sm">
              <span className="text-stone-700">{r.label}</span>
              <span className="font-semibold text-stone-900">{r.count}件</span>
            </li>
          ))}
        </ul>
        <div className="mt-3 pt-3 border-t border-stone-100 flex items-center justify-between text-sm">
          <span className="font-semibold text-stone-700">合計</span>
          <span className="font-bold text-river-700">{total}件</span>
        </div>
      </div>

      <DeleteSampleDataForm total={total} />
    </div>
  );
}
