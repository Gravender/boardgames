"use client";

import React, { useMemo, useState } from "react";
import {
  Calendar,
  ChevronDown,
  ChevronRight,
  Dices,
  MapPin,
  Search,
  Users,
} from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import { Badge } from "@board-games/ui/badge";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@board-games/ui/card";
import { Input } from "@board-games/ui/input";
import { Tabs, TabsContent, TabsList, TabsTrigger } from "@board-games/ui/tabs";

export function FriendSharedItems({
  sharedWith,
  sharedTo,
}: {
  sharedWith: RouterOutputs["friend"]["getFriend"]["sharedWith"];
  sharedTo: RouterOutputs["friend"]["getFriend"]["sharedTo"];
}) {
  const [withSearchTerm, setWithSearchTerm] = useState("");
  const [toSearchTerm, setToSearchTerm] = useState("");

  return (
    <Card>
      <CardHeader>
        <CardTitle>Shared Items</CardTitle>
        <CardDescription>
          Items shared between you and your friend
        </CardDescription>
      </CardHeader>
      <CardContent>
        <Tabs defaultValue="with">
          <TabsList className="grid w-full grid-cols-2">
            <TabsTrigger value="with">Shared with Friend</TabsTrigger>
            <TabsTrigger value="to">Shared to You</TabsTrigger>
          </TabsList>

          <TabsContent value="with" className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shared items..."
                className="pl-8"
                value={withSearchTerm}
                onChange={(e) => setWithSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-1">
              <SharedItemsList items={sharedWith} searchTerm={withSearchTerm} />
            </div>
          </TabsContent>

          <TabsContent value="to" className="mt-4">
            <div className="relative mb-4">
              <Search className="absolute left-2 top-2.5 h-4 w-4 text-muted-foreground" />
              <Input
                placeholder="Search shared items..."
                className="pl-8"
                value={toSearchTerm}
                onChange={(e) => setToSearchTerm(e.target.value)}
              />
            </div>
            <div className="max-h-[500px] overflow-y-auto pr-1">
              <SharedItemsList items={sharedTo} searchTerm={toSearchTerm} />
            </div>
          </TabsContent>
        </Tabs>
      </CardContent>
    </Card>
  );
}

function SharedItemsList({
  items,
  searchTerm,
}: {
  items: RouterOutputs["friend"]["getFriend"]["sharedWith"];
  searchTerm: string;
}) {
  // Filter items based on search term
  const filteredItems = useMemo(() => {
    if (!searchTerm) return items;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return items.filter((item) => {
      // Check if item name matches search term
      if (item.name.toLowerCase().includes(lowerSearchTerm)) return true;

      // For game items, also check matches and scoresheets
      if (item.type === "game") {
        // Check if any match name matches search term
        const matchesMatch = item.matches.some((match) =>
          match.name.toLowerCase().includes(lowerSearchTerm),
        );
        if (matchesMatch) return true;

        // Check if any scoresheet name matches search term
        const matchesScoresheet = item.scoresheets.some((sheet) =>
          sheet.name.toLowerCase().includes(lowerSearchTerm),
        );
        if (matchesScoresheet) return true;
      }

      return false;
    });
  }, [items, searchTerm]);

  if (filteredItems.length === 0) {
    return (
      <p className="py-4 text-center text-muted-foreground">No items found</p>
    );
  }

  // Group items by type
  const gameItems = filteredItems.filter((item) => item.type === "game");
  const playerItems = filteredItems.filter((item) => item.type === "player");
  const locationItems = filteredItems.filter(
    (item) => item.type === "location",
  );

  return (
    <div className="space-y-6">
      {gameItems.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-medium">Games</h3>
          <div className="space-y-3">
            {gameItems.map((item) => (
              <GameItem key={item.id} item={item} searchTerm={searchTerm} />
            ))}
          </div>
        </div>
      )}

      {playerItems.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-medium">Players</h3>
          <div className="space-y-2">
            {playerItems.map((item) => (
              <SimpleItem
                key={item.id}
                item={item}
                icon={<Users className="h-4 w-4" />}
              />
            ))}
          </div>
        </div>
      )}

      {locationItems.length > 0 && (
        <div>
          <h3 className="mb-3 text-lg font-medium">Locations</h3>
          <div className="space-y-2">
            {locationItems.map((item) => (
              <SimpleItem
                key={item.id}
                item={item}
                icon={<MapPin className="h-4 w-4" />}
              />
            ))}
          </div>
        </div>
      )}
    </div>
  );
}

