import type { Metadata, Viewport } from "next";
import "./globals.css";
import { AppNav } from "@/components/app-nav";
import { ToastProvider } from "@/components/toast-provider";

export const metadata: Metadata = {
  title: "VaultFlow - Personal Finance",
  description: "Lightweight, ultra-fast personal finance management powered by Turso & Next.js.",
  manifest: "/manifest.webmanifest",
  appleWebApp: {
    capable: true,
    statusBarStyle: "black-translucent",
    title: "VaultFlow",
  },
  icons: {
    icon: "/icons/icon.svg",
    apple: "/icons/apple-touch-icon.png",
  },
};

export const viewport: Viewport = {
  themeColor: "#09090b",
  width: "device-width",
  initialScale: 1,
  maximumScale: 1,
  userScalable: false,
  viewportFit: "cover",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html lang="en" className="dark">
      <head>
        <link rel="icon" href="/icons/icon.svg" type="image/svg+xml" />
        <link rel="apple-touch-icon" href="/icons/apple-touch-icon.png" />
      </head>
      <body className="min-h-screen bg-[#09090b] text-[#fafafa] antialiased selection:bg-emerald-500/20 selection:text-emerald-300">
        <ToastProvider>
          <AppNav>{children}</AppNav>
        </ToastProvider>
      </body>
    </html>
  );
}
