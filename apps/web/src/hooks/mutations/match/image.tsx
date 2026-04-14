"use client";

import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { usePostHog } from "posthog-js/react";

import { toast } from "@board-games/ui/toast";

import { useTRPC } from "~/trpc/react";

export const useMatchImages = ({ matchId }: { matchId: number }) => {
  const trpc = useTRPC();

  return useQuery({
    ...trpc.image.getMatchImages.queryOptions({ matchId }),
    placeholderData: (previous) => previous,
  });
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
      onSuccess: async (_data, variables) => {
        queryClient.setQueryData(
          trpc.image.getMatchImages.queryOptions({ matchId }).queryKey,
          (old) => (old ?? []).filter((img) => img.id !== variables.id),
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
