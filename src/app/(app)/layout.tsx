import Link from "next/link";
import { redirect } from "next/navigation";
import { getCurrentUser } from "@/lib/auth";
import { logoutAction } from "@/app/login/actions";

const NAV_ITEMS = [
  { href: "/", label: "ダッシュボード" },
  { href: "/resources", label: "地域資源DB" },
  { href: "/activity-opportunities", label: "体験機会" },
  { href: "/relationships", label: "関係性" },
  { href: "/sources", label: "出典" },
  { href: "/market", label: "市場データ" },
  { href: "/programs", label: "プログラム企画" },
];

export default async function AppLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  const user = await getCurrentUser();
  if (!user) {
    redirect("/login");
  }

  return (
    <div className="min-h-full flex flex-col">
      <header className="no-print border-b border-stone-200 bg-white">
        <div className="max-w-7xl mx-auto px-4 sm:px-6">
          <div className="flex items-center justify-between h-16">
            <div className="flex items-center gap-8">
              <Link href="/" className="flex items-baseline gap-2">
                <span className="text-sm font-bold text-river-600">
                  WITH RIVER
                </span>
                <span className="hidden sm:inline text-sm text-stone-500">
                  体験プログラム開発支援
                </span>
              </Link>
              <nav className="hidden lg:flex items-center gap-0.5">
                {NAV_ITEMS.map((item) => (
                  <Link
                    key={item.href}
                    href={item.href}
                    className="px-2.5 py-2 rounded-lg text-sm font-medium text-stone-600 hover:text-river-700 hover:bg-river-50 whitespace-nowrap"
                  >
                    {item.label}
                  </Link>
                ))}
              </nav>
            </div>
            <div className="flex items-center gap-3">
              <span className="hidden sm:inline text-sm text-stone-500">
                {user.name} さん
              </span>
              <form action={logoutAction}>
                <button type="submit" className="btn btn-secondary text-xs">
                  ログアウト
                </button>
              </form>
            </div>
          </div>
          <nav className="lg:hidden flex flex-wrap gap-1 pb-3 -mt-1">
            {NAV_ITEMS.map((item) => (
              <Link
                key={item.href}
                href={item.href}
                className="px-3 py-1.5 rounded-lg text-xs font-medium text-stone-600 hover:text-river-700 hover:bg-river-50"
              >
                {item.label}
              </Link>
            ))}
          </nav>
        </div>
      </header>
      <main className="flex-1">
        <div className="max-w-7xl mx-auto px-4 sm:px-6 py-8">{children}</div>
      </main>
    </div>
  );
}