function GameItem({
  item,
  searchTerm,
}: {
  item: Extract<
    RouterOutputs["friend"]["getFriend"]["sharedWith"][number],
    { type: "game" }
  >;
  searchTerm: string;
}) {
  const [isOpen, setIsOpen] = useState(false);

  // Auto-expand if there's a search term that matches matches or scoresheets but not the game name
  const shouldAutoExpand = useMemo(() => {
    if (!searchTerm) return false;

    const lowerSearchTerm = searchTerm.toLowerCase();

    // If game name doesn't match but matches or scoresheets do, auto-expand
    if (!item.name.toLowerCase().includes(lowerSearchTerm)) {
      const matchesMatch = item.matches.some((match) =>
        match.name.toLowerCase().includes(lowerSearchTerm),
      );
      const matchesScoresheet = item.scoresheets.some((sheet) =>
        sheet.name.toLowerCase().includes(lowerSearchTerm),
      );

      return matchesMatch || matchesScoresheet;
    }

    return false;
  }, [item, searchTerm]);

  // Use effect to auto-expand when search term changes
  React.useEffect(() => {
    if (shouldAutoExpand) {
      setIsOpen(true);
    }
  }, [shouldAutoExpand]);

  // Filter matches and scoresheets based on search term
  const filteredMatches = useMemo(() => {
    if (!searchTerm) return item.matches;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return item.matches.filter((match) =>
      match.name.toLowerCase().includes(lowerSearchTerm),
    );
  }, [item.matches, searchTerm]);

  const filteredScoresheets = useMemo(() => {
    if (!searchTerm) return item.scoresheets;

    const lowerSearchTerm = searchTerm.toLowerCase();
    return item.scoresheets.filter((sheet) =>
      sheet.name.toLowerCase().includes(lowerSearchTerm),
    );
  }, [item.scoresheets, searchTerm]);

  // Format date to readable format
  const formatDate = (date: Date) => {
    return new Date(date).toLocaleDateString("en-US", {
      year: "numeric",
      month: "short",
      day: "numeric",
    });
  };

  return (
    <div className="overflow-hidden rounded-md border">
      <div className="flex items-center gap-2 p-3">
        <div className="relative hidden h-12 w-12 overflow-hidden rounded-lg md:flex">
          <Dices className="h-full w-full items-center justify-center rounded-md bg-muted p-2" />
        </div>
        <div className="flex-grow">
          <div className="flex items-center">
            <p className="font-medium">{item.name}</p>
            <Badge variant={"outline"} className="text-xs text-blue-500">
              Shared
            </Badge>
          </div>
          <p className="text-xs text-muted-foreground">
            {item.matches.length} matches, {item.scoresheets.length} scoresheets
          </p>
        </div>
        <div className="flex items-center gap-2">
          <Badge variant={item.permission === "edit" ? "default" : "secondary"}>
            {item.permission}
          </Badge>
          <button
            className="rounded-full p-1 hover:bg-gray-100"
            onClick={() => setIsOpen(!isOpen)}
          >
            {isOpen ? (
              <ChevronDown className="h-4 w-4" />
            ) : (
              <ChevronRight className="h-4 w-4" />
            )}
          </button>
        </div>
      </div>

      {isOpen && (
        <div className="space-y-3 px-3 pb-3">
          {filteredMatches.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Matches</h4>
              <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                {filteredMatches.map((match) => (
                  <div key={match.id} className="rounded-md bg-gray-50 p-2">
                    <div className="flex items-center justify-between">
                      <div className="flex items-center gap-2">
                        <p className="text-sm font-medium">{match.name}</p>
                        <Badge
                          variant={"outline"}
                          className="text-xs text-blue-500"
                        >
                          Shared
                        </Badge>
                      </div>
                      <Badge
                        variant={
                          match.permission === "edit" ? "default" : "secondary"
                        }
                        className="text-xs"
                      >
                        {match.permission}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <Calendar className="mr-1 h-3 w-3" />
                      {formatDate(match.date)}
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}

          {filteredScoresheets.length > 0 && (
            <div>
              <h4 className="mb-2 text-sm font-medium">Scoresheets</h4>
              <div className="max-h-[200px] space-y-2 overflow-y-auto pr-1">
                {filteredScoresheets.map((scoresheet) => (
                  <div
                    key={scoresheet.id}
                    className="rounded-md bg-gray-50 p-2"
                  >
                    <div className="flex items-center justify-between">
                      <p className="text-sm font-medium">{scoresheet.name}</p>
                      <Badge
                        variant={
                          scoresheet.permission === "edit"
                            ? "default"
                            : "secondary"
                        }
                        className="text-xs"
                      >
                        {scoresheet.permission}
                      </Badge>
                    </div>
                    <div className="mt-1 flex items-center text-xs text-muted-foreground">
                      <span>
                        {scoresheet.isCoop ? "Cooperative" : "Competitive"}
                      </span>
                      <span className="mx-1">•</span>
                      <span>{scoresheet.winCondition}</span>
                    </div>
                  </div>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </div>
  );
}

function SimpleItem({
  item,
  icon,
}: {
  item: RouterOutputs["friend"]["getFriend"]["sharedWith"][number];
  icon: React.ReactNode;
}) {
  return (
    <div className="flex items-center justify-between rounded-md border p-3">
      <div className="flex items-center gap-2">
        {icon}
        <div>
          <div className="flex items-center gap-2">
            <p className="font-medium">{item.name}</p>
            <Badge variant={"outline"} className="text-xs text-blue-500">
              Shared
            </Badge>
          </div>
          <p className="text-xs capitalize text-muted-foreground">
            {item.type}
          </p>
        </div>
      </div>
      <Badge variant={item.permission === "edit" ? "default" : "secondary"}>
        {item.permission}
      </Badge>
    </div>
  );
}
