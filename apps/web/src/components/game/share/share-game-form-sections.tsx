"use client";

import { Tabs, TabsList, TabsTrigger } from "@board-games/ui/tabs";

import { useFormContext } from "~/hooks/form";

import { AdvancedRecipientsSection } from "./advanced-recipients-section";
import { MatchesSection } from "./matches/matches-section";
import { RecipientsSection } from "./recipients-section";
import { RolesScoresheetsSubsections } from "./roles-scoresheets-subsections";
import { ShareSummaryPanel } from "./share-summary-panel";
import { getShareValidationSections } from "./share-summary-derive";
import type { FriendRow } from "./types";
import { useShareGameData } from "./share-game-data-context";
import { WhatToShareSection } from "./what-to-share-section";
import {
  handleSharingModeChange,
  type ShareGameForm,
} from "./use-share-game-form";

type ShareGameFormSectionsProps = {
  friends: FriendRow[];
  inlineValidation: boolean;
  onSendRequest: () => void;
};

/**
 * Main column + desktop summary: mode tabs, recipients, optional areas, and sticky summary.
 */
export const ShareGameFormSections = ({
  friends,
  inlineValidation,
  onSendRequest,
}: ShareGameFormSectionsProps) => {
  const form = useFormContext() as unknown as ShareGameForm;
  const gameData = useShareGameData();

  return (
    <form.Subscribe
      selector={(s) => ({
        recipients: s.values.recipients,
        sharingMode: s.values.sharingMode,
        shareOptions: s.values.shareOptions,
        shareMatches: s.values.shareOptions.matches,
        values: s.values,
      })}
    >
      {({ recipients, sharingMode, shareOptions, shareMatches, values }) => {
        const sections = inlineValidation
          ? getShareValidationSections(values, gameData)
          : null;

        return (
          <div className="grid gap-8 lg:grid-cols-[1fr_minmax(280px,340px)] lg:items-start">
            <div className="flex min-w-0 flex-col gap-6">
              <div className="space-y-2">
                <p className="text-sm font-medium">Sharing mode</p>
                <Tabs
                  value={sharingMode}
                  onValueChange={(v) =>
                    handleSharingModeChange(
                      form,
                      v as "basic" | "advanced",
                      gameData,
                      friends,
                    )
                  }
                >
                  <TabsList>
                    <TabsTrigger value="basic">Basic</TabsTrigger>
                    <TabsTrigger value="advanced">Advanced</TabsTrigger>
                  </TabsList>
                </Tabs>
                <p className="text-muted-foreground text-xs">
                  Advanced mode lets you set view or edit per area and pick
                  players per recipient.
                </p>
              </div>

              <RecipientsSection
                sharingMode={sharingMode}
                validationMessages={sections?.recipients}
                friends={friends}
              />

              {sharingMode === "advanced" && recipients.length > 0 ? (
                <AdvancedRecipientsSection friends={friends} />
              ) : null}

              <WhatToShareSection />

              <RolesScoresheetsSubsections
                shareRoles={shareOptions.roles}
                shareScoresheets={shareOptions.scoresheets}
                scoresheetValidationMessages={sections?.scoresheets}
              />

              {shareMatches ? (
                <MatchesSection
                  sharingMode={sharingMode}
                  validationMessages={sections?.matches}
                />
              ) : null}
            </div>

            <ShareSummaryPanel
              onSendRequest={onSendRequest}
              friends={friends}
              className="sticky top-4 hidden lg:block lg:self-start"
            />
          </div>
        );
      }}
    </form.Subscribe>
  );
};
