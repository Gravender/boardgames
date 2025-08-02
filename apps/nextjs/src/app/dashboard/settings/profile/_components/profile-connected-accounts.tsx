"use client";

import type { SocialProvider } from "better-auth/social-providers";
import { useState } from "react";
import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { AlertCircle, Loader2 } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@board-games/ui/alert";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Icons } from "@board-games/ui/icons";
import { Skeleton } from "@board-games/ui/skeleton";
import { toast } from "@board-games/ui/toast";

import { authClient } from "~/auth/client";

const SocialProviders = [
  {
    provider: "github",
    name: "GitHub",
    icon: Icons.gitHub,
  },
  {
    provider: "google",
    name: "Google",
    icon: Icons.google,
  },
];
type Provider = (typeof SocialProviders)[number];
export function ProfileConnectedAccounts() {
  const { data: accounts, isLoading } = useQuery({
    queryKey: ["listAccounts"],
    queryFn: async () => {
      const accounts = await authClient.listAccounts();
      if (accounts.error) {
        throw new Error(accounts.error.message);
      }
      return accounts.data;
    },
  });

  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Connected Accounts</CardTitle>
          <CardDescription>
            Connect your accounts to enable single sign-on and enhance your
            profile
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading ? (
            <>
              {Array.from({ length: 2 }).map((_, index) => (
                <CellSkeleton key={index} />
              ))}
            </>
          ) : (
            SocialProviders.map((provider) => {
              return (
                <ProviderCell
                  key={provider.name}
                  account={accounts?.find(
                    (acc) => acc.provider === provider.name,
                  )}
                  provider={provider}
                />
              );
            })
          )}

          <Alert>
            <AlertCircle className="h-4 w-4" />
            <AlertTitle>Account Security</AlertTitle>
            <AlertDescription>
              Connecting multiple accounts enhances security and provides backup
              sign-in methods.
            </AlertDescription>
          </Alert>
        </CardContent>
      </Card>
    </div>
  );
}

const CellSkeleton = () => {
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

const ProviderCell = ({
  account,
  provider,
}: {
  account?: { accountId: string; provider: string } | null;
  provider: Provider;
}) => {
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const unlinkAccount = useMutation({
    mutationKey: ["unlinkAccount"],
    mutationFn: async ({
      accountId,
      providerId,
    }: {
      accountId: string;
      providerId: string;
    }) => {
      await authClient.unlinkAccount({
        accountId,
        providerId,
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
      toast.error("Error unlinking account");
    },
  });

  const handleLink = async () => {
    setIsLoading(true);

    try {
      await authClient.linkSocial({
        provider: provider.provider as SocialProvider,
        fetchOptions: { throw: true },
      });
    } catch (error) {
      console.error(error);
      toast.error("Error linking account");
      setIsLoading(false);
    }
  };

  const handleUnlink = () => {
    setIsLoading(true);

    unlinkAccount.mutate({
      accountId: account?.accountId ?? "",
      providerId: provider.provider,
    });
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
