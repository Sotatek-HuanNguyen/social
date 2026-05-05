import type { Metadata } from "next";
import { Roboto, Geist_Mono } from "next/font/google";
import Link from "next/link";
import { NotificationPermissionButton } from "@/components/notification-permission-button";
import "./globals.css";

const roboto = Roboto({
  variable: "--font-roboto",
  subsets: ["latin", "vietnamese"],
  weight: ["400", "500", "700"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "Theo Dõi Tin Tức",
  description: "Theo dõi và cảnh báo tin tức kinh tế – chính trị",
  manifest: "/manifest.json",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="vi"
      className={`${roboto.variable} ${geistMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full flex flex-col font-[family-name:var(--font-roboto)]">
        <header className="border-b px-6 py-3 flex items-center justify-between">
          <Link href="/" className="font-bold text-lg">
            Theo Dõi Tin Tức
          </Link>
          <nav className="flex items-center gap-4">
            <NotificationPermissionButton />
            <Link href="/alerts" className="text-sm hover:underline">
              Cảnh báo
            </Link>
          </nav>
        </header>
        <main className="max-w-4xl mx-auto w-full px-4 py-6 flex-1">
          {children}
        </main>
      </body>
    </html>
  );
}
