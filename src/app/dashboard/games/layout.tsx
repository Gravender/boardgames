"use client";

import { AddGameStoreProvider } from "~/providers/add-game-provider";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return (
    <main className="w-screen h-screen flex items-center">
      <AddGameStoreProvider>{children}</AddGameStoreProvider>
    </main>
  );
}