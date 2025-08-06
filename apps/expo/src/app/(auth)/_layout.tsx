import { Redirect, Stack } from "expo-router";

import { authClient } from "~/utils/auth";

export default function AuthRoutesLayout() {
  const { data: session } = authClient.useSession();

  if (session !== null) {
    return <Redirect href={"/"} />;
  }

  return <Stack />;
}
