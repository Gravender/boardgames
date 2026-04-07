"use client";

import { format } from "date-fns";
import { Clock, Info, MapPin, Users } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import { Checkbox } from "@board-games/ui/checkbox";
import { Item, ItemGroup } from "@board-games/ui/item";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { ScrollArea } from "@board-games/ui/scroll-area";

import { useFormContext } from "~/hooks/form";

import { useShareGameData } from "../share-game-data-context";
import type { GameData } from "../types";
import {
  getShareMatchList,
  getScoresheetNameById,
  mockMatchIdKey,
} from "../share-preview";
import {
  getMatchShareGroupedDetail,
  type GameToShareMatch,
  type ShareMatchSortId,
} from "../share-match-detail";
import { matchRowScoresheetLinkedValidators } from "../share-linked-field-validators";
import {
  onMatchIncludedChange,
  type ShareGameForm,
} from "../use-share-game-form";

import { selectShareMatchesBadgeAndListSlice } from "./matches-form-selectors";
import { MatchDetailPopoverBody } from "./match-detail-popover-body";
import { setMatchRow } from "./set-match-row";
import {
  computeVisibleMatchesForShareUi,
  type MatchFilterId,
} from "./share-match-visibility";

type MatchesListBodyProps = {
  form: ShareGameForm;
  gameData: GameData;
  sharingMode: "basic" | "advanced";
  visibleMatches: GameToShareMatch[];
  hasScoresheetSelected: boolean;
  showSessionsWithoutScoresheetSelection: boolean;
};

