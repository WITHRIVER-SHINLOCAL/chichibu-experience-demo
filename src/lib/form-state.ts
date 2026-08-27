/**
 * React 19のフォームアクションは、アクション完了後（リダイレクトしない場合）に
 * 非制御コンポーネントの入力値をdefaultValueへリセットする。
 * これはバリデーションエラー時に入力済み内容が全て消えてしまう体験上の問題になるため、
 * サーバーアクション側で送信値をそのまま state.values として返し、
 * クライアント側でフォームを再マウント（key変更）してdefaultValueに反映させることで
 * 「エラーになっても入力し直しにならない」ようにする。
 * （実装時の追加配慮 #3: 操作負荷を上げないためのUX対応）
 */
export type FormValues = Record<string, string | string[]>;

export function captureFormValues(formData: FormData, arrayFields: string[] = []): FormValues {
  const values: FormValues = {};
  const seen = new Set<string>();
  for (const key of formData.keys()) {
    if (seen.has(key)) continue;
    seen.add(key);
    if (arrayFields.includes(key)) {
      values[key] = formData.getAll(key).map(String);
    } else {
      const v = formData.get(key);
      values[key] = v == null ? "" : String(v);
    }
  }
  return values;
}
