import { db } from "@/db";
import { regions, sources, platforms } from "@/db/schema";
import { MarketProgramForm } from "../MarketProgramForm";
import { createMarketProgramAction } from "../actions";

export default async function NewMarketProgramPage() {
  const [regionList, sourceList, platformList] = await Promise.all([
    db.select({ id: regions.id, name: regions.name }).from(regions).orderBy(regions.name),
    db.select({ id: sources.id, sourceName: sources.sourceName }).from(sources).orderBy(sources.sourceName),
    db.select({ id: platforms.id, name: platforms.name }).from(platforms).orderBy(platforms.name),
  ]);

  return (
    <div className="max-w-3xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">市場プログラムを登録</h1>
        <p className="mt-1 text-sm text-stone-500">
          他社・他地域の実際の体験プログラム情報をRAW
          FACTとして登録します。取得できない項目は空欄のままで構いません。
        </p>
      </div>
      <div className="card p-6">
        <MarketProgramForm
          action={createMarketProgramAction}
          regions={regionList}
          sources={sourceList}
          platforms={platformList}
          submitLabel="登録する"
        />
      </div>
    </div>
  );
}
