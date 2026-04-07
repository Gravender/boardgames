"use client";

import type { ReactNode } from "react";

import { useRequestShareGameMutation } from "~/hooks/mutations/sharing/use-request-share-game";

import { ShareGameDataProvider } from "../share-game-data-context";
import { MOCK_FRIENDS, MOCK_GET_GAME_TO_SHARE } from "./share-test-fixtures";
import type { FriendRow, GameData } from "../types";
import { useShareGameForm, type ShareGameForm } from "../use-share-game-form";

export type ShareFormHarnessContext = {
  form: ShareGameForm;
  gameData: GameData;
  friends: FriendRow[];
};

type ShareFormTestHarnessProps = {
  gameId?: number;
  gameData?: GameData;
  friends?: FriendRow[];
  children: (ctx: ShareFormHarnessContext) => ReactNode;
};

/**
 * Provides a real {@link useShareGameForm} instance for testing section components.
 * Colocated tests should mock tRPC with `getShareGameTrpcReactMock` from `./share-trpc-mock`
 * (see existing `*.test.tsx` files in this folder).
 */
export function ShareFormTestHarness({
  gameId = 1,
  gameData = MOCK_GET_GAME_TO_SHARE,
  friends = MOCK_FRIENDS,
  children,
}: ShareFormTestHarnessProps) {
  const { requestShareGameMutation } = useRequestShareGameMutation();
  const form = useShareGameForm({
    gameId,
    gameData,
    requestShareGameMutation,
  });
  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
      }}
    >
      <form.AppForm>
        <ShareGameDataProvider gameData={gameData}>
          {children({ form, gameData, friends })}
        </ShareGameDataProvider>
      </form.AppForm>
    </form>
  );
}
