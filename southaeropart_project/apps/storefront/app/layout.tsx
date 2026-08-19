import type { Metadata } from "next";
import { Inter, Oswald } from "next/font/google";
import "./globals.css";
import { Navbar } from "@/components/layout/Navbar";
import { Footer } from "@/components/layout/Footer";
import { CartProvider } from "@/components/providers/CartProvider";

const inter = Inter({
  subsets: ["latin"],
  variable: "--font-body",
  display: "swap",
});

const oswald = Oswald({
  subsets: ["latin"],
  variable: "--font-heading",
  display: "swap",
  weight: ["400", "500", "600", "700"],
});

export const metadata: Metadata = {
  title: "South Aero Performance — Not Loud, Just Different",
  description:
    "Premium aerodynamic body kits and accessories for Honda Accord, Civic, and more. Precision-engineered for performance and style. South Aero Performance — Not Loud, Just Different.",
  keywords: [
    "South Aero",
    "body kit",
    "aerodynamic",
    "Honda Accord",
    "car parts",
    "performance",
    "Thailand",
  ],
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${inter.variable} ${oswald.variable}`}>
      <body className="min-h-screen flex flex-col">
        <CartProvider>
          <Navbar />
          <main className="flex-1">{children}</main>
          <Footer />
        </CartProvider>
      </body>
    </html>
  );
}
