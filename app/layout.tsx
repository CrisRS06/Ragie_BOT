import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Inventario PEPS - PANI Costa Rica",
  description: "Sistema Web de Inventario PEPS para contrato público - Cumplimiento regulatorio completo",
  keywords: ["inventario", "PEPS", "FIFO", "PANI", "Costa Rica", "SIGAF"],
  authors: [{ name: "Sistema PEPS" }],
  applicationName: "Inventario PEPS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CR">
      <body className={inter.className}>
        <Navbar />
        <main className="min-h-screen bg-gray-50">
          {children}
        </main>
      </body>
    </html>
  );
}
