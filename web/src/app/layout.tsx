import type { Metadata } from "next";
import { GeistSans } from "geist/font/sans";
import { GeistMono } from "geist/font/mono";
import "./globals.css";
import { Providers } from "./providers";
import { Sidebar } from "@/components/sidebar";

export const metadata: Metadata = {
  title: "Catena — Dashboard Gerencial",
  description: "Painéis gerenciais da Catena Planejamento (dados do ClickUp)",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="pt-BR"
      suppressHydrationWarning
      className={`${GeistSans.variable} ${GeistMono.variable}`}
    >
      <body className="antialiased">
        <Providers>
          <div className="flex">
            <Sidebar />
            <main className="flex-1 min-h-screen">
              <div className="mx-auto max-w-[1280px] px-8 py-8">{children}</div>
            </main>
          </div>
        </Providers>
      </body>
    </html>
  );
}
