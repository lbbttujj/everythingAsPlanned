import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import "./globals.css";

export const metadata: Metadata = {
  title: "Planner",
  description: "Minimal life-values planner with goals, ranking, and quick self-checks",
  applicationName: "Всё по плану",
  icons: { icon: "/icon.svg", apple: "/icon.svg" }
};

export default function RootLayout({
  children
}: Readonly<{
  children: ReactNode;
}>) {
  return (
    <html lang="ru">
      <body>
        {children}
        <PwaServiceWorker />
      </body>
    </html>
  );
}
