"use client";

import { Badge } from "@board-games/ui/badge";
import { Checkbox } from "@board-games/ui/checkbox";
import {
  Item,
  ItemActions,
  ItemContent,
  ItemGroup,
  ItemMedia,
  ItemTitle,
} from "@board-games/ui/item";
import { Label } from "@board-games/ui/label";
import { cn } from "@board-games/ui/utils";

import { ShareInfoPopoverButton } from "../share-info-popover-button";
import { scoresheetInclusionLinkedValidators } from "../share-linked-field-validators";
import type { GameData, GameToShare } from "../types";
import type { ShareGameForm } from "../use-share-game-form";

import { ScoresheetDetailBody } from "./scoresheet-detail-body";

type ScoresheetsListBodyProps = {
  form: ShareGameForm;
  gameData: GameData;
  rows: GameToShare["scoresheets"];
  isDefaultView: boolean;
  matchCountBySheetId: Record<number, number>;
};

export const ScoresheetsListBody = ({
  form,
  gameData,
  rows,
  isDefaultView,
  matchCountBySheetId,
}: ScoresheetsListBodyProps) => {
  return (
    <div className="h-[min(220px,40vh)] overflow-hidden rounded-lg border border-border">
      <div className="max-h-[min(220px,40vh)] overflow-y-auto p-2">
        <ItemGroup className="gap-2" role="list">
          {rows.length === 0 ? (
            <p className="text-muted-foreground px-2 py-6 text-center text-sm">
              No scoresheets match your filters.
            </p>
          ) : (
            rows.map((sheet, sheetIndex) => (
              <Item
                key={sheet.id}
                variant="outline"
                size="sm"
                role="listitem"
                className={cn(
                  "items-center",
                  isDefaultView &&
                    sheetIndex === 0 &&
                    "bg-muted/20 ring-primary/20 ring-offset-background ring-2 ring-offset-1",
                )}
              >
                <form.Field
                  name={`scoresheetInclusion.${sheet.id}`}
                  validators={scoresheetInclusionLinkedValidators(
                    gameData,
                    String(sheet.id),
                  )}
                >
                  {(field) => (
                    <div className="contents">
                      <ItemMedia
                        variant="icon"
                        className="shrink-0 self-center"
                      >
                        <Checkbox
                          id={`scoresheet-${sheet.id}`}
                          checked={field.state.value}
                          onCheckedChange={(c) =>
                            field.handleChange(c === true)
                          }
                        />
                      </ItemMedia>
                      <ItemContent>
                        <div className="flex min-w-0 flex-wrap items-center gap-1">
                          <ItemTitle className="min-w-0">
                            <Label
                              htmlFor={`scoresheet-${sheet.id}`}
                              className="cursor-pointer"
                            >
                              {sheet.name}
                            </Label>
                          </ItemTitle>
                          <ItemActions>
                            <ShareInfoPopoverButton
                              label={sheet.name}
                              title={sheet.name}
                            >
                              <ScoresheetDetailBody sheet={sheet} />
                            </ShareInfoPopoverButton>
                          </ItemActions>
                        </div>
                        <div className="mt-1 flex flex-wrap gap-1">
                          <Badge
                            variant="secondary"
                            className="text-[10px] font-normal"
                          >
                            {sheet.type}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {sheet.isCoop ? "Co-op" : "Competitive"}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal"
                          >
                            {sheet.winCondition}
                          </Badge>
                          <Badge
                            variant="outline"
                            className="text-[10px] font-normal tabular-nums"
                          >
                            {(matchCountBySheetId[sheet.id] ?? 0) === 1
                              ? "1 match"
                              : `${matchCountBySheetId[sheet.id] ?? 0} matches`}
                          </Badge>
                          <span className="text-muted-foreground text-[10px]">
                            {sheet.roundsScore} rounds
                          </span>
                          {sheet.targetScore != null ? (
                            <span className="text-muted-foreground text-[10px]">
                              Target {sheet.targetScore}
                            </span>
                          ) : null}
                        </div>
                        {field.state.meta.errors.length > 0 ? (
                          <div
                            className="text-destructive mt-1 text-xs"
                            role="alert"
                          >
                            {field.state.meta.errors.map((err) => (
                              <p key={String(err)}>{String(err)}</p>
                            ))}
                          </div>
                        ) : null}
                      </ItemContent>
                    </div>
                  )}
                </form.Field>
              </Item>
            ))
          )}
        </ItemGroup>
      </div>
    </div>
  );
};
