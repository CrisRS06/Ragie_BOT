import type { Metadata } from "next";
import { Inter } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/navbar";
import { Toaster } from "@/components/ui/toaster";

const inter = Inter({ subsets: ["latin"] });

export const metadata: Metadata = {
  title: "Sistema de Inventario PEPS",
  description: "Sistema de gestión de inventario con método PEPS para servicios de bodegaje",
  keywords: ["inventario", "PEPS", "FIFO", "bodegaje", "Costa Rica", "SIGAF"],
  authors: [{ name: "Sistema PEPS" }],
  applicationName: "Inventario PEPS",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="es-CR" suppressHydrationWarning>
      <body className={`${inter.className} bg-gray-50 dark:bg-gray-900`}>
        <Navbar />
        <main className="min-h-screen bg-gray-50 dark:bg-gray-900">
          {children}
        </main>
        <Toaster />
      </body>
    </html>
  );
}
