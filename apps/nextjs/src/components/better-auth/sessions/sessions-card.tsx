"use client";

import { useQuery } from "@tanstack/react-query";

import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";

import { authClient } from "~/auth/client";
import { CellSkeleton, SessionCell } from "./cell";

export const SessionsCard = () => {
  const { data: sessions, isLoading } = useQuery({
    queryKey: ["sessions"],
    queryFn: async () => {
      const sessions = await authClient.listSessions();
      if (sessions.error) {
        throw new Error(sessions.error.message);
      }
      return sessions.data;
    },
  });
  return (
    <div className="space-y-6">
      <Card>
        <CardHeader>
          <CardTitle>Sessions</CardTitle>
          <CardDescription>
            Manage your active sessions and revoke access.
          </CardDescription>
        </CardHeader>
        <CardContent className="grid gap-4">
          {isLoading
            ? Array.from({ length: 2 }).map((_, index) => (
                <CellSkeleton key={index} />
              ))
            : sessions?.map((session) => (
                <SessionCell key={session.id} session={session} />
              ))}
        </CardContent>
      </Card>
    </div>
  );
};
