"use client";

import { useState } from "react";
import Image from "next/image";
import { useRouter } from "next/navigation";
import { standardSchemaResolver } from "@hookform/resolvers/standard-schema";
import {
  useMutation,
  useQueryClient,
  useSuspenseQuery,
} from "@tanstack/react-query";
import { addDays } from "date-fns";
import {
  Calendar,
  Check,
  ChevronDown,
  Clock,
  Dices,
  Link,
  Loader2,
  Share2,
  X,
} from "lucide-react";
import { useForm } from "react-hook-form";
import { z } from "zod/v4";

import { formatDuration } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
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
  FormDescription,
  FormField,
  FormItem,
  FormLabel,
  FormMessage,
} from "@board-games/ui/form";
import { useToast } from "@board-games/ui/hooks/use-toast";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { Separator } from "@board-games/ui/separator";
import { Switch } from "@board-games/ui/switch";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { useTRPC } from "~/trpc/react";

const formSchema = z.object({
  shareMethod: z.enum(["friends", "link"]),
  friendIds: z.array(z.number()).optional(),
  permission: z.enum(["view", "edit"]),
  linkExpiry: z.enum(["1day", "7days", "30days", "never"]).default("7days"),
  includePlayers: z.boolean(),
});

type FormValues = z.infer<typeof formSchema>;
export default function ShareMatchPage({ matchId }: { matchId: number }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<
    { id: number; name: string; email: string }[]
  >([]);
  const { toast } = useToast();
  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: matchToShare } = useSuspenseQuery(
    trpc.match.getMatchToShare.queryOptions({ id: matchId }),
  );
  const { data: friends } = useSuspenseQuery(
    trpc.friend.getFriends.queryOptions(),
  );
  const shareMatchMutation = useMutation(
    trpc.sharing.requestShareMatch.mutationOptions({
      onSuccess: async (response) => {
        await queryClient.invalidateQueries(
          trpc.sharing.getIncomingShareRequests.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.sharing.getOutgoingShareRequests.queryOptions(),
        );
        if (response.success) {
          if (response.shareableUrl) {
            toast({
              title: "Success",
              description: `Share link generated! ${response.shareableUrl}`,
            });
          } else {
            toast({
              title: "Success",
              description: response.message,
            });
          }
          form.reset();
          setIsLoading(false);
        } else {
          toast({
            title: "Error",
            description: response.message,
            variant: "destructive",
          });
        }
      },
      onError: (error) => {
        toast({
          title: "Error",
          description: `${error.message}`,
          variant: "destructive",
        });
        console.error(error.message);
        form.reset();
        setIsLoading(false);
        throw new Error(error.message);
      },
    }),
  );
  const form = useForm<FormValues>({
    resolver: standardSchemaResolver(formSchema),
    defaultValues: {
      shareMethod: "friends",
      permission: "view",
      linkExpiry: "7days",
      includePlayers: true,
      friendIds: [],
    },
  });

  const removeFriend = (id: number) => {
    setSelectedFriends((current) =>
      current.filter((friend) => friend.id !== id),
    );
    const currentFriendIds = form.getValues("friendIds") ?? [];
    form.setValue(
      "friendIds",
      currentFriendIds.filter((friendId) => friendId !== id),
    );
  };

  const onSubmit = (data: FormValues) => {
    setIsLoading(true);
    const numberOfDays = () => {
      if (data.linkExpiry === "1day") {
        return 1;
      }
      if (data.linkExpiry === "7days") {
        return 7;
      }
      if (data.linkExpiry === "30days") {
        return 30;
      }
      return 0;
    };
    if (data.shareMethod === "link") {
      shareMatchMutation.mutate({
        matchId: matchToShare.id,
        permission: data.permission,
        expiresAt:
          data.linkExpiry === "never"
            ? undefined
            : addDays(new Date(), numberOfDays()),
        type: "link",
        includePlayers: data.includePlayers,
      });
    } else {
      shareMatchMutation.mutate({
        matchId: matchToShare.id,
        permission: data.permission,
        friends:
          data.friendIds?.map((friendId) => ({
            id: friendId,
          })) ?? [],
        expiresAt:
          data.linkExpiry === "never"
            ? undefined
            : addDays(new Date(), numberOfDays()),
        type: "friends",
        includePlayers: data.includePlayers,
      });
    }
  };
  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <div className="relative flex h-10 w-10 shrink-0 overflow-hidden rounded shadow">
            {matchToShare.game.image?.url ? (
              <Image
                fill
                src={matchToShare.game.image.url}
                alt={`${matchToShare.game.name} game image`}
                className="aspect-square h-full w-full rounded-md object-cover"
              />
            ) : (
              <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
            )}
          </div>
          {matchToShare.name}
        </CardTitle>
        <CardDescription className="flex flex-wrap gap-x-4 gap-y-1">
          <FormattedDate date={matchToShare.date} Icon={Calendar} />
          <span className="flex items-center gap-1">
            <Clock className="h-4 w-4" />
            {formatDuration(matchToShare.duration)}
          </span>
          {matchToShare.location && (
            <span className="flex items-center gap-1">
              <Link className="h-4 w-4" />
              {matchToShare.location.name}
            </span>
          )}
        </CardDescription>
      </CardHeader>
      <Form {...form}>
        <form onSubmit={form.handleSubmit(onSubmit)}>
          <CardContent className="space-y-6">
            {/* Share Method Tabs */}
            <FormField
              control={form.control}
              name="shareMethod"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Share Method</FormLabel>
                  <FormControl>
                    <Tabs
                      value={field.value}
                      onValueChange={(value) =>
                        field.onChange(value as "friends" | "link")
                      }
                    >
                      <TabsList className="grid w-full grid-cols-2">
                        <TabsTrigger value="friends">With Friends</TabsTrigger>
                        <TabsTrigger value="link">Create Link</TabsTrigger>
                      </TabsList>

                      {/* Share with Friends Tab */}
                      <TabsContent value="friends" className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="linkExpiry"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel>Link Expiration</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "1day"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("1day")}
                                    className="w-full"
                                  >
                                    1 Day
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "7days"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("7days")}
                                    className="w-full"
                                  >
                                    7 Days
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "30days"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("30days")}
                                    className="w-full"
                                  >
                                    30 Days
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "never"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("never")}
                                    className="w-full"
                                  >
                                    Never
                                  </Button>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                        <FormField
                          control={form.control}
                          name="friendIds"
                          render={({ field }) => (
                            <FormItem className="flex flex-col">
                              <Label>Share with Friends</Label>

                              <Popover>
                                <PopoverTrigger asChild>
                                  <FormControl>
                                    <Button
                                      variant="outline"
                                      role="combobox"
                                      className={cn(
                                        "justify-between",
                                        !field.value && "text-muted-foreground",
                                      )}
                                    >
                                      {selectedFriends.length > 0
                                        ? `${selectedFriends.length} friend${selectedFriends.length > 1 ? "s" : ""} selected`
                                        : "Select friends..."}

                                      <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                                    </Button>
                                  </FormControl>
                                </PopoverTrigger>
                                <PopoverContent className="w-[300px] p-0">
                                  <Command>
                                    <CommandInput placeholder="Search friends..." />
                                    <CommandEmpty>
                                      No friends found.
                                    </CommandEmpty>
                                    <CommandList>
                                      <CommandGroup>
                                        {friends.map((friend) => (
                                          <CommandItem
                                            key={friend.id}
                                            value={friend.id.toString()}
                                            onSelect={() => {
                                              setSelectedFriends((current) => {
                                                if (
                                                  current.some(
                                                    (f) => f.id === friend.id,
                                                  )
                                                ) {
                                                  return current.filter(
                                                    (f) => f.id !== friend.id,
                                                  );
                                                }
                                                return [
                                                  ...current,
                                                  {
                                                    id: friend.id,
                                                    name: friend.name,
                                                    email: friend.email ?? "",
                                                  },
                                                ];
                                              });

                                              const currentIds =
                                                field.value ?? [];
                                              if (
                                                currentIds.includes(friend.id)
                                              ) {
                                                field.onChange(
                                                  currentIds.filter(
                                                    (id) => id !== friend.id,
                                                  ),
                                                );
                                              } else {
                                                field.onChange([
                                                  ...currentIds,
                                                  friend.id,
                                                ]);
                                              }
                                            }}
                                          >
                                            <div className="flex w-full items-center justify-between">
                                              <div>
                                                <p>{friend.name}</p>
                                                <p className="text-xs text-muted-foreground">
                                                  {friend.email}
                                                </p>
                                              </div>
                                              {selectedFriends.some(
                                                (f) => f.id === friend.id,
                                              ) && (
                                                <Check className="h-4 w-4" />
                                              )}
                                            </div>
                                          </CommandItem>
                                        ))}
                                      </CommandGroup>
                                    </CommandList>
                                  </Command>
                                </PopoverContent>
                              </Popover>
                              {selectedFriends.length > 0 && (
                                <div className="mt-2 flex flex-wrap gap-2">
                                  {selectedFriends.map((friend) => (
                                    <div
                                      key={friend.id}
                                      className="flex items-center gap-1 rounded-full bg-secondary px-3 py-1 text-sm"
                                    >
                                      {friend.name}
                                      <button
                                        type="button"
                                        onClick={() => removeFriend(friend.id)}
                                        className="ml-1 rounded-full p-1 hover:bg-secondary-foreground/20"
                                      >
                                        <X className="h-3 w-3" />
                                      </button>
                                    </div>
                                  ))}
                                </div>
                              )}
                              <FormMessage />
                            </FormItem>
                          )}
                        />
                      </TabsContent>

                      {/* Create Link Tab */}
                      <TabsContent value="link" className="space-y-4 pt-4">
                        <FormField
                          control={form.control}
                          name="linkExpiry"
                          render={({ field }) => (
                            <FormItem className="space-y-2">
                              <FormLabel>Link Expiration</FormLabel>
                              <FormControl>
                                <div className="grid grid-cols-2 gap-2 sm:grid-cols-4">
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "1day"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("1day")}
                                    className="w-full"
                                  >
                                    1 Day
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "7days"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("7days")}
                                    className="w-full"
                                  >
                                    7 Days
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "30days"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("30days")}
                                    className="w-full"
                                  >
                                    30 Days
                                  </Button>
                                  <Button
                                    type="button"
                                    variant={
                                      field.value === "never"
                                        ? "default"
                                        : "outline"
                                    }
                                    onClick={() => field.onChange("never")}
                                    className="w-full"
                                  >
                                    Never
                                  </Button>
                                </div>
                              </FormControl>
                            </FormItem>
                          )}
                        />
                      </TabsContent>
                    </Tabs>
                  </FormControl>
                </FormItem>
              )}
            />

            {/* Permission Settings */}
            <FormField
              control={form.control}
              name="permission"
              render={({ field }) => (
                <FormItem className="space-y-2">
                  <FormLabel>Permission Level</FormLabel>
                  <FormControl>
                    <RadioGroup
                      value={field.value}
                      onValueChange={field.onChange}
                      className="flex flex-col space-y-1"
                    >
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="view" id="view" />
                        <Label htmlFor="view" className="font-normal">
                          View Only - Recipients can only view the match details
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="edit" id="edit" />
                        <Label htmlFor="edit" className="font-normal">
                          Edit - Recipients can edit the match details
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <Separator />

            <FormField
              control={form.control}
              name="includePlayers"
              render={({ field }) => (
                <FormItem className="flex items-center space-x-2">
                  <FormControl>
                    <Switch
                      checked={field.value}
                      onCheckedChange={field.onChange}
                    />
                  </FormControl>
                  <div className="space-y-0.5">
                    <FormLabel className="!mt-0">
                      Include player information
                    </FormLabel>
                    <FormDescription>
                      When enabled, player names, scores, and other details will
                      be shared
                    </FormDescription>
                  </div>
                </FormItem>
              )}
            />
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>

            <Button type="submit" disabled={isLoading}>
              {isLoading ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Match
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
