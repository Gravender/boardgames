"use client";

import { AlertCircle } from "lucide-react";

import { Alert, AlertDescription, AlertTitle } from "@board-games/ui/alert";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

import { useListAccounts } from "../hooks";
import { CellSkeleton, ProviderCell } from "./cell";
import { SocialProviders } from "./providers";

export function ProfileConnectedAccounts() {
  const { accounts, isLoading } = useListAccounts();

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
