"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import { useForm } from "@tanstack/react-form";
import {
  ChevronLeft,
  Plus,
  Search,
  Shield,
  Trash2,
  User,
  Users,
  Users2,
  X,
} from "lucide-react";
import z from "zod/v4";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Collapsible,
  CollapsibleContent,
  CollapsibleTrigger,
} from "@board-games/ui/collapsible";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Field,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@board-games/ui/input-group";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemDescription,
  ItemFooter,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { toast } from "@board-games/ui/toast";
import { cn } from "@board-games/ui/utils";

export interface MatchConfig {
  name: string;
  date: string;
  time: string;
  location?: string;
  scoresheetId: string;
}
interface MatchCreationFlowProps {
  playerCount: number;
  onCancel: () => void;
  setMode: Dispatch<SetStateAction<"select" | "quick" | "custom" | "match">>;
  setShowDialog: Dispatch<SetStateAction<boolean>>;
}
export function PlayerSelector({
  playerCount,
  setMode,
}: MatchCreationFlowProps) {
  return (
    <DialogContent className="max-w-4xl">
      <DialogHeader>
        <DialogTitle className="text-center">Select Players</DialogTitle>
        <div className="space-y-2 text-center">
          <p className="text-muted-foreground">
            Choose how you want to set up your match
          </p>
          <div className="flex items-center justify-center gap-2 pt-2">
            <Badge variant="secondary" className="text-sm">
              <Users className="mr-1 h-3 w-3" />
              {playerCount} selected
            </Badge>
          </div>
        </div>
      </DialogHeader>
      <div className="grid gap-4 md:grid-cols-2">
        {/* Quick Match */}
        <button
          type="button"
          onClick={() => {
            setMode("quick");
          }}
          className="group border-border hover:border-primary from-background to-accent/20 relative overflow-hidden rounded-xl border-2 bg-linear-to-br p-6 text-left transition-all hover:shadow-lg"
        >
          <div className="relative z-10">
            <h3 className="mb-2 text-xl font-bold">Quick Match</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Select players and start immediately
            </p>
            <ul className="text-muted-foreground space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Fast setup
              </li>
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                No teams or roles
              </li>
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Perfect for casual games
              </li>
            </ul>
          </div>
        </button>

        {/* Custom Match */}
        <button
          type="button"
          onClick={() => {
            setMode("custom");
          }}
          className="group border-border hover:border-primary from-background to-accent/20 relative overflow-hidden rounded-xl border-2 bg-linear-to-br p-6 text-left transition-all hover:shadow-lg"
        >
          <div className="relative z-10">
            <h3 className="mb-2 text-xl font-bold">Custom Match</h3>
            <p className="text-muted-foreground mb-3 text-sm">
              Full control over teams and roles
            </p>
            <ul className="text-muted-foreground space-y-1.5 text-xs">
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Create teams
              </li>
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Assign roles
              </li>
              <li className="flex items-center gap-2">
                <div className="bg-primary h-1 w-1 rounded-full" />
                Advanced configuration
              </li>
            </ul>
          </div>
        </button>
      </div>
      <DialogFooter>
        <Button
          type="button"
          variant="secondary"
          onClick={() => {
            setMode("match");
          }}
        >
          Back to Match Config
        </Button>
      </DialogFooter>
    </DialogContent>
  );
}
export function QuickMatchSelection({
  onCancel,
  setMode,
}: MatchCreationFlowProps) {
  const playerSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      name: z.string(),
      id: z.number(),
    }),
    z.object({
      type: z.literal("shared"),
      shareType: z.literal("link").or(z.literal("shared")),
      name: z.string(),
      sharedId: z.number(),
      linkedPlayerId: z.number().nullable(),
    }),
  ]);
  const playersSchema = z.object({
    players: z.array(playerSchema).min(1, {
      message: "You must select at least one player",
    }),
    searchQuery: z.string(),
  });

  const players: (z.infer<typeof playerSchema> & { matches: number })[] = [
    {
      id: 1,
      type: "original",
      name: "Player 1",
      matches: 0,
    },
    {
      id: 2,
      type: "original",
      name: "Player 2",
      matches: 0,
    },
    {
      id: 3,
      type: "original",
      name: "Player 3",
      matches: 0,
    },
    {
      sharedId: 1,
      type: "shared",
      name: "Player 4",
      shareType: "shared",
      linkedPlayerId: null,
      matches: 0,
    },
    {
      sharedId: 2,
      type: "shared",
      name: "Player 4",
      shareType: "link",
      linkedPlayerId: 8,
      matches: 0,
    },
  ];

  const form = useForm({
    formId: "quick-match-selection",
    defaultValues: {
      players: [] as z.infer<typeof playersSchema>["players"],
      searchQuery: "",
    },
    validators: {
      onSubmit: playersSchema,
    },
    onSubmit: ({ value }) => {
      toast("You submitted the following values:", {
        description: (
          <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
        position: "bottom-right",
        classNames: {
          content: "flex flex-col gap-2",
        },
        style: {
          "--border-radius": "calc(var(--radius)  + 4px)",
        } as React.CSSProperties,
      });
      onCancel();
    },
  });
  const togglePlayer = (player: z.infer<typeof playerSchema>) => {
    const currentPlayers = form.state.values.players;
    const isSelected = currentPlayers.some(
      (p) =>
        (p.type === "original" &&
          player.type === "original" &&
          p.id === player.id) ||
        (p.type === "shared" &&
          player.type === "shared" &&
          p.sharedId === player.sharedId),
    );
    if (isSelected) {
      form.setFieldValue(
        "players",
        currentPlayers.filter(
          (p) =>
            !(
              p.type === "original" &&
              player.type === "original" &&
              p.id === player.id
            ) &&
            !(
              p.type === "shared" &&
              player.type === "shared" &&
              p.sharedId === player.sharedId
            ),
        ),
      );
    } else {
      form.setFieldValue("players", [...currentPlayers, { ...player }]);
    }
  };
  return (
    <DialogContent className="max-w-4xl">
      <form
        className="w-full space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe
          selector={(state) => ({
            selectedPlayers: state.values.players,
            searchQuery: state.values.searchQuery,
          })}
        >
          {({ selectedPlayers, searchQuery }) => {
            return (
              <>
                <DialogHeader className="mt-4 flex flex-row items-center justify-between">
                  <div>
                    <DialogTitle>Temp Match Name</DialogTitle>
                    <DialogDescription>10/23/2023</DialogDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded px-4 py-2 text-base"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {selectedPlayers.length} selected
                  </Badge>
                </DialogHeader>
                <FieldGroup>
                  <form.Field name="searchQuery">
                    {(field) => (
                      <div className="relative">
                        <Search className="text-muted-foreground absolute top-1/2 left-3 h-4 w-4 -translate-y-1/2" />
                        <Input
                          placeholder="Search players..."
                          value={field.state.value}
                          onChange={(e) => field.handleChange(e.target.value)}
                          className="pl-10"
                        />
                      </div>
                    )}
                  </form.Field>
                  <form.Field
                    name="players"
                    children={(field) => {
                      const isInvalid =
                        field.state.meta.isTouched && !field.state.meta.isValid;
                      const filteredPlayers = players.filter((player) =>
                        player.name
                          .toLowerCase()
                          .includes(searchQuery.toLowerCase()),
                      );
                      return (
                        <Field data-invalid={isInvalid}>
                          <FieldLabel htmlFor={field.name} className="sr-only">
                            Players
                          </FieldLabel>
                          <ScrollArea>
                            <ItemGroup className="max-h-[500px] gap-4">
                              {filteredPlayers.map((player) => {
                                const selected = selectedPlayers.find(
                                  (p) =>
                                    (p.type === "original" &&
                                      player.type === "original" &&
                                      p.id === player.id) ||
                                    (p.type === "shared" &&
                                      player.type === "shared" &&
                                      p.sharedId === player.sharedId),
                                );
                                return (
                                  <Item
                                    key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                    variant="outline"
                                    asChild
                                    role="listitem"
                                  >
                                    <button
                                      type="button"
                                      onClick={() => togglePlayer(player)}
                                      className={cn(
                                        selected &&
                                          "border-primary bg-primary/5",
                                      )}
                                    >
                                      <ItemMedia>
                                        <Avatar>
                                          <AvatarImage
                                            src={
                                              "/generic-placeholder-icon.png?height=48&width=48"
                                            }
                                          />
                                          <AvatarFallback>
                                            {player.name.charAt(0)}
                                          </AvatarFallback>
                                        </Avatar>
                                      </ItemMedia>
                                      <ItemContent>
                                        <ItemTitle>{player.name}</ItemTitle>
                                        <ItemDescription className="text-left">
                                          {`${player.matches} matches played`}
                                        </ItemDescription>
                                      </ItemContent>
                                      <div
                                        className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                                          selected
                                            ? "border-primary bg-primary"
                                            : "border-muted-foreground"
                                        }`}
                                      >
                                        {selected && (
                                          <svg
                                            className="text-primary-foreground h-4 w-4"
                                            fill="none"
                                            viewBox="0 0 24 24"
                                            stroke="currentColor"
                                          >
                                            <path
                                              strokeLinecap="round"
                                              strokeLinejoin="round"
                                              strokeWidth={3}
                                              d="M5 13l4 4L19 7"
                                            />
                                          </svg>
                                        )}
                                      </div>
                                    </button>
                                  </Item>
                                );
                              })}
                            </ItemGroup>
                          </ScrollArea>
                          {isInvalid && (
                            <FieldError errors={field.state.meta.errors} />
                          )}
                          {selectedPlayers.length < 1 && (
                            <div className="text-muted-foreground bg-muted/50 rounded-lg py-4 text-center text-sm">
                              Select at least 1 players to start the match
                            </div>
                          )}
                        </Field>
                      );
                    }}
                  />
                </FieldGroup>
                <DialogFooter className="sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMode("select");
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={selectedPlayers.length < 1}>
                      Start Match
                    </Button>
                  </div>
                </DialogFooter>
              </>
            );
          }}
        </form.Subscribe>
      </form>
    </DialogContent>
  );
}
// Mock roles data
const AVAILABLE_ROLES = [
  {
    id: 1,
    type: "original" as const,
    name: "Artist",
    description:
      "Once per game, during the day, privately ask the Storyteller any yes/no question.",
  },
  {
    id: 2,
    type: "original" as const,
    name: "Assassin",
    description:
      "Once per game, at night*, choose a player: they die, even if for some reason they could not.",
  },
  {
    id: 3,
    type: "original" as const,
    name: "Barber",
    description:
      "If you died today or tonight, the Demon may choose 2 players (not another Demon) to swap characters.",
  },
  {
    id: 4,
    type: "original" as const,
    name: "Baron",
    description: "There are extra Outsiders in play. [+2 Outsiders]",
  },
  {
    id: 5,
    type: "original" as const,
    name: "Boomdandy",
    description:
      "If you are executed, all but 3 players die. After a 10 to 1 countdown, the player with the most players pointing at them, dies.",
  },
  {
    id: 6,
    type: "original" as const,
    name: "Drunk",
    description:
      "You do not know you are the Drunk. You think you are a Townsfolk character, but you are not.",
  },
  {
    id: 7,
    type: "original" as const,
    name: "Fortune Teller",
    description:
      "Each night, choose 2 players: you learn if either is a Demon. There is a Good player that registers as a Demon to you.",
  },
  {
    sharedId: 1,
    type: "shared" as const,
    shareType: "shared" as const,
    name: "Role 7",
    description: "Role 7 description",
  },
];
export function CustomMatchSelection({
  onCancel,
  setMode,
}: MatchCreationFlowProps) {
  const [showRoleDialog, setShowRoleDialog] = useState(false);
  const [roleSearchQuery, setRoleSearchQuery] = useState("");
  const [roleTarget, setRoleTarget] = useState<
    | {
        type: "player";
        id: number;
        shareType: "shared" | "original";
        name: string;
        index: number;
        teamId?: number;
      }
    | {
        type: "team";
        id: number;
        name: string;
        index: number;
      }
    | null
  >(null);
  const roleSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      name: z.string(),
      id: z.number(),
    }),
    z.object({
      type: z.literal("shared"),
      shareType: z.literal("link").or(z.literal("shared")),
      name: z.string(),
      sharedId: z.number(),
    }),
  ]);
  const teamsSchema = z.object({
    id: z.number(),
    name: z.string(),
    roles: z.array(roleSchema),
  });
  const playerSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      name: z.string(),
      id: z.number(),
      roles: z.array(roleSchema),
      teamId: z.number().optional(),
    }),
    z.object({
      type: z.literal("shared"),
      shareType: z.literal("link").or(z.literal("shared")),
      name: z.string(),
      sharedId: z.number(),
      linkedPlayerId: z.number().nullable(),
      roles: z.array(roleSchema),
      teamId: z.number().optional(),
    }),
  ]);
  const playersSchema = z.object({
    players: z.array(playerSchema).min(1, {
      message: "You must select at least one player",
    }),
    teams: z.array(teamsSchema),
    searchQuery: z.string(),
    activeTab: z.literal("players").or(z.literal("teams")),
  });

  const players: (z.infer<typeof playerSchema> & { matches: number })[] = [
    {
      id: 1,
      type: "original",
      name: "Player 1",
      matches: 0,
      roles: [],
    },
    {
      id: 2,
      type: "original",
      name: "Player 2",
      matches: 0,
      roles: [],
    },
    {
      id: 3,
      type: "original",
      name: "Player 3",
      matches: 0,
      roles: [],
    },
    {
      sharedId: 1,
      type: "shared",
      name: "Player 4",
      shareType: "shared",
      linkedPlayerId: null,
      matches: 0,
      roles: [],
    },
    {
      sharedId: 2,
      type: "shared",
      name: "Player 4",
      shareType: "link",
      linkedPlayerId: 8,
      matches: 0,
      roles: [],
    },
  ];

  const form = useForm({
    formId: "custom-match-selection",
    defaultValues: {
      teams: [] as z.infer<typeof teamsSchema>[],
      players: [] as z.infer<typeof playersSchema>["players"],
      searchQuery: "",
      activeTab: "players",
    },
    validators: {
      onSubmit: playersSchema,
    },
    onSubmit: ({ value }) => {
      toast("You submitted the following values:", {
        description: (
          <pre className="bg-code text-code-foreground mt-2 w-[320px] overflow-x-auto rounded-md p-4">
            <code>{JSON.stringify(value, null, 2)}</code>
          </pre>
        ),
        position: "bottom-right",
        classNames: {
          content: "flex flex-col gap-2",
        },
        style: {
          "--border-radius": "calc(var(--radius)  + 4px)",
        } as React.CSSProperties,
      });
      onCancel();
    },
  });
  const togglePlayer = (player: z.infer<typeof playerSchema>) => {
    const currentPlayers = form.state.values.players;
    const isSelected = currentPlayers.some(
      (p) =>
        (p.type === "original" &&
          player.type === "original" &&
          p.id === player.id) ||
        (p.type === "shared" &&
          player.type === "shared" &&
          p.sharedId === player.sharedId),
    );
    if (isSelected) {
      form.setFieldValue(
        "players",
        currentPlayers.filter(
          (p) =>
            !(
              p.type === "original" &&
              player.type === "original" &&
              p.id === player.id
            ) &&
            !(
              p.type === "shared" &&
              player.type === "shared" &&
              p.sharedId === player.sharedId
            ),
        ),
      );
    } else {
      form.setFieldValue("players", [...currentPlayers, { ...player }]);
    }
  };
  const assignPlayerToTeam = (
    teamId: number | undefined,
    player: z.infer<typeof playerSchema>,
  ) => {
    const currentPlayers = form.state.values.players;
    const tempPlayers = currentPlayers.map((p) => {
      if (
        (p.type === "original" &&
          player.type === "original" &&
          p.id === player.id) ||
        (p.type === "shared" &&
          player.type === "shared" &&
          p.sharedId === player.sharedId)
      ) {
        return { ...p, teamId };
      }
      return p;
    });
    form.setFieldValue("players", tempPlayers);
  };
  const openRoleDialog = (
    input:
      | { type: "team"; id: number; index: number }
      | {
          type: "player";
          id: number;
          shareType: "original" | "shared";
          index: number;
        },
  ) => {
    if (input.type === "player") {
      const currentPlayers = form.state.values.players;
      if (input.shareType === "original") {
        const foundPlayer = currentPlayers.find(
          (p) => p.type === "original" && p.id === input.id,
        );
        if (foundPlayer) {
          setRoleTarget({
            index: input.index,
            type: input.type,
            id: input.id,
            shareType: input.shareType,
            name: foundPlayer.name,
            teamId: foundPlayer.teamId,
          });
          setShowRoleDialog(true);
          setRoleSearchQuery("");
        } else {
          toast.error("Opening role dialog for player failed");
          throw new Error("Player not found");
        }
      } else {
        const foundPlayer = currentPlayers.find(
          (p) => p.type === "shared" && p.sharedId === input.id,
        );
        if (foundPlayer) {
          setRoleTarget({
            index: input.index,
            type: input.type,
            id: input.id,
            shareType: input.shareType,
            name: foundPlayer.name,
            teamId: foundPlayer.teamId,
          });
          setShowRoleDialog(true);
          setRoleSearchQuery("");
        } else {
          toast.error("Opening role dialog for player failed");
          throw new Error("Player not found");
        }
      }
    } else {
      const currentTeams = form.state.values.teams;
      const foundTeam = currentTeams.find((t) => t.id === input.id);
      if (foundTeam) {
        setRoleTarget({
          index: input.index,
          type: input.type,
          id: input.id,
          name: foundTeam.name,
        });
        setShowRoleDialog(true);
        setRoleSearchQuery("");
      } else {
        toast.error("Opening role dialog for team failed");
        throw new Error("Team not found");
      }
    }
  };
  return (
    <DialogContent className="max-w-4xl">
      <form
        className="w-full space-y-6"
        onSubmit={(event) => {
          event.preventDefault();
          void form.handleSubmit();
        }}
      >
        <form.Subscribe
          selector={(state) => ({
            selectedPlayers: state.values.players,
            teams: state.values.teams,
            searchQuery: state.values.searchQuery,
          })}
        >
          {({ selectedPlayers, searchQuery, teams }) => {
            const filteredPlayers = players.filter((player) =>
              player.name.toLowerCase().includes(searchQuery.toLowerCase()),
            );
            const individualPlayers = selectedPlayers.filter((p) => !p.teamId);
            return (
              <>
                <DialogHeader className="mt-4 flex flex-row items-center justify-between">
                  <div>
                    <DialogTitle>Temp Match Name</DialogTitle>
                    <DialogDescription>10/23/2023</DialogDescription>
                  </div>
                  <Badge
                    variant="secondary"
                    className="rounded px-4 py-2 text-base"
                  >
                    <Users className="mr-2 h-4 w-4" />
                    {selectedPlayers.length} selected
                  </Badge>
                </DialogHeader>
                <FieldGroup>
                  <form.Field name="activeTab">
                    {(field) => (
                      <Tabs
                        value={field.state.value}
                        onValueChange={(value) => field.handleChange(value)}
                        className="w-full"
                      >
                        <TabsList className="grid w-full grid-cols-2">
                          <TabsTrigger value="players">
                            Select Players
                          </TabsTrigger>
                          <TabsTrigger value="teams">Teams & Roles</TabsTrigger>
                        </TabsList>
                        {/* Player Selection Tab */}
                        <TabsContent value="players" className="mt-6 space-y-4">
                          <form.Field name="searchQuery">
                            {(field) => (
                              <InputGroup>
                                <InputGroupInput
                                  placeholder="Search players..."
                                  value={field.state.value}
                                  onChange={(e) =>
                                    field.handleChange(e.target.value)
                                  }
                                />
                                <InputGroupAddon>
                                  <Search />
                                </InputGroupAddon>
                                {searchQuery !== "" && (
                                  <InputGroupAddon align="inline-end">
                                    {filteredPlayers.length} results
                                  </InputGroupAddon>
                                )}
                              </InputGroup>
                            )}
                          </form.Field>
                          <form.Field
                            name="players"
                            children={(field) => {
                              const isInvalid =
                                field.state.meta.isTouched &&
                                !field.state.meta.isValid;

                              return (
                                <Field data-invalid={isInvalid}>
                                  <FieldLabel
                                    htmlFor={field.name}
                                    className="sr-only"
                                  >
                                    Players
                                  </FieldLabel>
                                  <ScrollArea>
                                    <ItemGroup className="max-h-[500px] gap-4">
                                      {filteredPlayers.map((player) => {
                                        const selected = selectedPlayers.find(
                                          (p) =>
                                            (p.type === "original" &&
                                              player.type === "original" &&
                                              p.id === player.id) ||
                                            (p.type === "shared" &&
                                              player.type === "shared" &&
                                              p.sharedId === player.sharedId),
                                        );
                                        return (
                                          <Item
                                            key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                            variant="outline"
                                            asChild
                                            role="listitem"
                                          >
                                            <button
                                              type="button"
                                              onClick={() =>
                                                togglePlayer(player)
                                              }
                                              className={cn(
                                                selected &&
                                                  "border-primary bg-primary/5",
                                              )}
                                            >
                                              <ItemMedia>
                                                <Avatar>
                                                  <AvatarImage
                                                    src={
                                                      "/generic-placeholder-icon.png?height=48&width=48"
                                                    }
                                                  />
                                                  <AvatarFallback>
                                                    {player.name.charAt(0)}
                                                  </AvatarFallback>
                                                </Avatar>
                                              </ItemMedia>
                                              <ItemContent>
                                                <ItemTitle>
                                                  {player.name}
                                                </ItemTitle>
                                                <ItemDescription className="text-left">
                                                  {`${player.matches} matches played`}
                                                </ItemDescription>
                                              </ItemContent>
                                              <div
                                                className={`flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors ${
                                                  selected
                                                    ? "border-primary bg-primary"
                                                    : "border-muted-foreground"
                                                }`}
                                              >
                                                {selected && (
                                                  <svg
                                                    className="text-primary-foreground h-4 w-4"
                                                    fill="none"
                                                    viewBox="0 0 24 24"
                                                    stroke="currentColor"
                                                  >
                                                    <path
                                                      strokeLinecap="round"
                                                      strokeLinejoin="round"
                                                      strokeWidth={3}
                                                      d="M5 13l4 4L19 7"
                                                    />
                                                  </svg>
                                                )}
                                              </div>
                                            </button>
                                          </Item>
                                        );
                                      })}
                                    </ItemGroup>
                                  </ScrollArea>

                                  {isInvalid && (
                                    <FieldError
                                      errors={field.state.meta.errors}
                                    />
                                  )}
                                  {selectedPlayers.length < 1 && (
                                    <div className="text-muted-foreground bg-muted/50 rounded-lg py-4 text-center text-sm">
                                      Select at least 1 players to start the
                                      match
                                    </div>
                                  )}
                                </Field>
                              );
                            }}
                          />
                          {/* Continue Button */}
                          {selectedPlayers.length > 0 && (
                            <div className="flex justify-end pt-4">
                              <Button
                                type="button"
                                onClick={() => field.handleChange("teams")}
                              >
                                Continue to Teams & Roles
                                <ChevronLeft className="ml-2 h-4 w-4 rotate-180" />
                              </Button>
                            </div>
                          )}
                        </TabsContent>
                        {/* Teams & Roles Tab */}
                        <TabsContent value="teams" className="mt-6">
                          <form.Field name="teams" mode="array">
                            {(field) => {
                              const minTeamId =
                                teams.length > 0
                                  ? Math.min(...teams.map((team) => team.id))
                                  : 0;

                              return (
                                <div className="space-y-4">
                                  <div className="flex items-center justify-between">
                                    <p className="text-muted-foreground text-sm">
                                      Organize players into teams and assign
                                      roles (optional)
                                    </p>
                                    <Button
                                      type="button"
                                      size="sm"
                                      variant="outline"
                                      onClick={() =>
                                        field.pushValue({
                                          id: minTeamId - 1,
                                          name: `Team ${teams.length + 1}`,
                                          roles: [],
                                        })
                                      }
                                    >
                                      <Plus className="mr-1 h-4 w-4" />
                                      Add Team
                                    </Button>
                                  </div>
                                  <ScrollArea>
                                    <ItemGroup className="max-h-[500px] gap-4">
                                      {teams.map((team, i) => {
                                        const teamPlayers =
                                          selectedPlayers.filter(
                                            (p) => p.teamId === team.id,
                                          );
                                        return (
                                          <Item key={i} variant="outline">
                                            <ItemMedia variant="icon">
                                              <Users2 />
                                            </ItemMedia>
                                            <ItemContent>
                                              <form.Field
                                                key={i}
                                                name={`teams[${i}].name`}
                                              >
                                                {(subField) => {
                                                  return (
                                                    <Input
                                                      value={team.name}
                                                      onChange={(e) =>
                                                        subField.handleChange(
                                                          e.target.value,
                                                        )
                                                      }
                                                    />
                                                  );
                                                }}
                                              </form.Field>
                                              <div className="mb-2 flex flex-wrap gap-1">
                                                {teamPlayers.length > 0 && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                  >
                                                    {teamPlayers.length} player
                                                    {teamPlayers.length !== 1
                                                      ? "s"
                                                      : ""}
                                                  </Badge>
                                                )}
                                                {team.roles.length > 0 && (
                                                  <Badge
                                                    variant="secondary"
                                                    className="text-xs"
                                                  >
                                                    {team.roles.length} team
                                                    role
                                                    {team.roles.length !== 1
                                                      ? "s"
                                                      : ""}
                                                  </Badge>
                                                )}
                                              </div>
                                            </ItemContent>
                                            <ItemActions>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() =>
                                                  openRoleDialog({
                                                    type: "team",
                                                    id: team.id,
                                                    index: i,
                                                  })
                                                }
                                              >
                                                <Shield className="h-4 w-4" />
                                              </Button>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                  form.setFieldValue(
                                                    "players",
                                                    selectedPlayers.map((p) =>
                                                      p.teamId === team.id
                                                        ? {
                                                            ...p,
                                                            teamId: undefined,
                                                          }
                                                        : p,
                                                    ),
                                                  );
                                                  field.removeValue(i);
                                                }}
                                              >
                                                <Trash2 className="h-4 w-4" />
                                              </Button>
                                            </ItemActions>
                                            <ItemFooter className="flex w-full flex-col gap-2">
                                              <ItemGroup className="w-full gap-2">
                                                {teamPlayers.map((player) => {
                                                  const playerIndex =
                                                    selectedPlayers.findIndex(
                                                      (p) => {
                                                        if (
                                                          p.type === "original"
                                                        ) {
                                                          return (
                                                            p.type ===
                                                              player.type &&
                                                            p.id === player.id
                                                          );
                                                        } else {
                                                          return (
                                                            p.type ===
                                                              player.type &&
                                                            p.sharedId ===
                                                              player.sharedId
                                                          );
                                                        }
                                                      },
                                                    );
                                                  if (playerIndex === -1) {
                                                    return null;
                                                  }
                                                  return (
                                                    <Item
                                                      key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                                      size="sm"
                                                      className="w-full py-1"
                                                      variant="muted"
                                                    >
                                                      <ItemMedia>
                                                        <Avatar className="h-5 w-5">
                                                          <AvatarImage
                                                            src={
                                                              "/generic-placeholder-icon.png?height=48&width=48"
                                                            }
                                                          />
                                                          <AvatarFallback>
                                                            {player.name.charAt(
                                                              0,
                                                            )}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                      </ItemMedia>
                                                      <ItemContent>
                                                        <ItemTitle>
                                                          {player.name}
                                                        </ItemTitle>
                                                        <ItemDescription>
                                                          {player.roles.length >
                                                            0 && (
                                                            <Badge
                                                              variant="outline"
                                                              className="text-xs"
                                                            >
                                                              {
                                                                player.roles
                                                                  .length
                                                              }{" "}
                                                              role
                                                              {player.roles
                                                                .length !== 1
                                                                ? "s"
                                                                : ""}
                                                            </Badge>
                                                          )}
                                                        </ItemDescription>
                                                      </ItemContent>
                                                      <ItemActions>
                                                        <Button
                                                          type="button"
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() =>
                                                            openRoleDialog({
                                                              type: "player",
                                                              id:
                                                                player.type ===
                                                                "original"
                                                                  ? player.id
                                                                  : player.sharedId,
                                                              shareType:
                                                                player.type,
                                                              index:
                                                                playerIndex,
                                                            })
                                                          }
                                                        >
                                                          <Shield className="h-3 w-3" />
                                                        </Button>
                                                        <Button
                                                          type="button"
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() =>
                                                            assignPlayerToTeam(
                                                              undefined,
                                                              player,
                                                            )
                                                          }
                                                        >
                                                          <X className="h-3 w-3" />
                                                        </Button>
                                                      </ItemActions>
                                                    </Item>
                                                  );
                                                })}
                                              </ItemGroup>
                                              {individualPlayers.length > 0 && (
                                                <Collapsible className="w-full">
                                                  <CollapsibleTrigger className="text-muted-foreground hover:text-foreground w-full cursor-pointer text-left text-xs">
                                                    + Assign players to this
                                                    team
                                                  </CollapsibleTrigger>
                                                  <CollapsibleContent>
                                                    <ItemGroup className="gap-2">
                                                      {individualPlayers.map(
                                                        (player) => {
                                                          return (
                                                            <Item
                                                              key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                                              size="sm"
                                                              role="listitem"
                                                              className="hover:bg-accent py-1"
                                                              asChild
                                                            >
                                                              <button
                                                                type="button"
                                                                onClick={(
                                                                  e,
                                                                ) => {
                                                                  e.stopPropagation();

                                                                  assignPlayerToTeam(
                                                                    team.id,
                                                                    player,
                                                                  );
                                                                }}
                                                              >
                                                                <ItemMedia>
                                                                  <Avatar className="h-5 w-5">
                                                                    <AvatarImage
                                                                      src={
                                                                        "/generic-placeholder-icon.png?height=48&width=48"
                                                                      }
                                                                    />
                                                                    <AvatarFallback>
                                                                      {player.name.charAt(
                                                                        0,
                                                                      )}
                                                                    </AvatarFallback>
                                                                  </Avatar>
                                                                </ItemMedia>
                                                                <ItemContent>
                                                                  <ItemTitle>
                                                                    {
                                                                      player.name
                                                                    }
                                                                  </ItemTitle>
                                                                </ItemContent>
                                                              </button>
                                                            </Item>
                                                          );
                                                        },
                                                      )}
                                                    </ItemGroup>
                                                  </CollapsibleContent>
                                                </Collapsible>
                                              )}
                                            </ItemFooter>
                                          </Item>
                                        );
                                      })}
                                      {individualPlayers.length > 0 && (
                                        <Item variant="outline">
                                          <ItemMedia variant="icon">
                                            <User />
                                          </ItemMedia>
                                          <ItemContent>
                                            <ItemTitle>
                                              Individual Players
                                            </ItemTitle>
                                          </ItemContent>
                                          <ItemFooter className="w-full">
                                            <ItemGroup className="w-full gap-3">
                                              {individualPlayers.map(
                                                (player) => {
                                                  const playerIndex =
                                                    selectedPlayers.findIndex(
                                                      (p) => {
                                                        if (
                                                          p.type === "original"
                                                        ) {
                                                          return (
                                                            p.type ===
                                                              player.type &&
                                                            p.id === player.id
                                                          );
                                                        } else {
                                                          return (
                                                            p.type ===
                                                              player.type &&
                                                            p.sharedId ===
                                                              player.sharedId
                                                          );
                                                        }
                                                      },
                                                    );
                                                  if (playerIndex === -1) {
                                                    return null;
                                                  }
                                                  return (
                                                    <Item
                                                      key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                                      variant="muted"
                                                      className="hover:bg-accent w-full py-2"
                                                    >
                                                      <ItemMedia>
                                                        <Avatar className="h-6 w-6">
                                                          <AvatarImage
                                                            src={
                                                              "/generic-placeholder-icon.png?height=48&width=48"
                                                            }
                                                          />
                                                          <AvatarFallback>
                                                            {player.name.charAt(
                                                              0,
                                                            )}
                                                          </AvatarFallback>
                                                        </Avatar>
                                                      </ItemMedia>
                                                      <ItemContent>
                                                        <ItemTitle>
                                                          {player.name}
                                                        </ItemTitle>
                                                        <ItemDescription>
                                                          {player.roles.length >
                                                            0 && (
                                                            <Badge
                                                              variant="outline"
                                                              className="text-xs"
                                                            >
                                                              {
                                                                player.roles
                                                                  .length
                                                              }{" "}
                                                              role
                                                              {player.roles
                                                                .length !== 1
                                                                ? "s"
                                                                : ""}
                                                            </Badge>
                                                          )}
                                                        </ItemDescription>
                                                      </ItemContent>
                                                      <ItemActions>
                                                        <Button
                                                          type="button"
                                                          size="icon"
                                                          variant="ghost"
                                                          onClick={() =>
                                                            openRoleDialog({
                                                              type: "player",
                                                              id:
                                                                player.type ===
                                                                "original"
                                                                  ? player.id
                                                                  : player.sharedId,
                                                              shareType:
                                                                player.type,
                                                              index:
                                                                playerIndex,
                                                            })
                                                          }
                                                        >
                                                          <Shield className="h-3 w-3" />
                                                        </Button>
                                                      </ItemActions>
                                                    </Item>
                                                  );
                                                },
                                              )}
                                            </ItemGroup>
                                          </ItemFooter>
                                        </Item>
                                      )}
                                    </ItemGroup>
                                  </ScrollArea>
                                </div>
                              );
                            }}
                          </form.Field>
                        </TabsContent>
                      </Tabs>
                    )}
                  </form.Field>
                </FieldGroup>
                <DialogFooter className="sm:justify-between">
                  <Button
                    type="button"
                    variant="secondary"
                    onClick={() => {
                      setMode("select");
                    }}
                  >
                    <ChevronLeft className="mr-1 h-4 w-4" />
                    Back
                  </Button>
                  <div className="flex gap-2">
                    <Button
                      type="button"
                      variant="secondary"
                      onClick={onCancel}
                    >
                      Cancel
                    </Button>
                    <Button type="submit" disabled={selectedPlayers.length < 1}>
                      Start Match
                    </Button>
                  </div>
                </DialogFooter>
                <Dialog open={showRoleDialog} onOpenChange={setShowRoleDialog}>
                  {roleTarget !== null && (
                    <DialogContent>
                      <DialogHeader>
                        <DialogTitle>{`Assign Roles to ${roleTarget.name}`}</DialogTitle>
                      </DialogHeader>
                      <form.Field
                        name={
                          roleTarget.type === "player"
                            ? `players[${roleTarget.index}].roles`
                            : `teams[${roleTarget.index}].roles`
                        }
                        mode="array"
                      >
                        {(field) => {
                          const filteredRoles = AVAILABLE_ROLES.filter(
                            (role) =>
                              role.name
                                .toLowerCase()
                                .includes(roleSearchQuery.toLowerCase()) ||
                              role.description
                                .toLowerCase()
                                .includes(roleSearchQuery.toLowerCase()),
                          );
                          return (
                            <>
                              <InputGroup>
                                <InputGroupInput
                                  placeholder="Search Roles..."
                                  value={roleSearchQuery}
                                  onChange={(e) =>
                                    setRoleSearchQuery(e.target.value)
                                  }
                                />
                                <InputGroupAddon>
                                  <Search />
                                </InputGroupAddon>
                                {searchQuery !== "" && (
                                  <InputGroupAddon align="inline-end">
                                    {filteredPlayers.length} results
                                  </InputGroupAddon>
                                )}
                              </InputGroup>
                              <ScrollArea>
                                <ItemGroup className="max-h-[500px] gap-4">
                                  {filteredRoles.map((role) => {
                                    const selected =
                                      field.state.value.findIndex((r) => {
                                        if (r.type == "original") {
                                          return (
                                            r.type === role.type &&
                                            r.id === role.id
                                          );
                                        }
                                        return (
                                          r.type === role.type &&
                                          r.sharedId === role.sharedId
                                        );
                                      });
                                    const isRoleFromTeam = () => {
                                      if (roleTarget.type === "team") {
                                        return false;
                                      } else {
                                        const team = teams.find(
                                          (t) => t.id === roleTarget.teamId,
                                        );
                                        const foundRole = team?.roles.find(
                                          (r) => {
                                            if (r.type == "original") {
                                              return (
                                                r.type === role.type &&
                                                r.id === role.id
                                              );
                                            }
                                            return (
                                              r.type === role.type &&
                                              r.sharedId === role.sharedId
                                            );
                                          },
                                        );
                                        if (foundRole) {
                                          return true;
                                        } else {
                                          return false;
                                        }
                                      }
                                    };
                                    const fromTeam = isRoleFromTeam();
                                    const toggleRole = () => {
                                      if (selected > -1) {
                                        field.removeValue(selected);
                                      } else {
                                        field.pushValue(role);
                                      }
                                    };
                                    return (
                                      <Field
                                        key={`${role.id}-${role.type}`}
                                        orientation="horizontal"
                                        className={cn(
                                          "border-border focus-visible:border-ring focus-visible:ring-ring/50 flex flex-row gap-4 rounded-md border p-4",
                                          selected > -1 &&
                                            "border-primary bg-primary/5",
                                        )}
                                      >
                                        <Checkbox
                                          id={`${role.id}-${role.type}`}
                                          checked={selected > -1}
                                          onCheckedChange={() => toggleRole()}
                                        />
                                        <label
                                          htmlFor={`${role.id}-${role.type}`}
                                          className="flex-1 gap-2"
                                        >
                                          <ItemTitle>
                                            {role.name}
                                            {fromTeam && (
                                              <Badge
                                                variant="secondary"
                                                className="text-xs"
                                              >
                                                Team Role
                                              </Badge>
                                            )}
                                          </ItemTitle>
                                          <ItemDescription>
                                            {role.description}
                                          </ItemDescription>
                                        </label>
                                      </Field>
                                    );
                                  })}
                                </ItemGroup>
                              </ScrollArea>
                            </>
                          );
                        }}
                      </form.Field>
                      <DialogFooter>
                        <Button
                          type="button"
                          variant="default"
                          onClick={() => {
                            setShowRoleDialog(false);
                          }}
                        >
                          Save
                        </Button>
                      </DialogFooter>
                    </DialogContent>
                  )}
                </Dialog>
              </>
            );
          }}
        </form.Subscribe>
      </form>
    </DialogContent>
  );
}
