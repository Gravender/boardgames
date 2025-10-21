import "~/styles/globals.css";

import type { Metadata } from "next";
import { Geist, Geist_Mono } from "next/font/google";
import { ReactQueryDevtools } from "@tanstack/react-query-devtools";

import { Toaster } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { CSPostHogProvider } from "~/components/analytics";
import PostHogPageView from "~/components/PostHogPageView";
import { SpeedInsights } from "~/components/speedInsights";
import { ThemeProvider } from "~/components/theme-provider";
import { TRPCReactProvider } from "~/trpc/react";

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
          "min-h-screen bg-background font-sans text-foreground antialiased",

          geistSans.variable,

          geistMono.variable,
        )}
      >
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <CSPostHogProvider>
            <TRPCReactProvider>
              {children}
              <ReactQueryDevtools
                position="bottom"
                buttonPosition="bottom-right"
              />
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
