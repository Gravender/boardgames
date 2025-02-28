import "server-only";

import { cache } from "react";
import { headers } from "next/headers";
import { NextRequest } from "next/server";
import { getAuth } from "@clerk/nextjs/server";
import { createHydrationHelpers } from "@trpc/react-query/rsc";

import type { AppRouter } from "@board-games/api";
import { createCaller, createTRPCContext } from "@board-games/api";

import { createQueryClient } from "./query-client";

/**
 * This wraps the `createTRPCContext` helper and provides the required context for the tRPC API when
 * handling a tRPC call from a React Server Component.
 */
const createContext = cache(async () => {
  const heads = new Headers(await headers());
  heads.set("x-trpc-source", "rsc");
  return createTRPCContext({
    headers: heads,
    auth: getAuth(
      new NextRequest("https://notused.com", { headers: await headers() }),
    ),
  });
});

const getQueryClient = cache(createQueryClient);
const caller = createCaller(createContext);

export const { trpc: api, HydrateClient } = createHydrationHelpers<AppRouter>(
  caller,
  getQueryClient,
);
