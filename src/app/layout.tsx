import type { Metadata } from "next";
import localFont from "next/font/local";
import type { ReactNode } from "react";
import { ToastViewport } from "@/components/ui";
import { PlatformShell } from "@/components/ui/PlatformShell";
import { themeBootstrap } from "@/components/ui/theme";
import "./globals.css";

const openSans = localFont({
  src: [
    { path: "../components/ui/fonts/OpenSans.ttf", weight: "400 800", style: "normal" },
    { path: "../components/ui/fonts/OpenSans-Italic.ttf", weight: "400 800", style: "italic" },
  ],
  variable: "--font-sans",
  display: "swap",
});

const jetBrainsMono = localFont({
  src: [
    { path: "../components/ui/fonts/JetBrainsMono.ttf", weight: "500", style: "normal" },
    { path: "../components/ui/fonts/JetBrainsMono-Italic.ttf", weight: "500", style: "italic" },
  ],
  variable: "--font-mono",
  display: "swap",
});

const blockBlueprint = localFont({
  src: "../components/ui/fonts/BlockBlueprint.ttf",
  weight: "500",
  variable: "--font-retro",
  display: "swap",
});

export const metadata: Metadata = {
  title: "HireEscape — evidence-backed technical screening",
  description: "Evidence-backed technical screening. Code verifies; humans decide.",
};

export default function RootLayout({ children }: { children: ReactNode }) {
  return (
    <html
      lang="en"
      data-theme="default"
      suppressHydrationWarning
      className={`${openSans.variable} ${jetBrainsMono.variable} ${blockBlueprint.variable}`}
    >
      <head><script dangerouslySetInnerHTML={{ __html: themeBootstrap }} /></head>
      <body>
        <PlatformShell>
          {children}
          <ToastViewport />
        </PlatformShell>
      </body>
    </html>
  );
}
