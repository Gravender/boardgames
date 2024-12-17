"use client";

import { AddGameStoreProvider } from "~/providers/add-game-provider";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddGameStoreProvider>{children}</AddGameStoreProvider>;
}
