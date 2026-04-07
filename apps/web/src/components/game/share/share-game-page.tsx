"use client";

import { ShareRequestConfirmDialog } from "./share-request-confirm-dialog";
import { ShareGameDataProvider } from "./share-game-data-context";
import { ShareSummaryMobile } from "./share-summary-mobile";
import { ShareGameFormSections } from "./share-game-form-sections";
import { ShareGameHeader } from "./share-game-header";
import { getGameInitials } from "./share-preview";
import type { FriendRow, GameData } from "./types";
import { useShareGameForm } from "./use-share-game-form";
import { useShareGameSendFlow } from "./use-share-game-send-flow";

import { useFriendsQuery } from "~/hooks/queries/friend/use-friends";
import { useGameToShareQuery } from "~/hooks/queries/game/use-game-to-share";
import { useRequestShareGameMutation } from "~/hooks/mutations/sharing/use-request-share-game";

function ShareGameLoading() {
  return <p className="text-muted-foreground text-sm">Loading share data…</p>;
}

function ShareGamePageInner({ gameId }: { gameId: number }) {
  const { data: gameData, isPending: gameDataPending } =
    useGameToShareQuery(gameId);
  const { data: friends, isPending: friendsPending } = useFriendsQuery();

  if (gameDataPending || friendsPending || !gameData || !friends) {
    return <ShareGameLoading />;
  }

  return (
    <ShareGameFormShell gameId={gameId} gameData={gameData} friends={friends} />
  );
}

function ShareGameFormShell({
  gameId,
  gameData,
  friends,
}: {
  gameId: number;
  gameData: GameData;
  friends: FriendRow[];
}) {
  const { requestShareGameMutation } = useRequestShareGameMutation();
  const form = useShareGameForm({
    gameId,
    gameData,
    requestShareGameMutation,
  });

  const {
    confirmOpen,
    setConfirmOpen,
    handleSendRequest,
    handleConfirmSend,
    inlineValidation,
  } = useShareGameSendFlow(form, gameData);

  return (
    <form
      onSubmit={(e) => {
        e.preventDefault();
        e.stopPropagation();
        handleSendRequest();
      }}
      className="pb-4"
    >
      <form.AppForm>
        <ShareGameDataProvider gameData={gameData}>
          <ShareGameHeader
            gameId={gameId}
            gameName={gameData.name}
            gameInitials={getGameInitials(gameData.name)}
            onSendRequest={handleSendRequest}
          />

          <ShareGameFormSections
            friends={friends}
            inlineValidation={inlineValidation}
            onSendRequest={handleSendRequest}
          />

          <ShareSummaryMobile
            onSendRequest={handleSendRequest}
            friends={friends}
          />

          <ShareRequestConfirmDialog
            open={confirmOpen}
            onOpenChange={setConfirmOpen}
            onConfirm={handleConfirmSend}
            gameName={gameData.name}
            friends={friends}
          />
        </ShareGameDataProvider>
      </form.AppForm>
    </form>
  );
}

export type ShareGamePageProps = {
  gameId: number;
  /**
   * When both are set, skips `getGameToShare` / `getFriends` queries (used in tests).
   * Production passes `gameId` only; data comes from prefetched tRPC queries.
   */
  gameData?: GameData;
  friends?: FriendRow[];
};

export function ShareGamePage({
  gameId,
  gameData: gameDataProp,
  friends: friendsProp,
}: ShareGamePageProps) {
  if (gameDataProp !== undefined && friendsProp !== undefined) {
    return (
      <ShareGameFormShell
        gameId={gameId}
        gameData={gameDataProp}
        friends={friendsProp}
      />
    );
  }
  return <ShareGamePageInner gameId={gameId} />;
}
