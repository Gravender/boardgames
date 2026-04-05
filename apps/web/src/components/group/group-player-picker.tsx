"use client";

import { Checkbox } from "@board-games/ui/checkbox";
import {
  Item,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import type { RouterOutputs } from "@board-games/api";

import { PlayerImage } from "~/components/player-image";

type OriginalPlayer = Extract<
  RouterOutputs["newPlayer"]["getPlayers"][number],
  { type: "original" }
>;

type GroupPlayerPickerProps = {
  players: readonly OriginalPlayer[];
  selected: readonly number[];
  onToggle: (playerId: number, index: number, newChecked: boolean) => void;
  "aria-label"?: string;
};

export const GroupPlayerPicker = ({
  players,
  selected,
  onToggle,
  "aria-label": ariaLabel = "Select players",
}: GroupPlayerPickerProps) => {
  return (
    <div className="space-y-2">
      <ScrollArea className="h-52 rounded-lg border border-border/80 bg-muted/20 p-2">
        <ItemGroup className="gap-2" aria-label={ariaLabel}>
          {players.map((player) => {
            const idx = selected.indexOf(player.id);
            const isChecked = idx > -1;
            const checkboxId = `group-player-${player.id}`;
            return (
              <Item
                key={player.id}
                variant="outline"
                size="sm"
                role="listitem"
                className={cn(isChecked && "border-primary bg-primary/5")}
                render={
                  <label
                    htmlFor={checkboxId}
                    className="flex w-full cursor-pointer items-center gap-3 text-left"
                  >
                    <Checkbox
                      id={checkboxId}
                      checked={isChecked}
                      onCheckedChange={(newChecked) => {
                        onToggle(player.id, idx, newChecked);
                      }}
                    />
                    <ItemMedia variant="image">
                      <PlayerImage
                        className="size-8"
                        image={player.image}
                        alt={player.name}
                      />
                    </ItemMedia>
                    <ItemContent>
                      <ItemTitle className="text-sm font-medium">
                        {player.name}
                      </ItemTitle>
                    </ItemContent>
                  </label>
                }
              />
            );
          })}
        </ItemGroup>
      </ScrollArea>
    </div>
  );
};
