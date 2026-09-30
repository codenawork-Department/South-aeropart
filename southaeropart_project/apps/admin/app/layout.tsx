export const dynamic = "force-dynamic";
import type { Metadata, Viewport } from "next";
import "./globals.css";

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
    <html lang="th">
      <body className="min-h-screen bg-[#0A0A0A] font-sans antialiased text-white selection:bg-red-900 selection:text-white">
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
