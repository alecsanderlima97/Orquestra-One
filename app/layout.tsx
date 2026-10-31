import type { Metadata } from "next";
import { AppProviders } from "@/src/components/app-providers";
import "./globals.css";
import "./agenda.css";
import "./business.css";

export const metadata: Metadata = {
  title: "Orquestra One | Gestão para quem faz acontecer",
  description: "Operação, agenda, serviços e financeiro em um só lugar.",
  applicationName: "Orquestra One",
  manifest: "/manifest.webmanifest",
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="pt-BR">
      <body><AppProviders>{children}</AppProviders></body>
    </html>
  );
}
