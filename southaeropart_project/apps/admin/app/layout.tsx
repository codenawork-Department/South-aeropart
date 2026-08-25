import type { Metadata, Viewport } from "next";
import { Inter } from "next/font/google";
import "./globals.css";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-inter",
  display: "swap",
});

import { Suspense } from "react";
import { TopProgressBar } from "@/components/layout/top-progress-bar";
import { NavigationProvider } from "@/components/layout/navigation-context";

export const viewport: Viewport = {
  width: "device-width",
  initialScale: 1,
  maximumScale: 5,
  themeColor: "#0A0A0A",
};

export const metadata: Metadata = {
  title: "South Aero Admin — Dashboard",
  description: "Admin dashboard for South Aero Performance",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="th" className={inter.variable}>
      <body className={`${inter.className} min-h-screen bg-[#0A0A0A] antialiased text-white selection:bg-red-900 selection:text-white`}>
        <NavigationProvider>
          <Suspense fallback={null}>
            <TopProgressBar />
          </Suspense>
          {children}
        </NavigationProvider>
      </body>
    </html>
  );
}
