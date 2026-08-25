import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/contexts/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "ERP Comercial",
    template: "%s | ERP Comercial"
  },
  description: "ERP comercial responsivo para pequenos e medios comercios.",
  manifest: "/manifest.json",
  icons: {
    icon: "/icon.svg"
  }
};

export const viewport: Viewport = {
  themeColor: "#0b84d8"
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body>
        <AppProviders>{children}</AppProviders>
      </body>
    </html>
  );
}
