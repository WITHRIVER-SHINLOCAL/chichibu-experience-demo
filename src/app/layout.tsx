import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "秩父体験プログラム開発支援 | WITH RIVER",
  description:
    "秩父地域の自然・文化資源を活用した体験プログラム開発を支援する社内ツール",
};

export default function RootLayout({ children }: LayoutProps<"/">) {
  return (
    <html lang="ja" className="h-full">
      <body className="min-h-full flex flex-col bg-stone-50 text-stone-900 antialiased">
        {children}
      </body>
    </html>
  );
}
