import type { Metadata } from "next";
import "./globals.css";

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
    <html lang="en">
      <body>{children}</body>
    </html>
  );
}
