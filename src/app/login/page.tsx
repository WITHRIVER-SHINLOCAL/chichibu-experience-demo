import { LoginForm } from "./LoginForm";

export default async function LoginPage({
  searchParams,
}: {
  searchParams: Promise<{ next?: string }>;
}) {
  const { next } = await searchParams;

  return (
    <div className="flex-1 flex items-center justify-center px-4 py-16 bg-gradient-to-b from-river-50 to-stone-50">
      <div className="w-full max-w-sm">
        <div className="text-center mb-8">
          <p className="text-sm font-semibold text-river-600 tracking-wide">
            WITH RIVER
          </p>
          <h1 className="mt-1 text-xl font-bold text-stone-900">
            体験プログラム開発支援
          </h1>
          <p className="mt-2 text-sm text-stone-500">
            体験事業チーム向け 業務ツール
          </p>
        </div>
        <div className="card p-6">
          <LoginForm next={next ?? "/"} />
        </div>
        <p className="mt-6 text-center text-xs text-stone-400">
          アカウントは管理者が発行します。ログインできない場合はチーム管理者にご連絡ください。
        </p>
      </div>
    </div>
  );
}
