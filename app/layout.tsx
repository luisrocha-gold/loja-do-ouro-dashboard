import type { Metadata } from "next";
import TruthfulTrendScale from "./TruthfulTrendScale";
import "./globals.css";
import "./responsive.css";
import "./professional.css";
import "./logo.css";

export const metadata: Metadata = {
  title: "Loja do Ouro | Business Control Center",
  description: "Centro privado de gestão, vendas, marketing e inteligência comercial da Loja do Ouro.",
  robots: { index: false, follow: false },
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt-PT"><body>{children}<TruthfulTrendScale /></body></html>;
}
