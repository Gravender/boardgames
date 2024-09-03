import "~/styles/globals.css";

import { GeistSans } from "geist/font/sans";
import { type Metadata } from "next";

import { TRPCReactProvider } from "~/trpc/react";

export const metadata: Metadata = {
  title: "Games",
  description: "Games created by gravender",
  icons: [{ rel: "icon", url: "/favicon.ico" }],
};

export default function RootLayout({
  children,
}: Readonly<{ children: React.ReactNode }>) {
  return (
    <html lang="en" className={`${GeistSans.variable}`}>
      <body>
        <TopNav />
        <TRPCReactProvider>{children}</TRPCReactProvider>
      </body>
    </html>
  );
}

function TopNav(){
  return (
    <nav className="flex w-full items-center justify-between border-b p-4 text-xl font-semibold">
      <div >
        Games
      </div>
      <div>
        Sign in
      </div>
    </nav>
  )
}