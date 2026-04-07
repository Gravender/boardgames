"use client";

import { RolesListSection } from "./roles/roles-list-section";
import { ScoresheetsListSection } from "./scoresheets/scoresheets-list-section";

type RolesScoresheetsSubsectionsProps = {
  shareRoles: boolean;
  shareScoresheets: boolean;
  scoresheetValidationMessages?: string[];
};

export const RolesScoresheetsSubsections = ({
  shareRoles,
  shareScoresheets,
  scoresheetValidationMessages,
}: RolesScoresheetsSubsectionsProps) => {
  if (!shareRoles && !shareScoresheets) return null;

  return (
    <div className="space-y-6">
      {shareRoles ? <RolesListSection /> : null}
      {shareScoresheets ? (
        <ScoresheetsListSection
          validationMessages={scoresheetValidationMessages}
        />
      ) : null}
    </div>
  );
};
