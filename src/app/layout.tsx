import "~/styles/globals.css";

import { type Metadata } from "next";
import { ClerkProvider } from "@clerk/nextjs";
import { Analytics } from "@vercel/analytics/next";
import { SpeedInsights } from "@vercel/speed-insights/next";

import { ThemeProvider } from "~/components/theme-provider";
import { Toaster } from "~/components/ui/toaster";
import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: {
    default: "Board Games Tracker",
    template: `%s - Board Games Tracker`,
  },
  description: "Board Games Tracker created by gravender",
  creator: "@gravender",
  icons: [{ rel: "games", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" suppressHydrationWarning>
      <body>
        <ThemeProvider
          attribute="class"
          defaultTheme="system"
          enableSystem
          disableTransitionOnChange
          enableColorScheme
        >
          <ClerkProvider>
            <TRPCReactProvider>{children}</TRPCReactProvider>
            <Toaster />
            <Analytics />
            <SpeedInsights />
          </ClerkProvider>
        </ThemeProvider>
      </body>
    </html>
  );
}
