"use client";

import { Award, BarChart3, Shuffle, UserCheck, Users } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Card, CardContent, CardHeader, CardTitle } from "@board-games/ui/card";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";
import { cn } from "@board-games/ui/utils";

import { RoleAnalysisTab } from "./role-analysis-tab";
import { RoleCombosTab } from "./role-combos-tab";
import { RoleOverviewTab } from "./role-overview-tab";
import { RolePlayerTab } from "./role-player-tab";

type GameStats = NonNullable<RouterOutputs["game"]["getGameStats"]>;
type RoleCombos = GameStats["roleCombos"];
type RoleStats = GameStats["roleStats"][number];
type PlayerStats = GameStats["players"][number];

export default function RolesTab({
  userStats,
  roleCombos,
  roleStats,
  players,
}: {
  roleCombos: RoleCombos;
  roleStats: RoleStats[];
  userStats: PlayerStats | undefined;
  players: PlayerStats[];
}) {
  const hasRoleCombos = Array.isArray(roleCombos) && roleCombos.length > 0;

  return (
    <Card>
      <CardHeader>
        <CardTitle className="flex items-center gap-2">
          <UserCheck className="h-5 w-5" />
          Role-Based Performance Analysis
        </CardTitle>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="overview">
          <TabsList
            className={cn(
              "grid w-full",
              hasRoleCombos ? "grid-cols-4" : "grid-cols-3",
            )}
          >
            <TabsTrigger value="overview" className="flex items-center gap-2">
              <BarChart3 className="h-4 w-4" />
              Overview
            </TabsTrigger>
            <TabsTrigger value="player" className="flex items-center gap-2">
              <Users className="h-4 w-4" />
              By Player
            </TabsTrigger>
            <TabsTrigger value="role" className="flex items-center gap-2">
              <Award className="h-4 w-4" />
              By Role
            </TabsTrigger>
            {hasRoleCombos && (
              <TabsTrigger value="combos" className="flex items-center gap-2">
                <Shuffle className="h-4 w-4" />
                Role Combos
              </TabsTrigger>
            )}
          </TabsList>

          <TabsContent value="overview" className="space-y-6">
            <RoleOverviewTab roleStats={roleStats} userStats={userStats} />
          </TabsContent>

          <TabsContent value="player" className="space-y-6">
            <RolePlayerTab players={players} />
          </TabsContent>

          <TabsContent value="role" className="space-y-6">
            <RoleAnalysisTab roleStats={roleStats} />
          </TabsContent>

          {hasRoleCombos && (
            <TabsContent value="combos" className="space-y-6">
              <RoleCombosTab roleCombos={roleCombos} />
            </TabsContent>
          )}
        </Tabs>
      </CardContent>
    </Card>
  );
}
