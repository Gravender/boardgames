"use client";

import { useState } from "react";
import { useQueryClient, useSuspenseQuery } from "@tanstack/react-query";
import {
  Check,
  Clock,
  GamepadIcon as GameController,
  Loader2,
  X,
} from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useTRPC } from "~/trpc/react";

export default function ShareRequestsPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: incomingRequests } = useSuspenseQuery(
    trpc.sharing.getIncomingShareRequests.queryOptions(),
  );
  const { data: outgoingRequests } = useSuspenseQuery(
    trpc.sharing.getOutgoingShareRequests.queryOptions(),
  );

  const handleAccept = async (id: number) => {
    setLoading({ ...loading, [`accept-${id}`]: true });

    try {
      // This would be replaced with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Share request accepted",
        description: "The shared item has been added to your collection",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to accept share request",
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, [`accept-${id}`]: false });
    }
  };

  const handleReject = async (id: number) => {
    setLoading({ ...loading, [`reject-${id}`]: true });

    try {
      // This would be replaced with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Share request rejected",
        description: "The share request has been rejected",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to reject share request",
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, [`reject-${id}`]: false });
    }
  };

  const handleCancel = async (id: number) => {
    setLoading({ ...loading, [`cancel-${id}`]: true });

    try {
      // This would be replaced with your actual API call
      await new Promise((resolve) => setTimeout(resolve, 1000));

      toast({
        title: "Share request cancelled",
        description: "Your share request has been cancelled",
      });
    } catch (error) {
      toast({
        title: "Error",
        description: "Failed to cancel share request",
        variant: "destructive",
      });
    } finally {
      setLoading({ ...loading, [`cancel-${id}`]: false });
    }
  };

  const formatDate = (date: Date) => {
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };
  console.log(outgoingRequests);

  return (
    <Tabs defaultValue="incoming">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="incoming">
          Incoming Requests
          {incomingRequests.length > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {incomingRequests.length}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing">Outgoing Requests</TabsTrigger>
      </TabsList>

      <TabsContent value="incoming" className="space-y-4 pt-4">
        {incomingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <GameController className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No incoming requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You don't have any incoming share requests at the moment
              </p>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {incomingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{request.name}</CardTitle>
                      <CardDescription>
                        Shared by {request.ownerName} on{" "}
                        {formatDate(request.createdAt)}
                      </CardDescription>
                    </div>
                    <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      {request.permission === "view"
                        ? "View Only"
                        : "Edit Access"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <p className="text-sm">
                      <span className="font-medium">{request.ownerName}</span>{" "}
                      wants to share their {request.type} with you
                    </p>
                    {request.hasChildren && (
                      <div className="text-sm text-muted-foreground">
                        <p>This share includes:</p>
                        <ul className="ml-5 list-disc">
                          {(request.game ?? 0) > 0 && <li>{`1 game`}</li>}
                          {(request.scoresheets ?? 0) > 0 && (
                            <li>{`${request.scoresheets} scoresheets`}</li>
                          )}
                          {(request.matches ?? 0) > 0 && (
                            <li>{`${request.matches} matches`}</li>
                          )}
                          {(request.players ?? 0) > 0 && (
                            <li>{`${request.players} players`}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
                <CardFooter className="flex justify-between gap-2">
                  <Button
                    variant="outline"
                    className="w-full"
                    onClick={() => handleReject(request.id)}
                    disabled={
                      loading[`reject-${request.id}`] ||
                      loading[`accept-${request.id}`]
                    }
                  >
                    {loading[`reject-${request.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <X className="mr-2 h-4 w-4" />
                    )}
                    Reject
                  </Button>
                  <Button
                    className="w-full"
                    onClick={() => handleAccept(request.id)}
                    disabled={
                      loading[`reject-${request.id}`] ||
                      loading[`accept-${request.id}`]
                    }
                  >
                    {loading[`accept-${request.id}`] ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Check className="mr-2 h-4 w-4" />
                    )}
                    Accept
                  </Button>
                </CardFooter>
              </Card>
            ))}
          </div>
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="space-y-4 pt-4">
        {outgoingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <GameController className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No outgoing requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                You haven't shared any games with others yet
              </p>
              <Button
                className="mt-4"
                onClick={() => (window.location.href = "/share-game")}
              >
                Share a Game
              </Button>
            </CardContent>
          </Card>
        ) : (
          <div className="grid gap-4">
            {outgoingRequests.map((request) => (
              <Card key={request.id}>
                <CardHeader>
                  <div className="flex items-center justify-between">
                    <div>
                      <CardTitle>{request.name}</CardTitle>
                      {request.sharedWith ? (
                        <CardDescription>
                          Shared with {request.sharedWith} on{" "}
                          {formatDate(request.createdAt)}
                        </CardDescription>
                      ) : (
                        <CardDescription>
                          Created share Link on {formatDate(request.createdAt)}
                        </CardDescription>
                      )}
                    </div>
                    <div className="rounded-full bg-secondary px-3 py-1 text-xs font-medium">
                      {request.permission === "view"
                        ? "View Only"
                        : "Edit Access"}
                    </div>
                  </div>
                </CardHeader>
                <CardContent>
                  <div className="space-y-2">
                    <div className="flex items-center gap-2">
                      {request.status === "pending" ? (
                        <>
                          <Clock className="h-4 w-4 text-muted-foreground" />
                          <span className="text-sm text-muted-foreground">
                            Waiting for response
                          </span>
                        </>
                      ) : request.status === "accepted" ? (
                        <>
                          <Check className="h-4 w-4 text-green-500" />
                          <span className="text-sm text-green-500">
                            Accepted
                          </span>
                        </>
                      ) : (
                        <>
                          <X className="h-4 w-4 text-red-500" />
                          <span className="text-sm text-red-500">Rejected</span>
                        </>
                      )}
                    </div>
                    {request.hasChildren && (
                      <div className="text-sm text-muted-foreground">
                        <p>This share includes:</p>
                        <ul className="ml-5 list-disc">
                          {(request.game ?? 0) > 0 && <li>{`1 game`}</li>}
                          {(request.scoresheets ?? 0) > 0 && (
                            <li>{`${request.scoresheets} scoresheets`}</li>
                          )}
                          {(request.matches ?? 0) > 0 && (
                            <li>{`${request.matches} matches`}</li>
                          )}
                          {(request.players ?? 0) > 0 && (
                            <li>{`${request.players} players`}</li>
                          )}
                        </ul>
                      </div>
                    )}
                  </div>
                </CardContent>
                {request.status === "pending" && (
                  <CardFooter>
                    <Button
                      variant="outline"
                      className="w-full"
                      onClick={() => handleCancel(request.id)}
                      disabled={loading[`cancel-${request.id}`]}
                    >
                      {loading[`cancel-${request.id}`] ? (
                        <Loader2 className="h-4 w-4 animate-spin" />
                      ) : (
                        "Cancel Request"
                      )}
                    </Button>
                  </CardFooter>
                )}
              </Card>
            ))}
          </div>
        )}
      </TabsContent>
    </Tabs>
  );
}
