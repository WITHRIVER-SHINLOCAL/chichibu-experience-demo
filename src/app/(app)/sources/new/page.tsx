import { SourceForm } from "../SourceForm";
import { createSourceAction } from "../actions";

export default function NewSourcePage() {
  return (
    <div className="max-w-2xl space-y-6">
      <div>
        <h1 className="text-2xl font-bold text-stone-900">出典を登録</h1>
        <p className="mt-1 text-sm text-stone-500">
          行政・博物館・DMO等、信頼性の高い情報源を登録します。
        </p>
      </div>
      <div className="card p-6">
        <SourceForm action={createSourceAction} submitLabel="登録する" />
      </div>
    </div>
  );
}
