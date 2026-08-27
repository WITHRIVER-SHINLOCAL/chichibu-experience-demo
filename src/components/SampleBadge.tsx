// MVP実運用テスト用: サンプルデータ（シード投入データ）であることを示すバッジ。
// FACT/INFERENCE/IDEAバッジ等と混同しないよう、あえて目立つ配色にしている。
// 正式なプロダクト機能ではなく、実データとサンプルデータの誤認防止のための暫定実装。
export function SampleBadge({ className = "" }: { className?: string }) {
  return (
    <span
      className={`badge bg-fuchsia-100 text-fuchsia-800 border border-fuchsia-300 font-bold tracking-wide ${className}`}
      title="シードデータによるサンプルです。実データとして扱わないでください。"
    >
      SAMPLE
    </span>
  );
}
