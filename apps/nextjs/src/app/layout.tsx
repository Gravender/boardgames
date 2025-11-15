import "~/styles/globals.css";

import type { Metadata, Viewport } from "next";
import type { ComponentType } from "react";
import { Geist, Geist_Mono } from "next/font/google";

import { Toaster } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { CSPostHogProvider } from "~/components/analytics";
import PostHogPageView from "~/components/PostHogPageView";
import { SpeedInsights } from "~/components/speedInsights";
import { ThemeProvider } from "~/components/theme-provider";
import { env } from "~/env";
import { TRPCReactProvider } from "~/trpc/react";

const Devtools: ComponentType =
  env.NODE_ENV === "development"
    ? (await import("~/components/tan-stack-devtools")).default
    : () => null;

export const metadata: Metadata = {
  title: {
    default: "Board Games Tracker",
    template: `%s - Board Games Tracker`,
  },
  description: "Board Games Tracker created by gravender",
  creator: "@gravender",
  icons: [{ rel: "games", url: "/favicon.ico" }],
  openGraph: {
    type: "website",
    locale: "en_US",
    url: "https://boardgame.gravender.net/dashboard",
    title: "Board Games Tracker",
    description: "Board Games Tracker created by gravender",
    siteName: "Board Games Tracker",
  },
};

export const viewport: Viewport = {
  themeColor: [
    { media: "(prefers-color-scheme: light)", color: "white" },
    { media: "(prefers-color-scheme: dark)", color: "black" },
  ],
};

const geistSans = Geist({
  subsets: ["latin"],

  variable: "--font-geist-sans",
});

const geistMono = Geist_Mono({
  subsets: ["latin"],

  variable: "--font-geist-mono",
});
export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body
        suppressHydrationWarning
        className={cn(
          "bg-background text-foreground min-h-screen font-sans antialiased",

          geistSans.variable,

          geistMono.variable,
        )}
      >
        <ThemeProvider attribute="class" defaultTheme="system" enableSystem>
          <CSPostHogProvider>
            <TRPCReactProvider>
              {children}
              <Devtools />
            </TRPCReactProvider>
            <Toaster />
            <SpeedInsights />

            <PostHogPageView />
          </CSPostHogProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
