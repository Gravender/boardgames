"use client";

import type { SocialProvider } from "better-auth/social-providers";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2 } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { Card } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";
import { toast } from "@board-games/ui/toast";

import type { Provider } from "./providers";
import { authClient } from "~/auth/client";

export const ProviderCell = ({
  account,
  provider,
}: {
  account?: { accountId: string; providerId: string } | null;
  provider: Provider;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const unlinkAccount = useMutation({
    mutationKey: ["unlinkAccount"],
    mutationFn: async () => {
      await authClient.unlinkAccount({
        accountId: account?.accountId ?? "",
        providerId: provider.provider,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: async () => {
      setIsLoading(false);
      toast.success("Account unlinked successfully");
      await queryClient.invalidateQueries({
        queryKey: ["listAccounts"],
      });
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Error unlinking account");
    },
  });

  const linkAccount = useMutation({
    mutationKey: ["linkAccount"],
    mutationFn: async () => {
      await authClient.linkSocial({
        provider: provider.provider as SocialProvider,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: async () => {
      setIsLoading(false);
      toast.success("Account linked successfully");
      await queryClient.invalidateQueries({
        queryKey: ["listAccounts"],
      });
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Error linking account");
    },
  });

  const handleLink = () => {
    setIsLoading(true);

    linkAccount.mutate();
  };

  const handleUnlink = () => {
    setIsLoading(true);

    unlinkAccount.mutate();
  };

  return (
    <Card className="flex flex-row items-center gap-3 px-4 py-3">
      <provider.icon className="size-4" />

      <span className="text-sm">{provider.name}</span>

      <Button
        className="relative ms-auto"
        disabled={isLoading}
        size="sm"
        type="button"
        variant={account ? "outline" : "default"}
        onClick={account ? handleUnlink : handleLink}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {account ? "Unlink" : "Link"}
      </Button>
    </Card>
  );
};

export const CellSkeleton = () => {
  return (
    <Card className="flex flex-row items-center gap-3 px-4 py-3">
      <div className="flex items-center gap-2">
        <Skeleton className={"size-5 rounded-full"} />

        <div>
          <Skeleton className={"h-4 w-24"} />
        </div>
      </div>

      <Skeleton className={"ms-auto size-8 w-12"} />
    </Card>
  );
};
