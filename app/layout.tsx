import type { Metadata } from "next";
import "./globals.css";

export const metadata: Metadata = {
  title: "Loja do Ouro | Performance Dashboard",
  description: "Dashboard executivo de e-commerce e marketing da Loja do Ouro."
};

export default function RootLayout({ children }: Readonly<{ children: React.ReactNode }>) {
  return <html lang="pt"><body>{children}</body></html>;
}
