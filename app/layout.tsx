import type { Metadata } from "next";
import type { ReactNode } from "react";
import { PwaServiceWorker } from "@/components/pwa-service-worker";
import "./globals.css";
import "./design-system.css";

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
    <html lang="ru" suppressHydrationWarning>
      <head>
        <script dangerouslySetInnerHTML={{ __html: "try{document.documentElement.dataset.theme=localStorage.getItem('planner.theme.v1')==='light'?'light':'dark'}catch{document.documentElement.dataset.theme='dark'}" }} />
      </head>
      <body>
        {children}
        <PwaServiceWorker />
      </body>
    </html>
  );
}
