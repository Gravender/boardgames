import type { Dispatch, SetStateAction } from "react";
import { useEffect, useState } from "react";
import { SlidersHorizontal } from "lucide-react";

import { Button } from "@board-games/ui/button";
import { DualRangeSlider } from "@board-games/ui/dual-range-slider";
import { Label } from "@board-games/ui/label";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import {
  Sheet,
  SheetContent,
  SheetDescription,
  SheetHeader,
  SheetTitle,
} from "@board-games/ui/sheet";

interface FilterState {
  type: string;
  minPlayers: number;
  maxPlayers: number;
  minPlaytime: number;
  maxPlaytime: number;
}

interface GameFiltersProps {
  filters: FilterState;
  setFilters: Dispatch<SetStateAction<FilterState>>;
  isOpen: boolean;
  setIsOpen: Dispatch<SetStateAction<boolean>>;
  players: {
    max: number;
  };
  playtime: {
    max: number;
  };
}

export function GameFilters({
  filters,
  setFilters,
  isOpen,
  setIsOpen,
  players,
  playtime,
}: GameFiltersProps) {
  // State to track if we're on desktop or mobile
  const [isMobile, setIsMobile] = useState(false);

  // Check if we're on mobile when component mounts and when window resizes
  useEffect(() => {
    const checkIfMobile = () => {
      setIsMobile(window.innerWidth < 768);
    };

    // Initial check
    checkIfMobile();

    // Add event listener for window resize
    window.addEventListener("resize", checkIfMobile);

    // Cleanup
    return () => window.removeEventListener("resize", checkIfMobile);
  }, []);

  const handleReset = () => {
    setFilters({
      type: "all",
      minPlayers: 0,
      maxPlayers: players.max,
      minPlaytime: 0,
      maxPlaytime: playtime.max,
    });
  };

  return (
    <div className="mt-4">
      <div className="flex items-center justify-between">
        <Button
          variant="outline"
          size="sm"
          className="flex items-center gap-2"
          onClick={() => setIsOpen(!isOpen)}
        >
          <SlidersHorizontal className="h-4 w-4" />
          Filters
          {isOpen && <span className="ml-1">▲</span>}
          {!isOpen && <span className="ml-1">▼</span>}
        </Button>

        <Button variant="ghost" size="sm" onClick={handleReset}>
          Reset
        </Button>
      </div>

      {/* Mobile Filters */}
      {isMobile ? (
        <Sheet open={isOpen} onOpenChange={setIsOpen}>
          <SheetContent side="bottom" className="h-[80vh] sm:h-[60vh]">
            <SheetHeader className="mb-4">
              <SheetTitle>Filters</SheetTitle>
              <SheetDescription>
                Filter your board game collection
              </SheetDescription>
            </SheetHeader>

            <div className="space-y-6">
              <div>
                <h3 className="mb-2 font-medium">Game Type</h3>
                <RadioGroup
                  value={filters.type}
                  onValueChange={(value) =>
                    setFilters({ ...filters, type: value })
                  }
                  className="flex flex-col space-y-1"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="all" id="mobile-type-all" />
                    <Label htmlFor="mobile-type-all">All Games</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="original"
                      id="mobile-type-original"
                    />
                    <Label htmlFor="mobile-type-original">Original</Label>
                  </div>
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem value="shared" id="mobile-type-shared" />
                    <Label htmlFor="mobile-type-shared">Shared</Label>
                  </div>
                </RadioGroup>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <h3 className="font-medium">Player Count</h3>
                  <span className="text-sm text-muted-foreground">
                    {filters.minPlayers} - {filters.maxPlayers} players
                  </span>
                </div>
                <div className="px-2">
                  <DualRangeSlider
                    value={[filters.minPlayers, filters.maxPlayers]}
                    min={0}
                    max={players.max}
                    step={1}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        minPlayers: value[0] ?? 0,
                        maxPlayers: value[1] ?? players.max,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex justify-between">
                  <h3 className="font-medium">Playtime</h3>
                  <span className="text-sm text-muted-foreground">
                    {filters.minPlaytime} - {filters.maxPlaytime} minutes
                  </span>
                </div>
                <div className="px-2">
                  <DualRangeSlider
                    value={[filters.minPlaytime, filters.maxPlaytime]}
                    min={0}
                    max={playtime.max}
                    step={5}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        minPlaytime: value[0] ?? 0,
                        maxPlaytime: value[1] ?? playtime.max,
                      })
                    }
                  />
                </div>
              </div>

              <div className="flex justify-end">
                <Button onClick={() => setIsOpen(false)}>Apply Filters</Button>
              </div>
            </div>
          </SheetContent>
        </Sheet>
      ) : (
        /* Desktop Filters */
        <div
          className={`mt-4 space-y-6 rounded-md bg-muted/50 p-4 ${isOpen ? "block" : "hidden"}`}
        >
          <div className="grid gap-6 md:grid-cols-2">
            <div className="col-span-1">
              <h3 className="mb-2 font-medium">Game Type</h3>
              <RadioGroup
                value={filters.type}
                onValueChange={(value) =>
                  setFilters({ ...filters, type: value })
                }
                className="flex flex-col space-y-1"
              >
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="all" id="type-all" />
                  <Label htmlFor="type-all">All Games</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="original" id="type-original" />
                  <Label htmlFor="type-original">Original</Label>
                </div>
                <div className="flex items-center space-x-2">
                  <RadioGroupItem value="shared" id="type-shared" />
                  <Label htmlFor="type-shared">Shared</Label>
                </div>
              </RadioGroup>
            </div>
            <div className="col-span-1 flex flex-col gap-2">
              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">Player Count</h3>
                  <span className="text-sm text-muted-foreground">
                    {filters.minPlayers} - {filters.maxPlayers} players
                  </span>
                </div>
                <div className="px-2">
                  <DualRangeSlider
                    value={[filters.minPlayers, filters.maxPlayers]}
                    min={0}
                    max={players.max}
                    step={1}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        minPlayers: value[0] ?? 0,
                        maxPlayers: value[1] ?? players.max,
                      })
                    }
                  />
                </div>
              </div>

              <div>
                <div className="mb-2 flex items-center justify-between">
                  <h3 className="font-medium">Playtime</h3>
                  <span className="text-sm text-muted-foreground">
                    {filters.minPlaytime} - {filters.maxPlaytime} minutes
                  </span>
                </div>
                <div className="px-2">
                  <DualRangeSlider
                    value={[filters.minPlaytime, filters.maxPlaytime]}
                    min={0}
                    max={playtime.max}
                    step={5}
                    onValueChange={(value) =>
                      setFilters({
                        ...filters,
                        minPlaytime: value[0] ?? 0,
                        maxPlaytime: value[1] ?? playtime.max,
                      })
                    }
                  />
                </div>
              </div>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
