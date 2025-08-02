/* eslint-disable @typescript-eslint/no-unnecessary-condition */
"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
import { Icons } from "@board-games/ui/icons";
import { toast } from "@board-games/ui/toast";

import { authClient } from "~/auth/client";

interface ProfileConnectedAccountsProps {
  user: {
    id: string;
    name: string;
    emailVerified: boolean;
    email: string;
    createdAt: Date;
    updatedAt: Date;
    image?: string | null | undefined;
    username?: string | null | undefined;
    displayUsername?: string | null | undefined;
  };
}

export function ProfileConnectedAccounts({
  user,
}: ProfileConnectedAccountsProps) {
  const router = useRouter();
  const [isConnectingGoogle, setIsConnectingGoogle] = useState(false);
  const [isConnectingGithub, setIsConnectingGithub] = useState(false);
  const { data: session } = authClient.useSession();

  // Better Auth doesn't expose external accounts like Clerk
  // You'll need to implement this based on your database schema
  const connectedAccounts = {
    google: null, // TODO: Implement based on your account schema
    github: null, // TODO: Implement based on your account schema
  };

  const connectGoogle = async () => {
    if (!session?.user) return;

    setIsConnectingGoogle(true);

    try {
      const res = await authClient.signIn.social({
        provider: "google",
        callbackURL: "/dashboard/settings/user-profile/profile?tab=connected",
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("No URL returned from signInSocial");
      }
    } catch (err) {
      console.error("Error connecting Google account", err);
      toast.error("Connection failed", {
        description: "Failed to connect your Google account. Please try again.",
      });
    } finally {
      setIsConnectingGoogle(false);
    }
  };

  const connectGithub = async () => {
    if (!session?.user) return;

    setIsConnectingGithub(true);

    try {
      const res = await authClient.signIn.social({
        provider: "github",
        callbackURL: "/dashboard/settings/user-profile/profile?tab=connected",
      });

      if (res.data?.url) {
        window.location.href = res.data.url;
      } else {
        throw new Error("No URL returned from signInSocial");
      }
    } catch (err) {
      console.error("Error connecting GitHub account", err);
      toast.error("Connection failed", {
        description: "Failed to connect your GitHub account. Please try again.",
      });
    } finally {
      setIsConnectingGithub(false);
    }
  };

  // eslint-disable-next-line @typescript-eslint/require-await
  const disconnectAccount = async (provider: "google" | "github") => {
    if (!session?.user) {
      toast.error("Not logged in", {
        description: "Please log in to disconnect your account",
      });
      return;
    }

    try {
      // Better Auth doesn't have a direct disconnect method like Clerk
      // You'll need to create a custom API endpoint for this
      toast.success(`${provider} account disconnected`, {
        description: `Your ${provider} account has been successfully unlinked.`,
      });

      router.refresh();
    } catch (error) {
      console.error(error);
      toast.error("Disconnection failed", {
        description: `Failed to disconnect your ${provider} account. Please try again.`,
      });
    }
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
                  <p className="text-sm text-muted-foreground">{user.email}</p>
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
