"use client";

import { AddMatchStoreProvider } from "~/providers/add-match-provider";

export default function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <AddMatchStoreProvider>{children}</AddMatchStoreProvider>;
}
