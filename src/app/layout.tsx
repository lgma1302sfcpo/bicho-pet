import type { Metadata, Viewport } from "next";

import { AppProviders } from "@/contexts/app-providers";

import "./globals.css";

export const metadata: Metadata = {
  title: {
    default: "Bicho Pet",
    template: "%s | Bicho Pet"
  },
  description: "Sistema de gestão da Bicho Pet.",
  manifest: "/manifest.json",
  icons: {
    icon: "/bicho-pet-logo.png",
    apple: "/bicho-pet-logo.png"
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
