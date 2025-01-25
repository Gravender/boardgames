"use server";

import { EditGameStoreProvider } from "~/providers/edit-game-provider";

// eslint-disable-next-line @typescript-eslint/require-await
export default async function Layout({
  children,
}: Readonly<{
  children: React.ReactNode;
}>) {
  return <EditGameStoreProvider>{children}</EditGameStoreProvider>;
}
