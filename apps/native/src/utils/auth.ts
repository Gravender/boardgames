import * as SecureStore from "expo-secure-store";
import { expoClient } from "@better-auth/expo/client";
import { adminClient, usernameClient } from "better-auth/client/plugins";
import { createAuthClient } from "better-auth/react";

import { getBaseUrl } from "./base-url";

console.log("getBaseUrl", getBaseUrl());

export const authClient = createAuthClient({
  baseURL: getBaseUrl(),
  plugins: [
    expoClient({
      scheme: "expo",
      storagePrefix: "expo",
      storage: SecureStore,
    }),
    usernameClient(),
    adminClient(),
  ],
});
