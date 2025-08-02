"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
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
  Loader2,
  MapPin,
  Share2,
  Trophy,
  User,
  X,
} from "lucide-react";
import { z } from "zod/v4";

import { formatDuration } from "@board-games/shared";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@board-games/ui/accordion";
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
  useForm,
} from "@board-games/ui/form";
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
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

import { FormattedDate } from "~/components/formatted-date";
import { GameImage } from "~/components/game-image";
import { useTRPC } from "~/trpc/react";

const formSchema = z
  .object({
    shareMethod: z.enum(["friends", "link"]),
    friendIds: z.array(z.string()).optional(),
    permission: z.enum(["view", "edit"]),
    linkExpiry: z.enum(["1day", "7days", "30days", "never"]).default("7days"),
    matchIds: z.array(
      z.object({
        id: z.number(),
        includePlayers: z.boolean(),
        permission: z.enum(["view", "edit"]),
      }),
    ),
  })
  .check((ctx) => {
    if (
      ctx.value.shareMethod === "friends" &&
      (ctx.value.friendIds === undefined || ctx.value.friendIds.length < 1)
    ) {
      ctx.issues.push({
        code: "custom",
        input: ctx.value,
        message:
          "Must have at least one friend to share to if sharing with friends",
        path: ["friendIds"],
      });
    }
  });

type FormValues = z.infer<typeof formSchema>;

