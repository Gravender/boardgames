"use client";

import { useMemo, useState } from "react";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { differenceInCalendarDays, format, isBefore } from "date-fns";
import {
  Check,
  Clock,
  Copy,
  Filter,
  GamepadIcon as GameController,
  LinkIcon,
  Loader2,
  X,
} from "lucide-react";

import { Badge } from "@board-games/ui/badge";
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
import { Input } from "@board-games/ui/input";
import { Label } from "@board-games/ui/label";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Switch } from "@board-games/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import {
  Tooltip,
  TooltipContent,
  TooltipProvider,
  TooltipTrigger,
} from "@board-games/ui/tooltip";
import { cn } from "@board-games/ui/utils";

import { getBaseUrl, useTRPC } from "~/trpc/react";

export default function ShareRequestsPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const [copiedLinks, setCopiedLinks] = useState<Record<number, boolean>>({});
  const [filterIncomingActive, setFilterIncomingActive] = useState(false);
  const [filterOutgoingActive, setFilterOutgoingActive] = useState(false);
  const trpc = useTRPC();
  const { toast } = useToast();
  const queryClient = useQueryClient();
  const { data: incomingRequests } = useSuspenseQuery(
    trpc.sharing.getIncomingShareRequests.queryOptions(),
  );
  const { data: outgoingRequests } = useSuspenseQuery(
    trpc.sharing.getOutgoingShareRequests.queryOptions(),
  );
  const respondToShareRequestMutation = useMutation(
    trpc.sharing.respondToShareRequest.mutationOptions({
      onSuccess: () => {
        void queryClient.invalidateQueries(
          trpc.sharing.getIncomingShareRequests.queryOptions(),
        );
        void queryClient.invalidateQueries(
          trpc.sharing.getOutgoingShareRequests.queryOptions(),
        );
      },
    }),
  );

  const handleAccept = (id: number) => {
    setLoading({ ...loading, [`accept-${id}`]: true });
    respondToShareRequestMutation.mutate({
      requestId: id,
      accept: true,
    });
  };

  const handleReject = (id: number) => {
    setLoading({ ...loading, [`reject-${id}`]: true });

    respondToShareRequestMutation.mutate({
      requestId: id,
      accept: false,
    });
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

  const copyShareLink = (id: number, link: string) => {
    void navigator.clipboard.writeText(link);
    setCopiedLinks({ ...copiedLinks, [id]: true });

    setTimeout(() => {
      setCopiedLinks((prev) => ({ ...prev, [id]: false }));
    }, 2000);

    toast({
      title: "Link copied",
      description: "Share link copied to clipboard",
    });
  };

  const formatDate = (date: Date) => {
    return `${format(date, "P")} at ${format(date, "p")}`;
  };
  const formatExpiry = (expiryDate: Date | null) => {
    if (expiryDate === null) return "never expires";

    const now = new Date();

    if (isBefore(expiryDate, now)) return "expired";

    const diffDays = differenceInCalendarDays(expiryDate, now);

    if (diffDays === 0) return "expires today";
    if (diffDays === 1) return "expires tomorrow";
    if (diffDays < 7) return `expires in ${diffDays} days`;
    if (diffDays === 7) return `expires in a week`;

    return `expires on ${format(expiryDate, "P")}`;
  };
  const isExpired = (expiresAt: Date | null) => {
    if (expiresAt === null) return false;

    return isBefore(expiresAt, new Date());
  };

  const getExpiryStatusColor = (expiresAt: Date | null) => {
    if (expiresAt === null) return "text-green-500";

    const diffDays = differenceInCalendarDays(expiresAt, new Date());

    if (diffDays <= 0) return "text-red-500";
    if (diffDays <= 3) return "text-amber-500";
    if (diffDays <= 7) return "text-yellow-500";

    return "text-green-500";
  };
  const shareUrl = (token: string) => {
    return `${getBaseUrl()}/share/${token}`;
  };

  const filteredIncomingRequests = useMemo(() => {
    return incomingRequests.filter((request) => {
      if (!filterIncomingActive) return true;
      return !isExpired(request.expiredAt) && request.status === "pending";
    });
  }, [incomingRequests, filterIncomingActive]);

  // Memoized filtered outgoing requests
  const filteredOutgoingRequests = useMemo(() => {
    return outgoingRequests.filter((request) => {
      if (!filterOutgoingActive) return true;

      if (!request.sharedWith) {
        return !isExpired(request.expiredAt) && request.status === "pending";
      }

      return !isExpired(request.expiredAt) && request.status === "pending";
    });
  }, [outgoingRequests, filterOutgoingActive]);
  const activeIncomingCount = useMemo(() => {
    return incomingRequests.filter(
      (request) =>
        !isExpired(request.expiredAt) && request.status === "pending",
    ).length;
  }, [incomingRequests]);

  // Memoized active outgoing count
  const activeOutgoingCount = useMemo(() => {
    return outgoingRequests.filter((request) => {
      if (!request.sharedWith) {
        return !isExpired(request.expiredAt) && request.status === "pending";
      }
      return !isExpired(request.expiredAt) && request.status === "pending";
    }).length;
  }, [outgoingRequests]);

  return (
    <Tabs defaultValue="incoming">
      <TabsList className="grid w-full grid-cols-2">
        <TabsTrigger value="incoming">
          Incoming Requests
          {activeIncomingCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeIncomingCount}
            </span>
          )}
        </TabsTrigger>
        <TabsTrigger value="outgoing">
          Outgoing Requests
          {activeOutgoingCount > 0 && (
            <span className="ml-2 rounded-full bg-primary px-2 py-0.5 text-xs text-primary-foreground">
              {activeOutgoingCount}
            </span>
          )}
        </TabsTrigger>
      </TabsList>

      <TabsContent value="incoming" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="filter-incoming"
              checked={filterIncomingActive}
              onCheckedChange={setFilterIncomingActive}
            />
            <Label
              htmlFor="filter-incoming"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Show only active requests
            </Label>
          </div>
          <div className="text-sm text-muted-foreground">
            {filterIncomingActive ? (
              <span>
                Showing {filteredIncomingRequests.length} active of{" "}
                {incomingRequests.length} total
              </span>
            ) : (
              <span>Showing all {incomingRequests.length} requests</span>
            )}
          </div>
        </div>

        {filteredIncomingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <GameController className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No incoming requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filterIncomingActive
                  ? "You don't have any active incoming share requests at the moment"
                  : "You don't have any incoming share requests at the moment"}
              </p>
              {filterIncomingActive && incomingRequests.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setFilterIncomingActive(false)}
                >
                  Show All Requests
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[68vh] sm:h-[75vh]">
            <div className="grid gap-4">
              {filteredIncomingRequests.map((request) => {
                const expired = isExpired(request.expiredAt);
                const expiryStatusColor = getExpiryStatusColor(
                  request.expiredAt,
                );
                return (
                  <Card
                    key={request.id}
                    className={cn(expired ? "opacity-75" : "")}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{`${request.name} (${request.type})`}</CardTitle>
                          <CardDescription suppressHydrationWarning>
                            Shared by {request.ownerName} on{" "}
                            {formatDate(request.createdAt)}
                          </CardDescription>
                        </div>
                        <div className="flex flex-col items-center gap-2 xs:flex-row">
                          <Badge variant="secondary">
                            {request.permission === "view" ? "View" : "Edit"}
                          </Badge>
                          {expired && request.status === "pending" && (
                            <Badge variant="destructive" className="ml-2">
                              Expired
                            </Badge>
                          )}
                          {request.status === "accepted" && (
                            <Badge
                              variant="destructive"
                              className="ml-2 bg-green-500 dark:bg-green-600/80"
                            >
                              Accepted
                            </Badge>
                          )}
                          {request.status === "rejected" && (
                            <Badge variant="destructive" className="ml-2">
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-2">
                        {(request.status === "accepted" ||
                          request.status === "pending") && (
                          <p className="text-sm">
                            <span className="font-medium">
                              {request.ownerName}
                            </span>
                            {request.status === "pending" && (
                              <span>
                                {` wants to share their ${request.type} with you`}
                              </span>
                            )}
                            {request.status === "accepted" && (
                              <span>
                                {` shared their ${request.type} with you`}
                              </span>
                            )}
                          </p>
                        )}
                        {request.status === "pending" && (
                          <div
                            className={`text-sm ${expiryStatusColor} flex items-center gap-1`}
                          >
                            <Clock className="h-4 w-4" />
                            <span suppressHydrationWarning>
                              {expired
                                ? "This request has expired"
                                : `This request ${formatExpiry(request.expiredAt)}`}
                            </span>
                          </div>
                        )}
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
                              {request.players > 0 && (
                                <li>{`${request.players} players`}</li>
                              )}
                            </ul>
                          </div>
                        )}
                      </div>
                    </CardContent>
                    {!expired && request.status === "pending" && (
                      <CardFooter className="flex justify-between gap-2">
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleReject(request.id)}
                          disabled={
                            loading[`reject-${request.id}`] ??
                            loading[`accept-${request.id}`]
                          }
                        >
                          {loading[`reject-${request.id}`] ? (
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
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
                            <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                          ) : (
                            <Check className="mr-2 h-4 w-4" />
                          )}
                          Accept
                        </Button>
                      </CardFooter>
                    )}
                    {expired && request.status === "pending" && (
                      <CardFooter>
                        <p className="w-full text-center text-sm text-muted-foreground">
                          This request has expired and can no longer be accepted
                        </p>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>

      <TabsContent value="outgoing" className="space-y-4 pt-4">
        <div className="flex items-center justify-between">
          <div className="flex items-center space-x-2">
            <Switch
              id="filter-outgoing"
              checked={filterOutgoingActive}
              onCheckedChange={setFilterOutgoingActive}
            />
            <Label
              htmlFor="filter-outgoing"
              className="flex items-center gap-1.5 text-sm font-medium"
            >
              <Filter className="h-4 w-4" />
              Show only active requests
            </Label>
          </div>
          <div className="text-sm text-muted-foreground">
            {filterOutgoingActive ? (
              <span>
                Showing {filteredOutgoingRequests.length} active of{" "}
                {outgoingRequests.length} total
              </span>
            ) : (
              <span>Showing all {outgoingRequests.length} requests</span>
            )}
          </div>
        </div>

        {filteredOutgoingRequests.length === 0 ? (
          <Card>
            <CardContent className="flex flex-col items-center justify-center py-10 text-center">
              <GameController className="h-10 w-10 text-muted-foreground" />
              <h3 className="mt-4 text-lg font-medium">No outgoing requests</h3>
              <p className="mt-2 text-sm text-muted-foreground">
                {filterOutgoingActive
                  ? "You don't have any active outgoing share requests at the moment"
                  : "You haven't shared any games with others yet"}
              </p>
              {filterOutgoingActive && outgoingRequests.length > 0 && (
                <Button
                  variant="outline"
                  className="mt-4"
                  onClick={() => setFilterOutgoingActive(false)}
                >
                  Show All Requests
                </Button>
              )}
            </CardContent>
          </Card>
        ) : (
          <ScrollArea className="h-[68vh] sm:h-[75vh]">
            <div className="grid gap-4">
              {filteredOutgoingRequests.map((request) => {
                const expired = isExpired(request.expiredAt);

                return (
                  <Card
                    key={request.id}
                    className={cn(expired ? "opacity-75" : "")}
                  >
                    <CardHeader>
                      <div className="flex items-center justify-between">
                        <div>
                          <CardTitle>{`${request.name} (${request.type})`}</CardTitle>
                          {request.sharedWith ? (
                            <CardDescription suppressHydrationWarning>
                              Shared with {request.sharedWith} on{" "}
                              {formatDate(request.createdAt)}
                            </CardDescription>
                          ) : (
                            <CardDescription suppressHydrationWarning>
                              Shared via link on {formatDate(request.createdAt)}
                            </CardDescription>
                          )}
                        </div>
                        <div className="flex flex-col items-center gap-2 xs:flex-row">
                          <Badge variant="secondary">
                            {request.permission === "view" ? "View" : "Edit"}
                          </Badge>
                          {expired && request.status === "pending" && (
                            <Badge variant="destructive" className="ml-2">
                              Expired
                            </Badge>
                          )}
                          {request.status === "accepted" && (
                            <Badge
                              variant="destructive"
                              className="ml-2 bg-green-500 dark:bg-green-600/80"
                            >
                              Accepted
                            </Badge>
                          )}
                          {request.status === "rejected" && (
                            <Badge variant="destructive" className="ml-2">
                              Rejected
                            </Badge>
                          )}
                        </div>
                      </div>
                    </CardHeader>
                    <CardContent>
                      <div className="space-y-3">
                        <div className="flex items-center gap-2">
                          {!request.sharedWith &&
                          request.status === "pending" ? (
                            <>
                              <LinkIcon className="h-4 w-4 text-blue-500" />
                              <span
                                className="text-sm"
                                suppressHydrationWarning
                              >
                                {`Link (${formatExpiry(request.expiredAt)})`}
                              </span>
                            </>
                          ) : request.status === "pending" ? (
                            <>
                              <Clock className="h-4 w-4 text-muted-foreground" />
                              <span className="text-sm text-muted-foreground">
                                Waiting for response
                              </span>
                              {request.expiredAt && (
                                <span
                                  className="text-sm text-muted-foreground"
                                  suppressHydrationWarning
                                >
                                  {`(${formatExpiry(request.expiredAt)})`}
                                </span>
                              )}
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
                              <span className="text-sm text-red-500">
                                Rejected
                              </span>
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
                        {!request.sharedWith &&
                          !expired &&
                          request.status === "pending" && (
                            <div className="mt-3 flex items-center gap-2">
                              <Input
                                value={shareUrl(request.token)}
                                readOnly
                                className="flex-1 font-mono text-sm"
                              />
                              <TooltipProvider>
                                <Tooltip>
                                  <TooltipTrigger asChild>
                                    <Button
                                      variant="outline"
                                      size="icon"
                                      onClick={() =>
                                        copyShareLink(
                                          request.id,
                                          shareUrl(request.token),
                                        )
                                      }
                                    >
                                      {copiedLinks[request.id] ? (
                                        <Check className="h-4 w-4" />
                                      ) : (
                                        <Copy className="h-4 w-4" />
                                      )}
                                    </Button>
                                  </TooltipTrigger>
                                  <TooltipContent>
                                    <p>
                                      {copiedLinks[request.id]
                                        ? "Copied!"
                                        : "Copy link"}
                                    </p>
                                  </TooltipContent>
                                </Tooltip>
                              </TooltipProvider>
                            </div>
                          )}
                        {!request.sharedWith &&
                          expired &&
                          request.status === "pending" && (
                            <div className="mt-3 text-sm text-red-500">
                              This share link has expired and is no longer
                              accessible.
                            </div>
                          )}
                      </div>
                    </CardContent>
                    {request.status === "pending" && !expired && (
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
                    {expired && request.status === "pending" && (
                      <CardFooter>
                        <Button
                          variant="outline"
                          className="w-full"
                          onClick={() => handleCancel(request.id)}
                        >
                          Remove from History
                        </Button>
                      </CardFooter>
                    )}
                  </Card>
                );
              })}
            </div>
          </ScrollArea>
        )}
      </TabsContent>
    </Tabs>
  );
}
