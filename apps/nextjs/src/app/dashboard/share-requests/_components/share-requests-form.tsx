"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { zodResolver } from "@hookform/resolvers/zod";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
  Check,
  Clock,
  GamepadIcon as GameController,
  Loader2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod";

import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import {
  Form,
  FormControl,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { toast } from "@board-games/ui/hooks/use-toast";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { ScrollArea } from "@board-games/ui/scroll-area";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@board-games/ui/select";
import { Separator } from "@board-games/ui/separator";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { useTRPC } from "~/trpc/react";

export default function ShareRequestsPage() {
  const [loading, setLoading] = useState<Record<string, boolean>>({});
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: incomingRequests } = useSuspenseQuery(
    trpc.sharing.getIncomingShareRequests.queryOptions(),
  );
  const { data: outgoingRequests } = useSuspenseQuery(
    trpc.sharing.getOutgoingShareRequests.queryOptions(),
  );

  const formatDate = (dateString: string) => {
    const date = new Date(dateString);
    return (
      date.toLocaleDateString() +
      " at " +
      date.toLocaleTimeString([], { hour: "2-digit", minute: "2-digit" })
    );
  };

  return (
    <div className="container max-w-4xl py-10">
      <div className="mb-8">
        <h1 className="text-3xl font-bold">Share Requests</h1>
        <p className="text-muted-foreground">
          Manage incoming and outgoing share requests
        </p>
      </div>

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
                <h3 className="mt-4 text-lg font-medium">
                  No incoming requests
                </h3>
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
                        <CardTitle>{request.itemName}</CardTitle>
                        <CardDescription>
                          Shared by {request.ownerName} on{" "}
                          {formatDate(request.date)}
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
                      {request.includes && request.includes.length > 0 && (
                        <div className="text-sm text-muted-foreground">
                          <p>This share includes:</p>
                          <ul className="ml-5 list-disc">
                            {request.includes.map((item, index) => (
                              <li key={index}>{item}</li>
                            ))}
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
                <h3 className="mt-4 text-lg font-medium">
                  No outgoing requests
                </h3>
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
                        <CardTitle>{request.itemName}</CardTitle>
                        <CardDescription>
                          Shared with {request.sharedWithName} on{" "}
                          {formatDate(request.date)}
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
    </div>
  );
}
