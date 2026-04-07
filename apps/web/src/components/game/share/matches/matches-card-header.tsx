"use client";

import { Info } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { CardDescription, CardHeader, CardTitle } from "@board-games/ui/card";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "../share-game-data-context";
import { ShareInlineValidationAlert } from "../share-inline-validation";
import type { ShareMatchSortId } from "../share-match-detail";
import type { ShareGameForm } from "../use-share-game-form";

import { selectShareMatchesBadgeAndListSlice } from "./matches-form-selectors";
import { MatchesToolbar } from "./matches-toolbar";
import {
  computeListedMatchesForNotSharingBadge,
  isScoresheetEffectivelySharedForMatchesUi,
  type MatchFilterId,
} from "./share-match-visibility";

type MatchesCardHeaderProps = {
  validationMessages?: string[];
  matchSearch: string;
  onMatchSearchChange: (value: string) => void;
  matchSort: ShareMatchSortId;
  onMatchSortChange: (value: ShareMatchSortId) => void;
  matchFilter: MatchFilterId;
  onMatchFilterChange: (value: MatchFilterId) => void;
  scoresheetListFilter: "all" | string;
  onScoresheetListFilterChange: (value: "all" | string) => void;
  showSessionsWithoutScoresheetSelection: boolean;
  onShowSessionsWithoutScoresheetSelectionChange: (value: boolean) => void;
};

export const MatchesCardHeader = ({
  validationMessages,
  matchSearch,
  onMatchSearchChange,
  matchSort,
  onMatchSortChange,
  matchFilter,
  onMatchFilterChange,
  scoresheetListFilter,
  onScoresheetListFilterChange,
  showSessionsWithoutScoresheetSelection,
  onShowSessionsWithoutScoresheetSelectionChange,
}: MatchesCardHeaderProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <CardHeader className="space-y-1">
      <ShareInlineValidationAlert messages={validationMessages} />
      <form.Subscribe selector={selectShareMatchesBadgeAndListSlice}>
        {({ scoresheetInclusion, matchesSnapshot, shareScoresheets }) => {
          const matchesForNotSharingBadge = shareScoresheets
            ? computeListedMatchesForNotSharingBadge(
                gameData,
                matchSort,
                scoresheetInclusion,
                matchesSnapshot,
                showSessionsWithoutScoresheetSelection,
              )
            : [];

          const visibleSessionsNotInSharedScoresheets =
            matchesForNotSharingBadge.filter(
              (m) =>
                !isScoresheetEffectivelySharedForMatchesUi(
                  m.scoresheetId,
                  scoresheetInclusion,
                  matchesSnapshot,
                  gameData,
                ),
            );

          return (
            <>
              <div className="flex flex-wrap items-center gap-2">
                <CardTitle className="text-base">
                  Select matches to share
                </CardTitle>
                {visibleSessionsNotInSharedScoresheets.length > 0 ? (
                  <Popover>
                    <PopoverTrigger
                      render={
                        <Button
                          type="button"
                          variant="default"
                          size="sm"
                          className="h-7 gap-1 rounded-full px-2.5 text-xs font-medium"
                          aria-label={`${visibleSessionsNotInSharedScoresheets.length} listed sessions use a scoresheet not marked for sharing. Open for details.`}
                        >
                          {visibleSessionsNotInSharedScoresheets.length} not
                          sharing sheet
                          <Info className="size-3.5 opacity-90" aria-hidden />
                        </Button>
                      }
                    />
                    <PopoverContent
                      className="w-[min(22rem,calc(100vw-1rem))] p-2.5 text-xs sm:w-[min(22rem,calc(100vw-2rem))] sm:p-4 sm:text-sm"
                      align="start"
                    >
                      <p className="text-foreground text-sm font-medium leading-snug sm:text-base">
                        Sessions listed without shared scoresheet
                      </p>
                      <p className="text-muted-foreground mt-1.5 text-xs leading-relaxed sm:mt-2 sm:text-sm">
                        {visibleSessionsNotInSharedScoresheets.length === 1
                          ? "This session"
                          : `${visibleSessionsNotInSharedScoresheets.length} sessions`}{" "}
                        use a scoresheet that is not currently checked under
                        Scoresheets to include. You can still select a session
                        here; its scoresheet will be added automatically, or
                        enable it in Scoresheets first. Use Filters to narrow
                        which sessions appear.
                      </p>
                    </PopoverContent>
                  </Popover>
                ) : null}
              </div>
              <CardDescription className="text-xs leading-relaxed sm:text-sm">
                All sessions are shown by default. Use sort to change order and
                Filters for session scope, scoresheet list, and visibility.
                Including a match adds its scoresheet when needed.
              </CardDescription>
            </>
          );
        }}
      </form.Subscribe>
      <MatchesToolbar
        matchSearch={matchSearch}
        onMatchSearchChange={onMatchSearchChange}
        matchSort={matchSort}
        onMatchSortChange={onMatchSortChange}
        matchFilter={matchFilter}
        onMatchFilterChange={onMatchFilterChange}
        scoresheetListFilter={scoresheetListFilter}
        onScoresheetListFilterChange={onScoresheetListFilterChange}
        showSessionsWithoutScoresheetSelection={
          showSessionsWithoutScoresheetSelection
        }
        onShowSessionsWithoutScoresheetSelectionChange={
          onShowSessionsWithoutScoresheetSelectionChange
        }
      />
    </CardHeader>
  );
};
