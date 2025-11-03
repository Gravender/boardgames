"use client";

import type { Dispatch, SetStateAction } from "react";
import { useState } from "react";
import {
  ChevronLeft,
  Plus,
  Shield,
  Trash2,
  User,
  Users,
  Users2,
  X,
} from "lucide-react";
import z from "zod/v4";

import type { RouterOutputs } from "@board-games/api";
import { imageSchema, isSamePlayer } from "@board-games/shared";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
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
import { FieldGroup } from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
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

import { useGameRoles } from "~/components/game/hooks/roles";
import { PlayerImage } from "~/components/player-image";
import { Spinner } from "~/components/spinner";
import { useAppForm } from "~/hooks/form";
import { usePlayers } from "../hooks/players";
import { AddPlayerForm } from "./add-player-form";
import { GroupQuickMatchSelection } from "./group-select";
import { PlayerSelectorField } from "./player-selection-form";
import { RecentMatchSelection } from "./recent-match-select";
import { PlayerRoleSelectorField, TeamRoleSelectorField } from "./role-form";

type Players = RouterOutputs["newPlayer"]["getPlayersForMatch"]["players"];
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
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const playerSchema = z.discriminatedUnion("type", [
    z.object({
      type: z.literal("original"),
      name: z.string(),
      id: z.number(),
    }),
    z.object({
      type: z.literal("shared"),
      name: z.string(),
      sharedId: z.number(),
    }),
  ]);
  const playersSchema = z.object({
    players: z.array(playerSchema).min(1, {
      message: "You must select at least one player",
    }),
  });
  const { playersForMatch, isLoading: isLoadingPlayers } = usePlayers();

  const form = useAppForm({
    formId: "quick-match-selection",
    defaultValues: {
      players: [] as z.infer<typeof playersSchema>["players"],
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
  if (showAddPlayerDialog) {
    return (
      <DialogContent className="max-w-4xl">
        <AddPlayerForm
          description="Add a player to your match"
          onReset={() => setShowAddPlayerDialog(false)}
          onPlayerAdded={(player) => {
            setShowAddPlayerDialog(false);
            form.state.values.players.push({
              id: player.id,
              type: "original" as const,
              name: player.name,
            });
          }}
        />
      </DialogContent>
    );
  }
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
          })}
        >
          {({ selectedPlayers }) => {
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
                {isLoadingPlayers ? (
                  <div className="flex items-center justify-center">
                    <Spinner />
                  </div>
                ) : playersForMatch === undefined ? (
                  <div className="text-muted-foreground text-sm">
                    No players found
                  </div>
                ) : (
                  <>
                    <GroupQuickMatchSelection
                      players={playersForMatch.players}
                      setPlayers={(groupPlayers: Players) => {
                        form.setFieldValue("players", groupPlayers);
                      }}
                    />
                    <RecentMatchSelection
                      players={playersForMatch.players}
                      setPlayers={(matchPlayers: Players) => {
                        form.setFieldValue("players", matchPlayers);
                      }}
                    />
                    <PlayerSelectorField
                      form={form}
                      fields={{
                        players: "players",
                      }}
                      originalPlayers={playersForMatch.players}
                      addPlayerOnClick={() => {
                        setShowAddPlayerDialog(true);
                      }}
                    />
                  </>
                )}

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

export function CustomMatchSelection({
  onCancel,
  setMode,
}: MatchCreationFlowProps) {
  const [showAddPlayerDialog, setShowAddPlayerDialog] = useState(false);
  const [showRoleDialog, setShowRoleDialog] = useState(false);
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
  const { gameRoles } = useGameRoles({
    type: "original",
    id: 1,
  });
  const { playersForMatch, isLoading: isLoadingPlayers } = usePlayers();
  const roleSchema = z.discriminatedUnion("type", [
    z.object({
      id: z.number(),
      type: z.literal("original"),
      name: z.string(),
      description: z.string().nullable(),
    }),
    z.object({
      sharedId: z.number(),
      type: z.literal("shared"),
      name: z.string(),
      description: z.string().nullable(),
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
      image: imageSchema.nullable(),
    }),
    z.object({
      type: z.literal("shared"),
      name: z.string(),
      sharedId: z.number(),
      roles: z.array(roleSchema),
      teamId: z.number().optional(),
      image: imageSchema.nullable(),
    }),
  ]);
  const playersSchema = z.object({
    players: z.array(playerSchema).min(1, {
      message: "You must select at least one player",
    }),
    teams: z.array(teamsSchema),
    activeTab: z.literal("players").or(z.literal("teams")),
  });

  const form = useAppForm({
    formId: "custom-match-selection",
    defaultValues: {
      teams: [] as z.infer<typeof teamsSchema>[],
      players: [] as z.infer<typeof playersSchema>["players"],
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
      form.reset();
      onCancel();
    },
  });
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

  if (showAddPlayerDialog) {
    return (
      <DialogContent className="max-w-4xl">
        <AddPlayerForm
          description="Add a player to your match"
          onReset={() => setShowAddPlayerDialog(false)}
          onPlayerAdded={(player) => {
            setShowAddPlayerDialog(false);
            form.state.values.players.push({
              id: player.id,
              type: "original" as const,
              name: player.name,
              roles: [],
              teamId: undefined,
              image: player.image,
            });
          }}
        />
      </DialogContent>
    );
  }

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
          })}
        >
          {({ selectedPlayers, teams }) => {
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
                    className="rounded-lg px-4 py-2 text-base"
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
                          {isLoadingPlayers ? (
                            <div className="flex items-center justify-center">
                              <Spinner />
                            </div>
                          ) : playersForMatch === undefined ? (
                            <div className="text-muted-foreground text-sm">
                              No players found
                            </div>
                          ) : (
                            <>
                              <GroupQuickMatchSelection
                                players={playersForMatch.players}
                                setPlayers={(groupPlayers: Players) => {
                                  form.setFieldValue(
                                    "players",
                                    groupPlayers.map((p) => ({
                                      ...p,
                                      roles: [],
                                    })),
                                  );
                                }}
                              />
                              <RecentMatchSelection
                                players={playersForMatch.players}
                                setPlayers={(matchPlayers: Players) => {
                                  form.setFieldValue(
                                    "players",
                                    matchPlayers.map((p) => ({
                                      ...p,
                                      roles: [],
                                    })),
                                  );
                                }}
                              />
                              <PlayerSelectorField
                                form={form}
                                fields={{
                                  players: "players",
                                }}
                                originalPlayers={playersForMatch.players.map(
                                  (p) => ({ ...p, roles: [] }),
                                )}
                                addPlayerOnClick={() => {
                                  setShowAddPlayerDialog(true);
                                }}
                              />
                            </>
                          )}
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
                                              <ItemDescription>
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
                                              </ItemDescription>
                                            </ItemContent>
                                            <ItemActions>
                                              <Button
                                                type="button"
                                                size="icon"
                                                variant="ghost"
                                                onClick={() => {
                                                  setRoleTarget({
                                                    id: team.id,
                                                    type: "team" as const,
                                                    index: i,
                                                    name: team.name,
                                                  });
                                                  setShowRoleDialog(true);
                                                }}
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
                                                        <PlayerImage
                                                          className="size-8"
                                                          image={player.image}
                                                          alt={player.name}
                                                        />
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
                                                          onClick={() => {
                                                            const foundPlayer =
                                                              selectedPlayers[
                                                                playerIndex
                                                              ];
                                                            if (
                                                              foundPlayer ===
                                                              undefined
                                                            ) {
                                                              return;
                                                            }
                                                            const roleObject =
                                                              foundPlayer.type ===
                                                              "original"
                                                                ? {
                                                                    id: foundPlayer.id,
                                                                    type: "player" as const,
                                                                    index:
                                                                      playerIndex,
                                                                    name: foundPlayer.name,
                                                                    shareType:
                                                                      "original" as const,
                                                                    teamId:
                                                                      foundPlayer.teamId,
                                                                  }
                                                                : {
                                                                    id: foundPlayer.sharedId,
                                                                    type: "player" as const,
                                                                    index:
                                                                      playerIndex,
                                                                    name: foundPlayer.name,
                                                                    shareType:
                                                                      "shared" as const,
                                                                    teamId:
                                                                      foundPlayer.teamId,
                                                                  };
                                                            setRoleTarget(
                                                              roleObject,
                                                            );
                                                            setShowRoleDialog(
                                                              true,
                                                            );
                                                          }}
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
                                                                  <PlayerImage
                                                                    className="size-5"
                                                                    image={
                                                                      player.image
                                                                    }
                                                                    alt={
                                                                      player.name
                                                                    }
                                                                  />
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
                                                      (p) =>
                                                        isSamePlayer(p, player),
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
                                                        <PlayerImage
                                                          className="size-6"
                                                          image={player.image}
                                                          alt={player.name}
                                                        />
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
                                                          onClick={() => {
                                                            const foundPlayer =
                                                              selectedPlayers[
                                                                playerIndex
                                                              ];
                                                            if (
                                                              foundPlayer ===
                                                              undefined
                                                            ) {
                                                              return;
                                                            }
                                                            const roleObject =
                                                              foundPlayer.type ===
                                                              "original"
                                                                ? {
                                                                    id: foundPlayer.id,
                                                                    type: "player" as const,
                                                                    index:
                                                                      playerIndex,
                                                                    name: foundPlayer.name,
                                                                    shareType:
                                                                      "original" as const,
                                                                    teamId:
                                                                      foundPlayer.teamId,
                                                                  }
                                                                : {
                                                                    id: foundPlayer.sharedId,
                                                                    type: "player" as const,
                                                                    index:
                                                                      playerIndex,
                                                                    name: foundPlayer.name,
                                                                    shareType:
                                                                      "shared" as const,
                                                                    teamId:
                                                                      foundPlayer.teamId,
                                                                  };
                                                            setRoleTarget(
                                                              roleObject,
                                                            );
                                                            setShowRoleDialog(
                                                              true,
                                                            );
                                                          }}
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
                      {roleTarget.type === "player" ? (
                        <PlayerRoleSelectorField
                          form={form}
                          fields={{
                            roles: `players[${roleTarget.index}].roles`,
                          }}
                          title={roleTarget.name}
                          gameRoles={gameRoles}
                          team={teams.find((t) => t.id === roleTarget.teamId)}
                        />
                      ) : (
                        <TeamRoleSelectorField
                          title={roleTarget.name}
                          gameRoles={gameRoles}
                          form={form}
                          fields={{ roles: `teams[${roleTarget.index}].roles` }}
                        />
                      )}
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
