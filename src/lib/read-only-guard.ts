// 公開デモ向けの書き込みガード。
// PUBLIC_DEMO_READONLY=1 が設定された環境（公開デモのホスティング先）でのみ有効になり、
// ローカル開発やAPIキー設定済みの本番運用には一切影響しない。
export const READ_ONLY_DEMO_MESSAGE =
  "このデモは閲覧専用です。書き込み操作は無効化されています。";

export function isPublicDemoReadOnly(): boolean {
  return process.env.PUBLIC_DEMO_READONLY === "1";
}
