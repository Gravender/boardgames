"use client";

import type { Session } from "better-auth";
import { useState } from "react";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { Loader2, Monitor, SmartphoneIcon, Tablet } from "lucide-react";
import { UAParser } from "ua-parser-js";

import { Button } from "@board-games/ui/button";
import { Card } from "@board-games/ui/card";
import { Skeleton } from "@board-games/ui/skeleton";
import { toast } from "@board-games/ui/toast";

import { authClient } from "~/auth/client";

export const SessionCell = ({ session }: { session: Session }) => {
  const [isLoading, setIsLoading] = useState(false);

  const queryClient = useQueryClient();

  const { data: sessionData } = authClient.useSession();
  const isCurrentSession = session.id === sessionData?.session.id;

  const revokeSession = useMutation({
    mutationKey: ["revokeSession"],
    mutationFn: async () => {
      if (isCurrentSession) {
        return authClient.signOut();
      }
      await authClient.revokeSession({
        token: session.token,
        fetchOptions: { throw: true },
      });
    },
    onSuccess: async () => {
      setIsLoading(false);
      toast.success("Session revoked successfully");
      await queryClient.invalidateQueries({
        queryKey: ["sessions"],
      });
    },
    onError: () => {
      setIsLoading(false);
      toast.error("Error revoking session");
    },
  });

  const getDeviceIcon = (userAgent?: UAParser.IDevice["type"]) => {
    if (userAgent === "mobile") {
      return <SmartphoneIcon className="size-4" />;
    } else if (userAgent === "tablet") {
      return <Tablet className="size-4" />;
    }

    return <Monitor className="size-4" />;
  };

  // eslint-disable-next-line @typescript-eslint/no-non-null-assertion
  const parser = UAParser(session.userAgent!);

  return (
    <Card className="flex-row items-center gap-3 px-4 py-3">
      {getDeviceIcon(parser.device.type)}

      <div className="flex flex-col">
        <span className="text-sm font-semibold">
          {isCurrentSession ? "Current Session" : session.ipAddress}
        </span>

        <span className="text-xs text-muted-foreground">
          {parser.os.name}, {parser.browser.name}
        </span>
      </div>

      <Button
        className="relative ms-auto"
        disabled={isLoading}
        size="sm"
        variant="outline"
        onClick={() => {
          setIsLoading(true);
          revokeSession.mutate();
        }}
      >
        {isLoading && <Loader2 className="animate-spin" />}
        {isCurrentSession ? "Sign Out" : "Revoke"}
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
