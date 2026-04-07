"use client";

import type { LucideIcon } from "lucide-react";
import {
  ClipboardList,
  ListOrdered,
  Table,
  Target,
  Trophy,
  Users,
} from "lucide-react";

import {
  Item,
  ItemContent,
  ItemDescription,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { cn } from "@board-games/ui/utils";

import {
  shareRoundDetailDescription,
  shareRoundMarkerProps,
} from "../share-scoresheet-round-display";
import type { GameToShare } from "../types";

const ScoresheetMetaRow = ({
  icon: Icon,
  label,
  children,
}: {
  icon: LucideIcon;
  label: string;
  children: React.ReactNode;
}) => (
  <div className="flex gap-2 sm:gap-2.5">
    <Icon
      className="text-muted-foreground mt-0.5 size-3.5 shrink-0 sm:size-4"
      aria-hidden
    />
    <div className="min-w-0 flex-1">
      <p className="text-muted-foreground text-[9px] font-medium tracking-wide uppercase sm:text-[10px]">
        {label}
      </p>
      <p className="text-foreground text-xs leading-snug sm:text-sm">
        {children}
      </p>
    </div>
  </div>
);

export const ScoresheetDetailBody = ({
  sheet,
}: {
  sheet: GameToShare["scoresheets"][number];
}) => {
  const rounds = sheet.rounds;
  return (
    <div className="space-y-2 rounded-lg p-2 sm:space-y-4 sm:rounded-xl sm:p-4">
      <div className="flex flex-col gap-2 sm:flex-row sm:items-start sm:gap-5">
        <div className="bg-primary/15 flex size-9 shrink-0 items-center justify-center rounded-lg sm:mt-0.5 sm:size-11 sm:rounded-xl">
          <Table className="text-primary size-4 sm:size-5" aria-hidden />
        </div>
        <div className="min-w-0 flex-1 space-y-2 sm:space-y-4">
          <p className="text-foreground text-xs font-medium leading-snug sm:text-sm">
            Scoresheet details
          </p>
          <div className="grid grid-cols-1 gap-2 sm:grid-cols-2 sm:gap-x-5 sm:gap-y-3">
            <ScoresheetMetaRow icon={Table} label="Type">
              {sheet.type}
            </ScoresheetMetaRow>
            <ScoresheetMetaRow icon={Users} label="Format">
              {sheet.isCoop ? "Co-op scoring" : "Competitive"}
            </ScoresheetMetaRow>
            <ScoresheetMetaRow icon={Trophy} label="Win condition">
              {sheet.winCondition}
            </ScoresheetMetaRow>
            <ScoresheetMetaRow icon={ListOrdered} label="Rounds">
              {sheet.roundsScore}
            </ScoresheetMetaRow>
            {sheet.targetScore != null ? (
              <div className="sm:col-span-2">
                <ScoresheetMetaRow icon={Target} label="Target score">
                  {sheet.targetScore}
                </ScoresheetMetaRow>
              </div>
            ) : null}
          </div>
        </div>
      </div>
      {rounds.length > 0 ? (
        <div className="space-y-1.5 sm:space-y-3">
          <p className="text-foreground flex items-center gap-1.5 text-[10px] font-semibold tracking-wide uppercase sm:gap-2 sm:text-xs">
            <ClipboardList className="size-3 sm:size-3.5" aria-hidden />
            Rounds
          </p>
          <ItemGroup className="gap-1 sm:gap-2" role="list">
            {rounds.map((r, roundIndex) => {
              const marker = shareRoundMarkerProps(r.color);
              return (
                <Item key={r.id} variant="outline" size="xs" role="listitem">
                  <ItemMedia
                    variant="icon"
                    className={cn(
                      "size-8 shrink-0 rounded-full sm:size-9",
                      marker.className,
                    )}
                    style={marker.style}
                    aria-hidden
                  >
                    {roundIndex + 1}
                  </ItemMedia>
                  <ItemContent>
                    <ItemTitle className="text-xs sm:text-sm">
                      {r.name}
                    </ItemTitle>
                    <ItemDescription className="text-[11px] sm:text-xs">
                      {shareRoundDetailDescription(r)}
                    </ItemDescription>
                  </ItemContent>
                </Item>
              );
            })}
          </ItemGroup>
        </div>
      ) : null}
    </div>
  );
};
