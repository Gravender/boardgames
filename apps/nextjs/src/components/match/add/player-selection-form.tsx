import { useState } from "react";
import { Search, UserPlus } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { isSamePlayer } from "@board-games/shared";
import { Button } from "@board-games/ui/button";
import { Field, FieldError, FieldLabel } from "@board-games/ui/field";
import {
  InputGroup,
  InputGroupAddon,
  InputGroupInput,
} from "@board-games/ui/input-group";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import type { PlayerType } from "./schema";
import { PlayerImage } from "~/components/player-image";
import { withFieldGroup } from "~/hooks/form";

const defaultValues: {
  players: PlayerType[];
} = {
  players: [],
};
type Players = RouterOutputs["newPlayer"]["getPlayersForMatch"]["players"];
export const PlayerSelectorField = withFieldGroup({
  defaultValues,
  props: {
    originalPlayers: [] as Players,
    addPlayerOnClick: () => {
      /* empty */
    },
  },
  render: function Render({ group, originalPlayers, addPlayerOnClick }) {
    const [searchQuery, setSearchQuery] = useState("");
    const filteredPlayers = originalPlayers.filter((player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return (
      <div className="space-y-4">
        <div className="flex gap-2">
          <InputGroup className="flex-1">
            <InputGroupInput
              placeholder="Search players..."
              value={searchQuery}
              onChange={(e) => setSearchQuery(e.target.value)}
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
          <Button
            type="button"
            variant="outline"
            onClick={() => addPlayerOnClick()}
          >
            <UserPlus className="mr-2 h-4 w-4" />
            Add Player
          </Button>
        </div>
        <group.AppField name="players" mode="array">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            filteredPlayers.sort((a, b) => {
              const selectedA = field.state.value.find((p) =>
                isSamePlayer(p, a),
              );
              const selectedB = field.state.value.find((p) =>
                isSamePlayer(p, b),
              );
              if (selectedA && selectedB) {
                return 0;
              }
              if (selectedA) {
                return -1;
              }
              if (selectedB) {
                return 1;
              }
              return 0;
            });
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Players
                </FieldLabel>
                <ScrollArea>
                  <ItemGroup className="max-h-[40vh] gap-4">
                    {filteredPlayers.map((player) => {
                      const playerIndex = field.state.value.findIndex((p) =>
                        isSamePlayer(p, player),
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
                            onClick={() => {
                              if (playerIndex > -1) {
                                field.removeValue(playerIndex);
                              } else {
                                field.pushValue({
                                  ...player,
                                  roles: [],
                                });
                              }
                            }}
                            className={cn(
                              playerIndex > -1 && "border-primary bg-primary/5",
                            )}
                          >
                            <ItemMedia>
                              <PlayerImage
                                className="size-8"
                                image={player.image}
                                alt={player.name}
                              />
                            </ItemMedia>
                            <ItemContent>
                              <ItemTitle>{player.name}</ItemTitle>
                              <ItemDescription className="text-left">
                                {`${player.matches} matches played`}
                              </ItemDescription>
                            </ItemContent>
                            <div
                              className={cn(
                                "flex h-6 w-6 items-center justify-center rounded-full border-2 transition-colors",
                                playerIndex > -1
                                  ? "border-primary bg-primary"
                                  : "border-muted-foreground",
                              )}
                            >
                              {playerIndex > -1 && (
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

                {isInvalid && <FieldError errors={field.state.meta.errors} />}
                {field.state.value.length < 1 && (
                  <div className="text-muted-foreground bg-muted/50 rounded-lg py-4 text-center text-sm">
                    Select at least 1 player to start the match
                  </div>
                )}
              </Field>
            );
          }}
        </group.AppField>
      </div>
    );
  },
});
