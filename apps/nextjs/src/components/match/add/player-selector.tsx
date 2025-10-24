"use client";

import type { Dispatch, SetStateAction } from "react";
import { useForm } from "@tanstack/react-form";
import { ChevronLeft, Search, Users } from "lucide-react";
import z from "zod/v4";

import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  DialogContent,
  DialogDescription,
  DialogFooter,
  DialogHeader,
  DialogTitle,
} from "@board-games/ui/dialog";
import {
  Field,
  FieldContent,
  FieldError,
  FieldGroup,
  FieldLabel,
} from "@board-games/ui/field";
import { Input } from "@board-games/ui/input";
import { toast } from "@board-games/ui/toast";

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
                          <FieldContent>
                            <FieldLabel
                              htmlFor={field.name}
                              className="sr-only"
                            >
                              Players
                            </FieldLabel>
                          </FieldContent>
                          <div className="grid max-h-[500px] gap-3 overflow-y-auto pr-2">
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
                                <button
                                  key={`${player.type}-${player.type === "original" ? player.id : player.sharedId}`}
                                  type="button"
                                  onClick={() => togglePlayer(player)}
                                  className={`flex items-center gap-4 rounded-lg border-2 p-4 text-left transition-all ${
                                    selected
                                      ? "border-primary bg-primary/5"
                                      : "border-border hover:border-primary/50 hover:bg-accent"
                                  }`}
                                >
                                  <Avatar className="h-12 w-12">
                                    <AvatarImage
                                      src={`/generic-placeholder-icon.png?height=48&width=48`}
                                    />
                                    <AvatarFallback>
                                      {player.name.slice(0, 2).toUpperCase()}
                                    </AvatarFallback>
                                  </Avatar>
                                  <div className="flex-1">
                                    <div className="font-semibold">
                                      {player.name}
                                    </div>
                                    <div className="text-muted-foreground text-sm">
                                      {player.matches} matches played
                                    </div>
                                  </div>
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
                              );
                            })}
                          </div>
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