export default function SharePlayerPage({ playerId }: { playerId: number }) {
  const router = useRouter();
  const [isLoading, setIsLoading] = useState(false);
  const [selectedFriends, setSelectedFriends] = useState<
    { id: string; name: string; email: string }[]
  >([]);

  const trpc = useTRPC();
  const queryClient = useQueryClient();
  const { data: playerToShare } = useSuspenseQuery(
    trpc.player.getPlayerToShare.queryOptions({ id: playerId }),
  );
  const { data: friends } = useSuspenseQuery(
    trpc.friend.getFriends.queryOptions(),
  );

  const sharePlayerMutation = useMutation(
    trpc.sharing.requestSharePlayer.mutationOptions({
      onSuccess: async (response) => {
        await queryClient.invalidateQueries(
          trpc.sharing.getIncomingShareRequests.queryOptions(),
        );
        await queryClient.invalidateQueries(
          trpc.sharing.getOutgoingShareRequests.queryOptions(),
        );
        if (response.success) {
          if (response.shareableUrl) {
            toast.success("Success", {
              description: `Share link generated! ${response.shareableUrl}`,
            });
          } else {
            toast.success("Success", {
              description: response.message,
            });
          }
          form.reset();
          setIsLoading(false);
        } else {
          toast.error("Error", {
            description: response.message,
          });
        }
        router.push(`/dashboard/`);
      },
      onError: (error) => {
        toast.error("Error", {
          description: `${error.message}`,
        });
        console.error(error.message);
        form.reset();
        setIsLoading(false);
      },
    }),
  );

  const form = useForm({
    schema: formSchema,
    defaultValues: {
      shareMethod: "friends",
      permission: "view",
      linkExpiry: "7days",
      matchIds: [],
      friendIds: [],
    },
  });

  const removeFriend = (id: string) => {
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
      sharePlayerMutation.mutate({
        playerId: playerToShare.id,
        permission: data.permission,
        expiresAt:
          data.linkExpiry === "never"
            ? undefined
            : addDays(new Date(), numberOfDays()),
        type: "link",
        sharedMatches: data.matchIds.map((m) => ({
          matchId: m.id,
          permission: m.permission,
          includePlayers: m.includePlayers,
        })),
      });
    } else {
      sharePlayerMutation.mutate({
        playerId: playerToShare.id,
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
        sharedMatches: data.matchIds.map((m) => ({
          matchId: m.id,
          permission: m.permission,
          includePlayers: m.includePlayers,
        })),
      });
    }
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle>Sharing {playerToShare.name}</CardTitle>
        <CardDescription>
          Select how you want to share this player.
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
                          View Only - Recipients can only view the player and
                          its details
                        </Label>
                      </div>
                      <div className="flex items-center space-x-2">
                        <RadioGroupItem value="edit" id="edit" />
                        <Label htmlFor="edit" className="font-normal">
                          Edit - Recipients can edit the player details and add
                          matches
                        </Label>
                      </div>
                    </RadioGroup>
                  </FormControl>
                  <FormMessage />
                </FormItem>
              )}
            />

            <div className="space-y-4">
              <Separator />

              <div className="space-y-4 pt-4">
                <div className="flex items-center justify-between">
                  <p className="text-sm text-muted-foreground">
                    Select matches to share along with this player
                  </p>
                  <div className="flex items-center space-x-2">
                    <Checkbox
                      id="select-all-matches"
                      checked={
                        playerToShare.matches.length > 0 &&
                        form.watch("matchIds").length ===
                          playerToShare.matches.length
                      }
                      onCheckedChange={(checked) => {
                        if (checked) {
                          form.setValue(
                            "matchIds",
                            playerToShare.matches.map((match) => ({
                              id: match.id,
                              permission: form.getValues("permission"),
                              includePlayers: true,
                            })),
                          );
                        } else {
                          form.setValue("matchIds", []);
                        }
                      }}
                    />
                    <Label
                      htmlFor="select-all-matches"
                      className="text-sm font-medium"
                    >
                      Select All
                    </Label>
                  </div>
                </div>

                <FormField
                  control={form.control}
                  name="matchIds"
                  render={({ field }) => (
                    <FormItem>
                      <FormControl>
                        <ScrollArea className="h-[500px] rounded-md border p-3">
                          <div className="space-y-4">
                            {playerToShare.matches.map((match) => (
                              <div
                                key={match.id}
                                className="rounded-md border p-2"
                              >
                                <div className="flex items-center justify-between space-x-2">
                                  <div className="flex items-center space-x-2">
                                    <Checkbox
                                      id={`match-${match.id}`}
                                      checked={
                                        field.value.find(
                                          (m) => m.id === match.id,
                                        ) !== undefined
                                      }
                                      onCheckedChange={(checked) => {
                                        if (checked) {
                                          field.onChange([
                                            ...field.value,
                                            {
                                              id: match.id,
                                              permission:
                                                form.getValues("permission"),
                                              includePlayers: true,
                                            },
                                          ]);
                                        } else {
                                          field.onChange(
                                            field.value.filter(
                                              (m) => m.id !== match.id,
                                            ),
                                          );
                                        }
                                      }}
                                    />
                                    <div className="grid gap-1.5">
                                      <Label
                                        htmlFor={`match-${match.id}`}
                                        className="font-medium"
                                      >
                                        {match.name}
                                      </Label>
                                      <div className="mt-1 flex flex-wrap gap-x-4 gap-y-1 text-sm text-muted-foreground">
                                        <FormattedDate
                                          date={match.date}
                                          className="flex items-center gap-1"
                                          Icon={Calendar}
                                          iconClassName="h-3 w-3"
                                        />
                                        <span className="flex items-center gap-1">
                                          <Clock className="h-3 w-3" />
                                          {formatDuration(match.duration)}
                                        </span>
                                        {match.locationName && (
                                          <span className="flex items-center gap-1">
                                            <MapPin className="h-3 w-3" />
                                            {match.locationName}
                                          </span>
                                        )}
                                      </div>

                                      <div className="mt-1 flex items-center gap-2">
                                        <GameImage
                                          image={match.gameImage}
                                          alt={`${match.gameName} game image`}
                                          containerClassName="h-5 w-5 rounded shadow"
                                        />
                                        <span className="text-xs">
                                          {match.gameName}
                                        </span>
                                        {match.gameYearPublished && (
                                          <span className="text-xs">
                                            ({match.gameYearPublished})
                                          </span>
                                        )}
                                      </div>
                                    </div>
                                  </div>
                                  {field.value.find(
                                    (m) => m.id === match.id,
                                  ) !== undefined && (
                                    <div className="flex items-center gap-3">
                                      <FormField
                                        control={form.control}
                                        name={`matchIds.${field.value.findIndex((m) => m.id === match.id)}.includePlayers`}
                                        render={({ field: playersField }) => (
                                          <div className="flex items-center gap-2">
                                            <Checkbox
                                              id={`include-players-${match.id}`}
                                              checked={playersField.value}
                                              onCheckedChange={
                                                playersField.onChange
                                              }
                                            />
                                            <Label
                                              htmlFor={`include-players-${match.id}`}
                                              className="whitespace-nowrap text-xs"
                                            >
                                              Include Players
                                            </Label>
                                          </div>
                                        )}
                                      />
                                      <FormField
                                        control={form.control}
                                        name={`matchIds.${field.value.findIndex((m) => m.id === match.id)}.permission`}
                                        render={({
                                          field: permissionField,
                                        }) => (
                                          <Select
                                            value={permissionField.value}
                                            onValueChange={(value) => {
                                              const permission =
                                                value === "view"
                                                  ? "view"
                                                  : "edit";
                                              permissionField.onChange(
                                                permission,
                                              );
                                            }}
                                          >
                                            <SelectTrigger className="w-24">
                                              <SelectValue />
                                            </SelectTrigger>
                                            <SelectContent>
                                              <SelectItem value="view">
                                                View
                                              </SelectItem>
                                              <SelectItem value="edit">
                                                Edit
                                              </SelectItem>
                                            </SelectContent>
                                          </Select>
                                        )}
                                      />
                                    </div>
                                  )}
                                </div>

                                <Accordion type="single" collapsible>
                                  <AccordionItem
                                    value="item-1"
                                    className="border-none"
                                  >
                                    <AccordionTrigger>Players</AccordionTrigger>
                                    <AccordionContent>
                                      <div className="mt-2 grid grid-cols-1 gap-2 sm:grid-cols-2">
                                        {match.players.map((p) => {
                                          const teamIndex =
                                            match.teams.findIndex(
                                              (t) => t.id === p.team?.id,
                                            );
                                          return (
                                            <div
                                              key={p.id}
                                              className="flex items-center gap-1 rounded bg-muted/50 p-1.5 text-xs"
                                            >
                                              <User className="h-3 w-3 text-muted-foreground" />
                                              <span>{p.name}</span>
                                              {p.team !== null && (
                                                <span
                                                  className={cn(
                                                    "text-muted-foreground",
                                                    teamIndex === 0 &&
                                                      "text-blue-500 dark:text-blue-400",
                                                    teamIndex === 1 &&
                                                      "text-green-500 dark:text-green-400",
                                                    teamIndex === 2 &&
                                                      "text-yellow-500 dark:text-yellow-400",
                                                    !(
                                                      teamIndex < 3 &&
                                                      teamIndex > -1
                                                    ) &&
                                                      "text-red-500 dark:text-red-400",
                                                  )}
                                                >
                                                  {`(${p.team.name})`}
                                                </span>
                                              )}
                                              {p.score !== null && (
                                                <span className="ml-auto text-muted-foreground">
                                                  {p.score} pts
                                                </span>
                                              )}
                                              {p.isWinner && (
                                                <Trophy className="ml-1 h-3 w-3 text-amber-500" />
                                              )}
                                            </div>
                                          );
                                        })}
                                      </div>
                                    </AccordionContent>
                                  </AccordionItem>
                                </Accordion>
                              </div>
                            ))}
                          </div>
                        </ScrollArea>
                      </FormControl>
                    </FormItem>
                  )}
                />
              </div>
            </div>
          </CardContent>
          <CardFooter className="flex justify-between">
            <Button
              type="button"
              variant="outline"
              onClick={() => router.back()}
            >
              Cancel
            </Button>

            <Button
              type="submit"
              disabled={isLoading || sharePlayerMutation.isPending}
            >
              {isLoading || sharePlayerMutation.isPending ? (
                <>
                  <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                  Sharing...
                </>
              ) : (
                <>
                  <Share2 className="mr-2 h-4 w-4" />
                  Share Player
                </>
              )}
            </Button>
          </CardFooter>
        </form>
      </Form>
    </Card>
  );
}
