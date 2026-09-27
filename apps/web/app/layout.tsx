import type { Metadata, Viewport } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { DueCountProvider } from "@/components/shell/DueCountProvider";
import { MobileNav, SiteHeader } from "@/components/shell/SiteNav";
import { ToastProvider } from "@/components/ui/Toast";
import "./globals.css";

// Keep code legible in a dedicated monospace face; interface text uses Helvetica in globals.css.
const jetbrainsMono = localFont({
  src: "./fonts/JetBrainsMono-Variable-latin.woff2",
  weight: "100 800",
  variable: "--font-jetbrains-mono",
  display: "swap",
  fallback: ["ui-monospace", "Cascadia Code", "Consolas", "monospace"],
});

export const metadata: Metadata = {
  title: {
    default: "Prepr · Spaced repetition for SWE interviews",
    template: "%s · Prepr",
  },
  description:
    "Anki for LeetCode: micro DSA flashcards over iMessage, a coding IDE, behavioral practice, system design, and mock onsites.",
  applicationName: "Prepr",
};

export const viewport: Viewport = {
  themeColor: "#080808",
  colorScheme: "light dark",
  width: "device-width",
  initialScale: 1,
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html lang="en" className={jetbrainsMono.variable}>
      <body className="min-h-dvh bg-ink-950 font-sans text-fg antialiased">
        <a href="#main" className="skip-link">
          Skip to content
        </a>
        <ToastProvider>
          <DueCountProvider>
            <SiteHeader />
            <main id="main" tabIndex={-1} className="mx-auto w-full max-w-6xl px-4 pb-28 pt-6 outline-none sm:px-6 sm:pt-10 md:pb-16">
              {children}
            </main>
            <MobileNav />
          </DueCountProvider>
        </ToastProvider>
      </body>
    </html>
  );
}