const MatchesListBody = ({
  form,
  gameData,
  sharingMode,
  visibleMatches,
  hasScoresheetSelected,
  showSessionsWithoutScoresheetSelection,
}: MatchesListBodyProps) => {
  return (
    <ScrollArea className="h-[min(360px,50vh)] pr-2 sm:h-[min(420px,55vh)] sm:pr-3">
      <ItemGroup className="gap-2" role="list">
        {visibleMatches.length === 0 ? (
          <div className="text-muted-foreground space-y-3 py-8 text-center text-sm">
            {!showSessionsWithoutScoresheetSelection &&
            !hasScoresheetSelected ? (
              <p className="text-foreground max-w-md mx-auto leading-relaxed">
                No scoresheets are selected for sharing, so sessions are hidden.
                Choose one or more scoresheets in{" "}
                <span className="font-medium">Scoresheets to include</span>, or
                turn on{" "}
                <span className="font-medium">
                  Show sessions even when their scoresheet is not selected
                </span>{" "}
                under Filters.
              </p>
            ) : (
              <p className="max-w-md mx-auto leading-relaxed">
                No sessions match your search or filters.
              </p>
            )}
          </div>
        ) : null}
        {visibleMatches.map((match) => {
          const matchIdKey = mockMatchIdKey(match.id);
          const matchFieldName =
            `matches.${matchIdKey}` as const satisfies `matches.${string}`;
          return (
            <Item
              key={matchIdKey}
              variant="outline"
              role="listitem"
              className="flex-col items-stretch p-0"
            >
              <form.Field
                name={matchFieldName}
                validators={matchRowScoresheetLinkedValidators(
                  gameData,
                  matchIdKey,
                )}
              >
                {(field) => (
                  <>
                    <div className="flex flex-wrap items-center gap-2 p-2 sm:gap-3 sm:p-3">
                      <form.Subscribe
                        selector={(s) => s.values.matches[matchIdKey]?.included}
                      >
                        {(included) => (
                          <Checkbox
                            id={`match-included-${matchIdKey}`}
                            checked={included === true}
                            onCheckedChange={(c) => {
                              onMatchIncludedChange(
                                form,
                                matchIdKey,
                                c === true,
                                gameData,
                              );
                              void form.validateField(matchFieldName, "change");
                            }}
                          />
                        )}
                      </form.Subscribe>
                      <div className="min-w-0 flex-1 space-y-1">
                        <div className="flex flex-wrap items-center gap-2">
                          <Label
                            htmlFor={`match-included-${matchIdKey}`}
                            className="cursor-pointer text-sm font-medium sm:text-base"
                          >
                            {match.name}
                          </Label>
                          <span className="text-muted-foreground inline-flex items-center gap-1 text-xs">
                            <Clock className="size-3.5 shrink-0" aria-hidden />
                            {format(match.date, "PP")}
                          </span>
                          <Popover>
                            <PopoverTrigger
                              render={
                                <Button
                                  type="button"
                                  variant="ghost"
                                  size="icon-sm"
                                  className="text-muted-foreground"
                                  aria-label={`More about ${match.name}`}
                                >
                                  <Info className="size-4" />
                                </Button>
                              }
                            />
                            <PopoverContent
                              className="w-[min(28rem,calc(100vw-1rem))] max-h-[min(78vh,560px)] overflow-y-auto p-2.5 text-xs sm:max-h-[min(85vh,640px)] sm:w-[min(28rem,calc(100vw-2rem))] sm:p-4 sm:text-sm"
                              align="start"
                            >
                              <p className="text-sm font-semibold leading-snug sm:text-base">
                                {match.name}
                              </p>
                              <div className="mt-2 sm:mt-3">
                                <MatchDetailPopoverBody
                                  detail={getMatchShareGroupedDetail(match)}
                                  sessionMeta={{
                                    date: match.date,
                                    durationMinutes: match.duration,
                                    locationName: match.location?.name,
                                    playerCount: match.players.length,
                                    finished: match.finished,
                                  }}
                                />
                              </div>
                            </PopoverContent>
                          </Popover>
                        </div>
                        <div className="flex flex-wrap gap-2">
                          <Badge variant="secondary">
                            {match.finished ? "Finished" : "In progress"}
                          </Badge>
                          <Badge variant="outline">
                            {match.teams.length > 0 ? "Teams" : "Free-for-all"}
                          </Badge>
                          <Badge variant="outline" className="gap-1">
                            <Users className="size-3.5" aria-hidden />
                            {match.players.length} players
                          </Badge>
                          {match.location?.name ? (
                            <Badge variant="outline" className="gap-1">
                              <MapPin className="size-3.5" aria-hidden />
                              {match.location.name}
                            </Badge>
                          ) : null}
                          <Badge
                            variant="outline"
                            className="max-w-[min(100%,14rem)] truncate font-normal"
                            title={getScoresheetNameById(
                              gameData,
                              match.scoresheetId,
                            )}
                          >
                            {getScoresheetNameById(
                              gameData,
                              match.scoresheetId,
                            )}
                          </Badge>
                        </div>
                      </div>
                    </div>
                    {field.state.meta.errors.length > 0 ? (
                      <div
                        className="text-destructive border-border border-t px-2 py-2 pl-9 text-xs sm:pl-11"
                        role="alert"
                      >
                        {field.state.meta.errors.map((err) => (
                          <p key={String(err)}>{String(err)}</p>
                        ))}
                      </div>
                    ) : null}

                    <form.Subscribe
                      selector={(s) => s.values.matches[matchIdKey]?.included}
                    >
                      {(included) => {
                        const show =
                          included === true && sharingMode === "basic";
                        if (!show) return null;
                        return (
                          <div className="border-t border-border bg-muted/20 px-2 py-2 pl-9 sm:px-3 sm:py-3 sm:pl-11">
                            <div className="flex flex-col gap-2 sm:flex-row sm:items-center sm:gap-3">
                              <form.Subscribe
                                selector={(st) =>
                                  st.values.matches[matchIdKey]?.includePlayers
                                }
                              >
                                {(incP) => (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`match-players-${matchIdKey}`}
                                      checked={incP === true}
                                      disabled={!included}
                                      onCheckedChange={(c) =>
                                        setMatchRow(form, matchIdKey, {
                                          includePlayers: c === true,
                                        })
                                      }
                                    />
                                    <Label
                                      htmlFor={`match-players-${matchIdKey}`}
                                      className="flex cursor-pointer items-center gap-1 text-xs font-normal sm:text-sm"
                                    >
                                      <Users className="size-3.5" aria-hidden />
                                      Include players
                                    </Label>
                                  </div>
                                )}
                              </form.Subscribe>
                              <form.Subscribe
                                selector={(st) =>
                                  st.values.matches[matchIdKey]?.includeLocation
                                }
                              >
                                {(incL) => (
                                  <div className="flex items-center gap-2">
                                    <Checkbox
                                      id={`match-loc-${matchIdKey}`}
                                      checked={incL === true}
                                      disabled={!included}
                                      onCheckedChange={(c) =>
                                        setMatchRow(form, matchIdKey, {
                                          includeLocation: c === true,
                                        })
                                      }
                                    />
                                    <Label
                                      htmlFor={`match-loc-${matchIdKey}`}
                                      className="flex cursor-pointer items-center gap-1 text-xs font-normal sm:text-sm"
                                    >
                                      <MapPin
                                        className="size-3.5"
                                        aria-hidden
                                      />
                                      Include location
                                    </Label>
                                  </div>
                                )}
                              </form.Subscribe>
                            </div>
                          </div>
                        );
                      }}
                    </form.Subscribe>

                    <form.Subscribe
                      selector={(s) => ({
                        included: s.values.matches[matchIdKey]?.included,
                        mode: s.values.sharingMode,
                      })}
                    >
                      {({ included, mode }) => {
                        if (!included || mode !== "advanced") return null;
                        return (
                          <div className="border-t border-border bg-muted/15 px-2 py-2 pl-9 sm:px-3 sm:py-2.5 sm:pl-11">
                            <p className="text-muted-foreground text-[11px] leading-relaxed sm:text-xs">
                              Per-recipient match access and participants are
                              set in{" "}
                              <span className="text-foreground font-medium">
                                Advanced permissions
                              </span>{" "}
                              below.
                            </p>
                          </div>
                        );
                      }}
                    </form.Subscribe>
                  </>
                )}
              </form.Field>
            </Item>
          );
        })}
      </ItemGroup>
    </ScrollArea>
  );
};

