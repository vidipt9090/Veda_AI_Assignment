import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import "./globals.css";
import Sidebar from "@/components/Sidebar";
import { Toaster } from "react-hot-toast";

const geistSans = Geist({
  variable: "--font-geist-sans",
  subsets: ["latin"],
});

const geistMono = Geist_Mono({
  variable: "--font-geist-mono",
  subsets: ["latin"],
});

export const metadata: Metadata = {
  title: "VedaAI Assessment Extraction",
  description: "Upload question paper and answer sheets for mapping",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        className={`${geistSans.variable} ${geistMono.variable} antialiased bg-gradient-to-b from-[#fbfbfb] via-[#eff1f5] to-[#d8dce4] min-h-screen flex text-zinc-900`}
        suppressHydrationWarning
      >
        <Sidebar />
        <main className="flex-1 flex flex-col h-screen overflow-hidden">
          {children}
        </main>
        <Toaster position="bottom-right" />
      </body>
    </html>
  );
}
