"use client";

import { useState } from "react";

import { Card, CardContent } from "@board-games/ui/card";

import { shareSectionErrorRingClass } from "../share-inline-validation";
import type { ShareMatchSortId } from "../share-match-detail";

import { MatchesCardHeader } from "./matches-card-header";
import { MatchesList } from "./matches-list";
import type { MatchFilterId } from "./share-match-visibility";

type MatchesSectionProps = {
  sharingMode: "basic" | "advanced";
  validationMessages?: string[];
};

export const MatchesSection = ({
  sharingMode,
  validationMessages,
}: MatchesSectionProps) => {
  const [matchSort, setMatchSort] = useState<ShareMatchSortId>("date_desc");
  const [matchSearch, setMatchSearch] = useState("");
  const [matchFilter, setMatchFilter] = useState<MatchFilterId>("all");
  const [scoresheetListFilter, setScoresheetListFilter] = useState<
    "all" | string
  >("all");
  const [
    showSessionsWithoutScoresheetSelection,
    setShowSessionsWithoutScoresheetSelection,
  ] = useState(true);

  return (
    <Card
      id="share-section-matches"
      className={shareSectionErrorRingClass(
        (validationMessages?.length ?? 0) > 0,
      )}
    >
      <MatchesCardHeader
        validationMessages={validationMessages}
        matchSearch={matchSearch}
        onMatchSearchChange={setMatchSearch}
        matchSort={matchSort}
        onMatchSortChange={setMatchSort}
        matchFilter={matchFilter}
        onMatchFilterChange={setMatchFilter}
        scoresheetListFilter={scoresheetListFilter}
        onScoresheetListFilterChange={setScoresheetListFilter}
        showSessionsWithoutScoresheetSelection={
          showSessionsWithoutScoresheetSelection
        }
        onShowSessionsWithoutScoresheetSelectionChange={
          setShowSessionsWithoutScoresheetSelection
        }
      />
      <CardContent>
        <MatchesList
          sharingMode={sharingMode}
          matchSort={matchSort}
          matchSearch={matchSearch}
          matchFilter={matchFilter}
          scoresheetListFilter={scoresheetListFilter}
          showSessionsWithoutScoresheetSelection={
            showSessionsWithoutScoresheetSelection
          }
        />
      </CardContent>
    </Card>
  );
};
