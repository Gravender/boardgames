import { cn } from "@board-games/ui/utils";

import { PlayerImage } from "~/components/player-image";

import type { GroupRow } from "./played-with-groups-types";
import { cohortIdentityKey } from "./played-with-groups-utils";

export const GroupStatBlock = ({
  label,
  value,
  title: titleAttr,
}: {
  label: string;
  value: React.ReactNode;
  title?: string;
}) => (
  <div
    className="border-border/50 bg-muted/20 min-w-0 flex-1 rounded-md border px-2 py-1.5"
    title={titleAttr}
  >
    <p className="text-muted-foreground text-[10px] font-medium tracking-wide uppercase">
      {label}
    </p>
    <div className="text-foreground mt-0.5 truncate text-xs font-semibold tabular-nums sm:text-sm">
      {value}
    </div>
  </div>
);

export const CohortPlayerChips = ({
  cohort,
  profileInCohort,
}: {
  cohort: (GroupRow["profileInCohort"] | GroupRow["members"][number])[];
  profileInCohort: GroupRow["profileInCohort"];
}) => (
  <div
    className="flex flex-wrap gap-1.5"
    role="group"
    aria-label="Players in this cohort"
  >
    {cohort.map((m) => {
      const isProfile =
        cohortIdentityKey(m) === cohortIdentityKey(profileInCohort);
      return (
        <div
          key={cohortIdentityKey(m)}
          className={cn(
            "flex min-w-0 max-w-full items-center gap-1.5 rounded-full border py-0.5 pr-2.5 pl-0.5",
            isProfile
              ? "border-primary/35 bg-primary/10 ring-1 ring-primary/25"
              : "border-border/45 bg-muted/30",
          )}
        >
          <PlayerImage
            className="size-7 shrink-0"
            image={m.image}
            alt={m.name}
          />
          <span className="truncate text-xs font-medium sm:text-sm">
            {m.name}
            {isProfile && (
              <span className="text-muted-foreground ml-1 text-[10px] font-normal sm:text-xs">
                · profile
              </span>
            )}
          </span>
        </div>
      );
    })}
  </div>
);
