import { useState } from "react";
import { Search } from "lucide-react";
import z from "zod";

import { isSamePlayer } from "@board-games/shared";
import { Avatar, AvatarFallback, AvatarImage } from "@board-games/ui/avatar";
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

import { withFieldGroup } from "~/hooks/form";

export const playerSchema = z.discriminatedUnion("type", [
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
export type Player = z.infer<typeof playerSchema>;

const defaultValues: {
  players: Player[];
} = {
  players: [],
};
export const PlayerSelectorField = withFieldGroup({
  defaultValues,
  props: {
    originalPlayers: [] as (Player & { matches: number })[],
  },
  render: function Render({ group, originalPlayers }) {
    const [searchQuery, setSearchQuery] = useState("");
    const filteredPlayers = originalPlayers.filter((player) =>
      player.name.toLowerCase().includes(searchQuery.toLowerCase()),
    );
    return (
      <div className="space-y-4">
        <InputGroup>
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
        <group.AppField name="players" mode="array">
          {(field) => {
            const isInvalid =
              field.state.meta.isTouched && !field.state.meta.isValid;
            return (
              <Field data-invalid={isInvalid}>
                <FieldLabel htmlFor={field.name} className="sr-only">
                  Players
                </FieldLabel>
                <ScrollArea>
                  <ItemGroup className="max-h-[500px] gap-4">
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
                                field.pushValue(player);
                              }
                            }}
                            className={cn(
                              playerIndex > -1 && "border-primary bg-primary/5",
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
                    Select at least 1 players to start the match
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
