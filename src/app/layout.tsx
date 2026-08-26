import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/contexts/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Casa dos Bichos",
    template: "%s | Casa dos Bichos"
  },
  description: "Sistema de gestão da Pet Shop Casa dos Bichos.",
  manifest: "/manifest.json",
  icons: {
    icon: "/casa-dos-bichos-logo.jpg",
    apple: "/casa-dos-bichos-logo.jpg"
  }
};

export const viewport: Viewport = {
  themeColor: "#173e91"
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
