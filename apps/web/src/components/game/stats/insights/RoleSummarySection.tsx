"use client";

import { useMemo, useState } from "react";
import { Search, ShieldCheck } from "lucide-react";

import { Badge } from "@board-games/ui/badge";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { Progress } from "@board-games/ui/progress";
import { ScrollArea } from "@board-games/ui/scroll-area";

import type { RoleSummary } from "./role-insights-helpers";
import { ClassificationBadge, formatPercent } from "./role-insights-helpers";

export const RoleSummarySection = ({ roles }: { roles: RoleSummary[] }) => {
  const [search, setSearch] = useState("");

  const filteredRoles = useMemo(() => {
    if (!search.trim()) return roles;
    const query = search.toLowerCase();
    return roles.filter(
      (role) =>
        role.name.toLowerCase().includes(query) ||
        role.description?.toLowerCase().includes(query),
    );
  }, [roles, search]);

  if (roles.length === 0) return null;

  const handleSearchChange = (e: React.ChangeEvent<HTMLInputElement>) => {
    setSearch(e.target.value);
  };

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <ShieldCheck className="h-5 w-5" />
          Role Overview
        </CardTitle>
      </CardHeader>
      <CardContent className="space-y-3">
        {roles.length > 4 && (
          <div className="relative">
            <Search className="text-muted-foreground absolute top-2.5 left-2.5 h-4 w-4" />
            <Input
              placeholder="Search roles..."
              value={search}
              onChange={handleSearchChange}
              className="pl-9"
              aria-label="Search roles"
            />
          </div>
        )}
        <ScrollArea>
          <div className="grid max-h-[30vh] gap-3 sm:grid-cols-2">
            {filteredRoles.map((role) => {
              const total =
                role.classificationBreakdown.unique +
                role.classificationBreakdown.team +
                role.classificationBreakdown.shared;
              const uniquePct =
                total > 0
                  ? Math.round(
                      (role.classificationBreakdown.unique / total) * 100,
                    )
                  : 0;
              const teamPct =
                total > 0
                  ? Math.round(
                      (role.classificationBreakdown.team / total) * 100,
                    )
                  : 0;
              const sharedPct = total > 0 ? 100 - uniquePct - teamPct : 0;

              return (
                <div
                  key={role.roleId}
                  className="flex flex-col gap-2 rounded-lg border p-3"
                >
                  <div className="flex items-center justify-between">
                    <div className="flex items-center gap-2">
                      <span className="text-sm font-semibold">{role.name}</span>
                      <ClassificationBadge
                        classification={role.predominantClassification}
                      />
                    </div>
                    <Badge variant="secondary">{role.matchCount} matches</Badge>
                  </div>

                  {role.description && (
                    <p className="text-muted-foreground text-xs">
                      {role.description}
                    </p>
                  )}

                  <div className="space-y-1">
                    <div className="flex items-center justify-between text-sm">
                      <span className="text-muted-foreground">Win Rate</span>
                      <span className="font-medium">
                        {formatPercent(role.winRate)}
                      </span>
                    </div>
                    <Progress
                      value={Math.round(role.winRate * 100)}
                      className="h-2"
                    />
                  </div>

                  {/* Classification breakdown - muted/de-prioritized */}
                  {total > 0 && (
                    <div className="space-y-1 opacity-60">
                      <div className="bg-muted flex h-1.5 overflow-hidden rounded-full">
                        {uniquePct > 0 && (
                          <div
                            className="bg-muted-foreground/40 h-full"
                            style={{ width: `${uniquePct}%` }}
                            title={`Unique: ${uniquePct}%`}
                          />
                        )}
                        {teamPct > 0 && (
                          <div
                            className="bg-muted-foreground/25 h-full"
                            style={{ width: `${teamPct}%` }}
                            title={`Team: ${teamPct}%`}
                          />
                        )}
                        {sharedPct > 0 && (
                          <div
                            className="bg-muted-foreground/15 h-full"
                            style={{ width: `${sharedPct}%` }}
                            title={`Shared: ${sharedPct}%`}
                          />
                        )}
                      </div>
                      <div className="text-muted-foreground flex gap-3 text-[10px]">
                        {uniquePct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/40 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Unique {uniquePct}%
                          </span>
                        )}
                        {teamPct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/25 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Team {teamPct}%
                          </span>
                        )}
                        {sharedPct > 0 && (
                          <span>
                            <span className="bg-muted-foreground/15 mr-1 inline-block h-1.5 w-1.5 rounded-full" />
                            Shared {sharedPct}%
                          </span>
                        )}
                      </div>
                    </div>
                  )}
                </div>
              );
            })}
            {filteredRoles.length === 0 && (
              <p className="text-muted-foreground col-span-2 py-4 text-center text-sm">
                No roles match &quot;{search}&quot;
              </p>
            )}
          </div>
        </ScrollArea>
      </CardContent>
    </Card>
  );
};
