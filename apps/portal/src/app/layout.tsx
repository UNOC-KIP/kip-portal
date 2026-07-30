import "./globals.css";
import type { Metadata } from "next";
import type { ReactNode } from "react";
import { Plus_Jakarta_Sans } from "next/font/google";
import { Providers } from "@/components/providers";
import { ChatWidget } from "@/components/chat-widget";
import {
  GoogleTagManager,
  GoogleTagManagerNoScript,
} from "@/components/google-tag-manager";

const plusJakarta = Plus_Jakarta_Sans({
  subsets: ["latin"],
  variable: "--font-sans",
  weight: ["400", "500", "600", "700", "800"],
  display: "swap",
});

export const metadata: Metadata = {
  title: "KIP Investor Portal — UNOC",
  description:
    "Expression of Interest portal for the Kabalega Petro-Based Industrial Park.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en">
      <body className={`${plusJakarta.variable} font-sans`}>
        {/* Analytics covers the whole investor portal — public marketing pages,
            the signed-in dashboard, the auth pages and `/launch`. The noscript
            iframe must stay the first child of <body>. */}
        <GoogleTagManagerNoScript />
        <GoogleTagManager />
        <Providers>
          {children}
          <ChatWidget />
        </Providers>
      </body>
    </html>
  );
}
