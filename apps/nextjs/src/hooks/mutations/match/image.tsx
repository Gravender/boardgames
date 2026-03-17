"use client";

import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useMatchImages = ({ matchId }: { matchId: number }) => {
  const trpc = useTRPC();

  return useSuspenseQuery(trpc.image.getMatchImages.queryOptions({ matchId }));
};

export const useDeleteMatchImageMutation = ({
  matchId,
  onSuccess,
}: {
  matchId: number;
  onSuccess?: () => void;
}) => {
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const posthog = usePostHog();

  return useMutation(
    trpc.image.deleteMatchImage.mutationOptions({
      onSuccess: async () => {
        await queryClient.invalidateQueries(
          trpc.image.getMatchImages.queryOptions({ matchId }),
        );
        toast.success("Image deleted successfully!");
        onSuccess?.();
      },
      onError: (error) => {
        posthog.capture("match image delete error", {
          matchId,
          errorMessage: error.message,
        });
        toast.error("Failed to delete image");
      },
    }),
  );
};
