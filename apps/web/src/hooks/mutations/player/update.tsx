"use client";

import { useMutation } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import {
  useInvalidatePlayer,
  useInvalidatePlayers,
} from "~/hooks/invalidate/player";
import { useTRPC } from "~/trpc/react";

export const useUpdatePlayerMutation = () => {
  const trpc = useTRPC();
  const invalidatePlayer = useInvalidatePlayer();
  const invalidatePlayers = useInvalidatePlayers();
  const updatePlayerMutation = useMutation(
    trpc.newPlayer.update.mutationOptions({
      onSuccess: async (_data, variables) => {
        const playerEntityId =
          variables.type === "shared" ? variables.sharedId : variables.id;
        await Promise.all([
          ...invalidatePlayer(playerEntityId, variables.type),
          ...invalidatePlayers(),
        ]);
        toast.success("Player updated successfully!");
      },
      onError: () => {
        toast.error("Error", {
          description: "There was a problem updating your player.",
        });
      },
    }),
  );
  return { updatePlayerMutation };
};