type MatchesListProps = {
  sharingMode: "basic" | "advanced";
  matchSort: ShareMatchSortId;
  matchSearch: string;
  matchFilter: MatchFilterId;
  scoresheetListFilter: "all" | string;
  showSessionsWithoutScoresheetSelection: boolean;
};

export const MatchesList = ({
  sharingMode,
  matchSort,
  matchSearch,
  matchFilter,
  scoresheetListFilter,
  showSessionsWithoutScoresheetSelection,
}: MatchesListProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <form.Subscribe selector={selectShareMatchesBadgeAndListSlice}>
      {({ scoresheetInclusion, matchesSnapshot }) => {
        const visibleMatches = computeVisibleMatchesForShareUi(
          gameData,
          matchSort,
          matchSearch,
          matchFilter,
          scoresheetInclusion,
          matchesSnapshot,
          scoresheetListFilter,
          showSessionsWithoutScoresheetSelection,
        );

        const hasScoresheetSelected =
          Object.values(scoresheetInclusion).some(Boolean) ||
          getShareMatchList(gameData).some(
            (m) => matchesSnapshot[mockMatchIdKey(m.id)]?.included === true,
          );

        return (
          <MatchesListBody
            form={form}
            gameData={gameData}
            sharingMode={sharingMode}
            visibleMatches={visibleMatches}
            hasScoresheetSelected={hasScoresheetSelected}
            showSessionsWithoutScoresheetSelection={
              showSessionsWithoutScoresheetSelection
            }
          />
        );
      }}
    </form.Subscribe>
  );
};
