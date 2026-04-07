"use client";

import { useMutation } from "@tanstack/react-query";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export function useRequestShareGameMutation() {
  const trpc = useTRPC();
  const requestShareGameMutation = useMutation(
    trpc.sharing.requestShareGame.mutationOptions({
      onError: () => {
        toast.error("Could not send share request", {
          description: "Please try again.",
        });
      },
    }),
  );
  return { requestShareGameMutation };
}
