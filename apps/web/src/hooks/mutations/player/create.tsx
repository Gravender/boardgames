"use client";

import { useMutation } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useInvalidatePlayers } from "~/hooks/invalidate/player";
import { useTRPC } from "~/trpc/react";

export const useCreatePlayerMutation = () => {
  const trpc = useTRPC();
  const invalidatePlayers = useInvalidatePlayers();
  const createPlayerMutation = useMutation(
    trpc.newPlayer.create.mutationOptions({
      onSuccess: async () => {
        await Promise.all(invalidatePlayers());
        toast.success("Player created successfully!");
      },
      onError: () => {
        toast.error("Error", {
          description: "There was a problem creating your player.",
        });
      },
    }),
  );
  return { createPlayerMutation };
};
