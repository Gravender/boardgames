"use client";

import type { RoleInsightsProps } from "./role-insights-helpers";
import { PlayerPerformanceSection } from "./PlayerPerformanceSection";
import { RolePresenceSection } from "./RolePresenceSection";
import { RoleSummarySection } from "./RoleSummarySection";

export function RoleInsights({ roles }: RoleInsightsProps) {
  return (
    <div className="space-y-6">
      <RoleSummarySection roles={roles.roles} />
      <RolePresenceSection presenceEffects={roles.presenceEffects} />
      <PlayerPerformanceSection
        playerPerformance={roles.playerPerformance}
        winCondition={roles.winCondition}
      />
    </div>
  );
}
