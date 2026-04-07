"use client";

import { useState } from "react";

import { cn } from "@board-games/ui/utils";

import { useFormContext } from "~/hooks/form";

import { getMatchCountByScoresheetId } from "../share-preview";
import { useShareGameData } from "../share-game-data-context";
import {
  ShareInlineValidationAlert,
  shareSectionErrorRingClass,
} from "../share-inline-validation";
import type { ShareGameForm } from "../use-share-game-form";

import { ScoresheetsListBody } from "./scoresheets-list-body";
import { ScoresheetsToolbar } from "./scoresheets-toolbar";
import {
  filterScoresheetsForShareUi,
  type SheetSort,
} from "./share-scoresheets-filter";

const ScoresheetsListInner = ({
  form,
  validationMessages,
}: {
  form: ShareGameForm;
  validationMessages?: string[];
}) => {
  const gameData = useShareGameData();
  const [query, setQuery] = useState("");
  const [sort, setSort] = useState<SheetSort>("name_asc");

  const allWinConditions = [
    ...new Set(gameData.scoresheets.map((s) => s.winCondition)),
  ].toSorted((a, b) => a.localeCompare(b));

  const [selectedWinConditions, setSelectedWinConditions] = useState<
    Set<string>
  >(() => new Set(gameData.scoresheets.map((s) => s.winCondition)));

  const [showCoop, setShowCoop] = useState(true);
  const [showCompetitive, setShowCompetitive] = useState(true);

  const matchCountBySheetId = getMatchCountByScoresheetId(gameData);

  const handleToggleWinCondition = (winCondition: string) => {
    setSelectedWinConditions((prev) => {
      const next = new Set(prev);
      if (next.has(winCondition)) {
        next.delete(winCondition);
      } else {
        next.add(winCondition);
      }
      return next;
    });
  };

  const rows = filterScoresheetsForShareUi(
    gameData.scoresheets,
    query,
    sort,
    selectedWinConditions,
    showCoop,
    showCompetitive,
  );

  const filterIsDefault =
    showCoop &&
    showCompetitive &&
    selectedWinConditions.size === allWinConditions.length &&
    allWinConditions.every((wc) => selectedWinConditions.has(wc));

  const isDefaultView = query === "" && filterIsDefault && sort === "name_asc";

  return (
    <div
      id="share-section-scoresheets"
      className={cn(
        "space-y-2",
        shareSectionErrorRingClass((validationMessages?.length ?? 0) > 0),
      )}
    >
      <ShareInlineValidationAlert messages={validationMessages} />
      <h3 className="text-sm font-medium">Scoresheets to include</h3>
      <ScoresheetsToolbar
        query={query}
        onQueryChange={setQuery}
        sort={sort}
        onSortChange={setSort}
        allWinConditions={allWinConditions}
        selectedWinConditions={selectedWinConditions}
        onToggleWinCondition={handleToggleWinCondition}
        showCoop={showCoop}
        onShowCoopChange={setShowCoop}
        showCompetitive={showCompetitive}
        onShowCompetitiveChange={setShowCompetitive}
        filterIsDefault={filterIsDefault}
      />
      <ScoresheetsListBody
        form={form}
        gameData={gameData}
        rows={rows}
        isDefaultView={isDefaultView}
        matchCountBySheetId={matchCountBySheetId}
      />
    </div>
  );
};

type ScoresheetsListSectionProps = {
  validationMessages?: string[];
};

export const ScoresheetsListSection = ({
  validationMessages,
}: ScoresheetsListSectionProps) => {
  const form = useFormContext() as unknown as ShareGameForm;

  return (
    <ScoresheetsListInner form={form} validationMessages={validationMessages} />
  );
};
