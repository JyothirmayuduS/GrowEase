import { Inter, JetBrains_Mono, Space_Grotesk } from "next/font/google";

import { ChunkErrorReload } from "@/components/system/chunk-error-reload";
import { ThemeProvider } from "@/components/theme/ThemeProvider";
import { ToastProvider } from "@/components/ui/toast";

import "./globals.css";

const inter = Inter({
  variable: "--font-sans",
  subsets: ["latin"],
  weight: ["400", "600"],
});

const spaceGrotesk = Space_Grotesk({
  variable: "--font-display",
  subsets: ["latin"],
  weight: ["600"],
});

const jetbrainsMono = JetBrains_Mono({
  variable: "--font-mono",
  subsets: ["latin"],
  weight: ["400", "600"],
});

export const metadata = {
  title: {
    default: "GrowEasy CRM",
    template: "%s · GrowEasy CRM",
  },
  description:
    "Enterprise lead gen CRM — AI CSV importer, pipeline dashboard, and engagement tools for Indian real-estate teams.",
};

export default function RootLayout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <html
      lang="en"
      className={`${inter.variable} ${spaceGrotesk.variable} ${jetbrainsMono.variable} h-full antialiased`}
      suppressHydrationWarning
    >
      <body className="min-h-full bg-[var(--ge-page-bg)] font-sans text-[var(--ge-text)] antialiased dark:bg-slate-950 dark:text-slate-50">
        <ThemeProvider>
          <ChunkErrorReload />
          <ToastProvider>{children}</ToastProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
