import type { Metadata } from "next";
import { Inter, Playfair_Display } from "next/font/google";
import "./globals.css";
import { ToastProvider } from "@/components/ui/Toast";

const sans = Inter({
  subsets: ["latin"],
  variable: "--font-sans",
  display: "swap",
});

const display = Playfair_Display({
  subsets: ["latin"],
  variable: "--font-display",
  display: "swap",
});

export const metadata: Metadata = {
  title: {
    default: "Roachwood — Custom Cabinetry & Home Improvements",
    template: "%s | Roachwood",
  },
  description:
    "Custom cabinetry and high-quality home improvements in Scottsdale, AZ. Built right. Made to last.",
};

export default function RootLayout({
  children,
}: {
  children: React.ReactNode;
}) {
  return (
    <html lang="en" className={`${sans.variable} ${display.variable}`}>
      <body className="font-sans antialiased min-h-screen bg-charcoal-900 text-charcoal-50">
        <ToastProvider>{children}</ToastProvider>
      </body>
    </html>
  );
}
