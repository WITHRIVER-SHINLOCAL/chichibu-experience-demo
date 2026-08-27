"use client";

import { useActionState, useState } from "react";
import { useRouter } from "next/navigation";
import { deleteAllSampleDataAction } from "./actions";

const CONFIRM_TEXT = "サンプルデータを削除する";

export function DeleteSampleDataForm({ total }: { total: number }) {
  const [state, formAction, pending] = useActionState(deleteAllSampleDataAction, undefined);
  const [confirmInput, setConfirmInput] = useState("");
  const router = useRouter();

  // state.done は「このフォームで削除操作を実行した」ことを示す実行時の状態なので、
  // その後サーバー側の再検証でtotal（親から渡されるprops）が0に変わっても、
  // 完了メッセージを消さずに優先して表示する（親のtotal分岐でこのコンポーネントごと
  // アンマウントされると、削除に成功したのに完了メッセージが一瞬で消えてしまうため）。
  if (state?.done) {
    return (
      <div className="card p-6 space-y-3">
        <p className="text-sm font-semibold text-emerald-700">削除が完了しました。</p>
        <p className="text-sm text-stone-600">{state.summary}</p>
        <button type="button" className="btn btn-secondary" onClick={() => router.refresh()}>
          このページを更新する
        </button>
      </div>
    );
  }

  if (total === 0) {
    return (
      <div className="card p-6 text-center text-sm text-stone-400">
        現在サンプルデータはありません。
      </div>
    );
  }

  return (
    <div className="card p-6 space-y-4 border-red-200">
      <div className="rounded-lg border border-red-200 bg-red-50 px-4 py-3 text-sm text-red-800">
        <p className="font-semibold">この操作は取り消せません。</p>
        <p className="mt-1 text-xs">
          サンプルデータ（SAMPLEバッジが付いた地域資源・出典・関係性・体験機会・市場プログラム、計{total}件）をすべて削除します。
          実データ（is_sampleが付いていないもの）には影響しません。それらを紐づけて作成したプログラム企画がある場合は、
          その紐付けのみ解除されます（企画自体は削除されません）。
        </p>
      </div>
      <form action={formAction} className="space-y-3">
        <div>
          <label className="label" htmlFor="confirmText">
            確認のため「{CONFIRM_TEXT}」と入力してください
          </label>
          <input
            id="confirmText"
            name="confirmText"
            className="input"
            value={confirmInput}
            onChange={(e) => setConfirmInput(e.target.value)}
            autoComplete="off"
          />
        </div>
        {state?.error && (
          <p className="text-sm text-red-600 bg-red-50 border border-red-200 rounded-lg px-3 py-2">{state.error}</p>
        )}
        <button
          type="submit"
          disabled={pending || confirmInput !== CONFIRM_TEXT}
          className="btn bg-red-600 text-white hover:bg-red-700 disabled:opacity-40 disabled:cursor-not-allowed"
        >
          {pending ? "削除中..." : "サンプルデータを完全に削除する"}
        </button>
      </form>
    </div>
  );
}
