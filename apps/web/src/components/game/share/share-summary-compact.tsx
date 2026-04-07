"use client";

import { Badge } from "@board-games/ui/badge";
import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemTitle,
} from "@board-games/ui/item";
import { cn } from "@board-games/ui/utils";

import type { ShareSummaryCompact } from "./share-summary-derive";

const MAX_CHIPS = 5;
const MAX_CHIPS_DIALOG = 4;

const ChipRow = ({
  label,
  items,
  empty,
  dense,
}: {
  label: string;
  items: string[];
  empty: string;
  dense?: boolean;
}) => {
  const cap = dense ? MAX_CHIPS_DIALOG : MAX_CHIPS;
  if (items.length === 0) {
    return (
      <Item
        variant="muted"
        size="xs"
        className={cn("border-border/60", dense && "py-1.5")}
      >
        <ItemContent className={dense ? "gap-0.5" : undefined}>
          <ItemTitle className={dense ? "text-[10px]" : undefined}>
            {label}
          </ItemTitle>
          <ItemDescription className={dense ? "text-[10px]" : undefined}>
            {empty}
          </ItemDescription>
        </ItemContent>
      </Item>
    );
  }
  const shown = items.slice(0, cap);
  const more = items.length - shown.length;
  return (
    <Item
      variant="muted"
      size="xs"
      className={cn("border-border/60", dense && "py-1.5")}
    >
      <ItemContent className={dense ? "gap-0.5" : undefined}>
        <ItemTitle className={dense ? "text-[10px]" : undefined}>
          {label}
        </ItemTitle>
        <div
          className={cn("flex flex-wrap gap-1", dense ? "mt-0.5" : "mt-1")}
          aria-label={`${label}: ${items.join(", ")}`}
        >
          {shown.map((x) => (
            <Badge
              key={x}
              variant="secondary"
              className={cn(
                "max-w-[140px] truncate font-normal",
                dense ? "text-[9px] px-1.5 py-0" : "text-[10px]",
              )}
            >
              {x}
            </Badge>
          ))}
          {more > 0 ? (
            <Badge
              variant="outline"
              className={cn(
                "font-normal",
                dense ? "text-[9px]" : "text-[10px]",
              )}
            >
              +{more} more
            </Badge>
          ) : null}
        </div>
      </ItemContent>
    </Item>
  );
};

const MatchChipRow = ({
  matches,
  dense,
}: {
  matches: ShareSummaryCompact["matchSummaries"];
  dense?: boolean;
}) => {
  const cap = dense ? MAX_CHIPS_DIALOG : MAX_CHIPS;
  if (matches.length === 0) {
    return (
      <Item
        variant="muted"
        size="xs"
        className={cn("border-border/60", dense && "py-1.5")}
      >
        <ItemContent className={dense ? "gap-0.5" : undefined}>
          <ItemTitle className={dense ? "text-[10px]" : undefined}>
            Matches
          </ItemTitle>
          <ItemDescription className={dense ? "text-[10px]" : undefined}>
            No matches selected.
          </ItemDescription>
        </ItemContent>
      </Item>
    );
  }
  const shown = matches.slice(0, cap);
  const more = matches.length - shown.length;
  return (
    <Item
      variant="muted"
      size="xs"
      className={cn("border-border/60", dense && "py-1.5")}
    >
      <ItemContent className={dense ? "gap-0.5" : undefined}>
        <ItemTitle className={dense ? "text-[10px]" : undefined}>
          Matches
        </ItemTitle>
        <ul
          className={cn(
            "space-y-1.5",
            dense ? "mt-0.5 text-[10px] leading-tight" : "mt-1 text-[11px]",
          )}
          aria-label="Selected matches"
        >
          {shown.map((m) => (
            <li
              key={`${m.name}-${m.subtitle ?? ""}`}
              className="text-muted-foreground flex min-w-0 flex-col gap-0.5 leading-tight"
            >
              <span className="text-foreground font-medium">{m.name}</span>
              {m.subtitle ? (
                <span className="text-muted-foreground">{m.subtitle}</span>
              ) : null}
            </li>
          ))}
        </ul>
        {more > 0 ? (
          <p
            className={cn(
              "text-muted-foreground mt-1",
              dense ? "text-[9px]" : "text-[10px]",
            )}
          >
            +{more} more sessions
          </p>
        ) : null}
      </ItemContent>
    </Item>
  );
};

export const ShareSummaryCompactBlock = ({
  compact,
  variant = "default",
}: {
  compact: ShareSummaryCompact;
  variant?: "default" | "dialog";
}) => {
  const dense = variant === "dialog";
  return (
    <div className={dense ? "space-y-1.5" : "space-y-2"}>
      {!dense ? (
        <p className="text-muted-foreground text-[10px] font-semibold tracking-wide uppercase">
          Shared content
        </p>
      ) : null}
      <ItemGroup className={dense ? "gap-1" : "gap-2"}>
        <ChipRow
          dense={dense}
          label="Recipients"
          items={compact.recipientNames}
          empty="Add at least one recipient."
        />
        <ChipRow
          dense={dense}
          label="Roles"
          items={compact.roleNamesIncluded}
          empty="Roles not included or none selected."
        />
        <ChipRow
          dense={dense}
          label="Scoresheets"
          items={compact.scoresheetNamesIncluded}
          empty="Scoresheets not included or none selected."
        />
        <ChipRow
          dense={dense}
          label="Players"
          items={compact.playerShareLabels}
          empty={
            compact.sharingMode === "basic"
              ? "Choose Advanced mode to set player permissions per recipient."
              : "No players shared with scoresheets."
          }
        />
        <MatchChipRow dense={dense} matches={compact.matchSummaries} />
        <ChipRow
          dense={dense}
          label="Locations (from matches)"
          items={compact.locationsShared}
          empty="No locations included with matches."
        />
        <ChipRow
          dense={dense}
          label="Match players"
          items={compact.matchPlayerNamesIncluded}
          empty="No players included with matches."
        />
      </ItemGroup>
    </div>
  );
};
