"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { useUser } from "@clerk/nextjs";
import { AlertCircle, Loader2, Mail } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@board-games/ui/alert";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Icons } from "@board-games/ui/icons";

import type { SerializableUser } from "../page";

interface ProfileConnectedAccountsProps {
  serializableUser: SerializableUser;
}

export function ProfileConnectedAccounts({
  serializableUser,
}: ProfileConnectedAccountsProps) {
  const { toast } = useToast();
  const router = useRouter();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const { user } = useUser();

  // In a real app, these would come from the user object
  // For this example, we'll simulate some connected accounts
  const connectedAccounts = {
    google: user?.externalAccounts.find(
      (account) => account.provider === "google",
    ),
    github: user?.externalAccounts.find(
      (account) => account.provider === "github",
    ),
  };

  const connectGoogle = async () => {
    if (!user) return;

    setIsConnectingGoogle(true);

    await user
      .createExternalAccount({
        strategy: "oauth_google",
        redirectUrl: "/dashboard/user-profile/profile?tab=connected",
      })
      .then((res) => {
        console.log(res);
        toast({
          title: "Google account connected",
          description: "Your Google account has been successfully linked.",
        });
        router.refresh();
      })
      .catch((err) => {
        console.error("Error connecting Google account", err);
        toast({
          title: "Connection failed",
          description:
            "Failed to connect your Google account. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setIsConnectingGoogle(false));
  };

  const connectGithub = async () => {
    if (!user) return;
    setIsConnectingGithub(true);
    await user
      .createExternalAccount({
        strategy: "oauth_github",
        redirectUrl: "/dashboard/user-profile/profile?tab=connected",
      })
      .then((res) => {
        console.log(res);
        toast({
          title: "GitHub account connected",
          description: "Your GitHub account has been successfully linked.",
        });
        router.refresh();
      })
      .catch((err) => {
        console.error("Error connecting GitHub account", err);
        toast({
          title: "Connection failed",
          description:
            "Failed to connect your GitHub account. Please try again.",
          variant: "destructive",
        });
      })
      .finally(() => setIsConnectingGithub(false));
  };

  const disconnectAccount = async (provider: "google" | "github") => {
    if (!user) {
      toast({
        title: "Not logged in",
        description: "Please log in to disconnect your account",
      });
      return;
    }

    await user.externalAccounts
      .find((account) => account.provider === provider)
      ?.destroy()
      .then(() => {
        toast({
          title: `${provider} account disconnected`,
          description: `Your ${provider} account has been successfully unlinked.`,
        });

        router.refresh();
      })
      .catch((error) => {
        console.error(error);
        toast({
          title: "Disconnection failed",
          description: `Failed to disconnect your ${provider} account. Please try again.`,
          variant: "destructive",
        });
      });
  };

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
        <CardContent className="space-y-6">
          {/* Primary Email */}
          <div className="rounded-md border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Mail className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Email Address</p>
                  <p className="text-sm text-muted-foreground">
                    {serializableUser.primaryEmailAddress ??
                      "No email address connected"}
                  </p>
                </div>
              </div>
              <div>
                <span className="inline-flex items-center rounded-full border px-2.5 py-0.5 text-xs font-semibold">
                  Primary
                </span>
              </div>
            </div>
          </div>

          {/* Google Account */}
          <div className="rounded-md border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Icons.google className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">Google</p>
                  <p className="text-sm text-muted-foreground">
                    {connectedAccounts.google
                      ? "Connected to your Google account"
                      : "Connect your Google account for easier sign-in"}
                  </p>
                </div>
              </div>
              {connectedAccounts.google ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectAccount("google")}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connectGoogle}
                  disabled={isConnectingGoogle}
                >
                  {isConnectingGoogle ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          </div>

          {/* GitHub Account */}
          <div className="rounded-md border">
            <div className="flex items-center justify-between p-4">
              <div className="flex items-center gap-4">
                <div className="rounded-full bg-primary/10 p-2">
                  <Icons.gitHub className="h-5 w-5 text-primary" />
                </div>
                <div>
                  <p className="font-medium">GitHub</p>
                  <p className="text-sm text-muted-foreground">
                    {connectedAccounts.github
                      ? "Connected to your GitHub account"
                      : "Connect your GitHub account for easier sign-in"}
                  </p>
                </div>
              </div>
              {connectedAccounts.github ? (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={() => disconnectAccount("github")}
                >
                  Disconnect
                </Button>
              ) : (
                <Button
                  variant="outline"
                  size="sm"
                  onClick={connectGithub}
                  disabled={isConnectingGithub}
                >
                  {isConnectingGithub ? (
                    <>
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                      Connecting...
                    </>
                  ) : (
                    "Connect"
                  )}
                </Button>
              )}
            </div>
          </div>

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
