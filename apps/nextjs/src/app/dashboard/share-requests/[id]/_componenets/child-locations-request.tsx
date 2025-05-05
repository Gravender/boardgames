import type { Dispatch, SetStateAction } from "react";
import { useEffect, useMemo, useState } from "react";
import { useSuspenseQuery } from "@tanstack/react-query";
import { Check, ChevronDown, ThumbsDown, ThumbsUp } from "lucide-react";

import type { RouterOutputs } from "@board-games/api";
import {
  Accordion,
  AccordionContent,
  AccordionItem,
  AccordionTrigger,
} from "@board-games/ui/accordion";
import { Badge } from "@board-games/ui/badge";
import { Button } from "@board-games/ui/button";
import {
  Command,
  CommandEmpty,
  CommandGroup,
  CommandInput,
  CommandItem,
  CommandList,
} from "@board-games/ui/command";
import { Label } from "@board-games/ui/label";
import {
  Popover,
  PopoverContent,
  PopoverTrigger,
} from "@board-games/ui/popover";
import { RadioGroup, RadioGroupItem } from "@board-games/ui/radio-group";
import { ScrollArea } from "@board-games/ui/scroll-area";
import { cn } from "@board-games/ui/utils";

import { useTRPC } from "~/trpc/react";

type LocationChildItem = Extract<
  Extract<
    RouterOutputs["sharing"]["getShareRequest"],
    { itemType: "game" }
  >["childItems"][number],
  {
    itemType: "location";
  }
>;
type Locations = LocationChildItem[];

interface LocationState {
  sharedId: number;
  accept: boolean;
  linkedId: number | null;
}

export default function ChildLocationsRequest({
  childLocations,
  locations,
  setLocations,
}: {
  childLocations: Locations;
  locations: LocationState[];
  setLocations: Dispatch<SetStateAction<LocationState[]>>;
}) {
  const trpc = useTRPC();

  const { data: userLocations } = useSuspenseQuery(
    trpc.sharing.getUserLocationsForLinking.queryOptions(),
  );

  useEffect(() => {
    setLocations(
      childLocations.map((location) => ({
        sharedId: location.shareId,
        accept: true,
        linkedId: null,
      })),
    );
  }, [childLocations, setLocations]);
  const updateLocationAcceptance = (locationId: number, accept: boolean) => {
    const temp = locations.map((location) => {
      if (location.sharedId === locationId) {
        return {
          ...location,
          accept,
        };
      }
      return location;
    });
    setLocations(temp);
  };
  const updateLocationLink = (locationId: number, linkedId: number | null) => {
    const temp = locations.map((location) => {
      if (location.sharedId === locationId) {
        return {
          ...location,
          linkedId,
        };
      }
      return location;
    });
    setLocations(temp);
  };
  const possibleMatches = useMemo(() => {
    return childLocations.reduce((acc, curr) => {
      const foundLocation = userLocations.find(
        (l) => l.name.toLowerCase() === curr.item.name.toLowerCase(),
      );
      if (foundLocation) {
        return acc + 1;
      }
      return acc;
    }, 0);
  }, [childLocations, userLocations]);
  return (
    <div className="space-y-4">
      <div className="flex items-center justify-between">
        <div className="flex items-center gap-2">
          <h3 className="text-lg font-medium">Locations</h3>
          <span className="font-medium text-green-600">
            {possibleMatches > 0 &&
              ` (${possibleMatches} possible ${possibleMatches === 1 ? "match" : "matches"})`}
          </span>
        </div>
        <p className="text-sm text-muted-foreground">
          {locations.reduce((acc, curr) => {
            if (curr.accept) return acc + 1;
            return acc;
          }, 0)}{" "}
          of {childLocations.length} selected
        </p>
      </div>
      <ScrollArea className="p-2">
        <div className="grid max-h-[20rem] gap-2">
          {childLocations
            .toSorted((a, b) => {
              return (
                userLocations.filter(
                  (l) => l.name.toLowerCase() === b.item.name.toLowerCase(),
                ).length -
                userLocations.filter(
                  (l) => l.name.toLowerCase() === a.item.name.toLowerCase(),
                ).length
              );
            })
            .map((locationItem) => {
              const isAccepted =
                locations.find((l) => l.sharedId === locationItem.shareId)
                  ?.accept ?? false;
              const locationState = locations.find(
                (l) => l.sharedId === locationItem.shareId,
              );
              if (!locationState) return null;
              const foundLocation = userLocations.find(
                (l) =>
                  l.name.toLowerCase() === locationItem.item.name.toLowerCase(),
              );
              return (
                <LocationRequest
                  key={locationItem.item.id}
                  location={locationItem}
                  isAccepted={isAccepted}
                  locationState={locationState}
                  foundLocation={foundLocation}
                  userLocations={userLocations}
                  updateLocationAcceptance={updateLocationAcceptance}
                  updateLocationLink={updateLocationLink}
                />
              );
            })}
        </div>
      </ScrollArea>
    </div>
  );
}
function LocationRequest({
  location,
  isAccepted,
  locationState,
  foundLocation,
  userLocations,
  updateLocationAcceptance,
  updateLocationLink,
}: {
  location: LocationChildItem;
  isAccepted: boolean;
  locationState: LocationState;
  foundLocation:
    | RouterOutputs["sharing"]["getUserLocationsForLinking"][number]
    | undefined;
  userLocations: RouterOutputs["sharing"]["getUserLocationsForLinking"];
  updateLocationAcceptance: (locationId: number, accept: boolean) => void;
  updateLocationLink: (locationId: number, linkedId: number | null) => void;
}) {
  const [locationSearchOpen, setLocationSearchOpen] = useState(false);
  const [locationOption, setLocationOption] = useState(false);
  const [locationSearchQuery, setLocationSearchQuery] = useState("");

  const sortedLocations = useMemo(() => {
    const temp = [...userLocations];
    temp.sort((a, b) => {
      if (a.name === b.name) return 0;
      if (foundLocation?.id === a.id) return -1;
      if (foundLocation?.id === b.id) return 1;
      if (a.name < b.name) return -1;
      if (a.name > b.name) return 1;
      return 0;
    });
    return temp;
  }, [foundLocation?.id, userLocations]);
  return (
    <Accordion type="multiple" className="w-full">
      <AccordionItem value={`location-${location.item.id}`}>
        <div className="flex w-full items-center justify-between pr-4">
          <AccordionTrigger className="hover:no-underline">
            <div className="flex w-full text-left">
              <span className="font-medium">{location.item.name} </span>
              <span className="font-medium text-green-600">
                {locationState.linkedId
                  ? "(Linked)"
                  : foundLocation
                    ? " (Possible Duplicate Found)"
                    : ""}
              </span>
            </div>
          </AccordionTrigger>
          <div className="flex items-center gap-2">
            <Badge
              variant={location.permission === "edit" ? "default" : "secondary"}
              className="text-xs"
            >
              {location.permission === "edit" ? "Edit" : "View"}
            </Badge>
            <div className="flex flex-col items-center justify-center gap-2 sm:flex-row">
              <Button
                type="button"
                variant={locationState.accept ? "default" : "outline"}
                size="sm"
                className="w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLocationAcceptance(locationState.sharedId, true);
                }}
              >
                <ThumbsUp className="mr-2 h-4 w-4" />
                Accept
              </Button>
              <Button
                type="button"
                variant={locationState.accept ? "outline" : "default"}
                size="sm"
                className="w-24"
                onClick={(e) => {
                  e.stopPropagation();
                  updateLocationAcceptance(locationState.sharedId, false);
                }}
              >
                <ThumbsDown className="mr-2 h-4 w-4" />
                Reject
              </Button>
            </div>
          </div>
        </div>
        <AccordionContent>
          {isAccepted ? (
            <div className="space-y-4 pb-4 pt-2">
              <div className="space-y-3">
                <Label>Link to existing location</Label>

                <RadioGroup
                  value={locationOption ? "existing" : "none"}
                  onValueChange={(value) => {
                    if (value === "none") {
                      setLocationOption(false);
                      updateLocationLink(locationState.sharedId, null);
                    } else {
                      setLocationOption(true);
                    }
                  }}
                  className="space-y-3"
                >
                  <div className="flex items-center space-x-2">
                    <RadioGroupItem
                      value="none"
                      id={`location-${location.item.id}-none`}
                    />
                    <Label htmlFor={`location-${location.item.id}-none`}>
                      Don't link (create as new location)
                    </Label>
                  </div>
                  <div className="flex items-start space-x-2">
                    <RadioGroupItem
                      value="existing"
                      id={`existing-${location.item.id}-location`}
                      className="mt-1"
                    />
                    <div className="grid w-full gap-1.5">
                      <Label
                        htmlFor={`existing-${location.item.id}-location`}
                        className="font-medium"
                      >
                        Link to an existing location
                      </Label>
                      <p className="mb-2 text-sm text-muted-foreground">
                        Connect this shared location to a location you already
                        have.
                      </p>

                      {locationOption && (
                        <Popover
                          open={locationSearchOpen}
                          onOpenChange={setLocationSearchOpen}
                        >
                          <PopoverTrigger asChild>
                            <Button
                              variant="outline"
                              role="combobox"
                              aria-expanded={locationSearchOpen}
                              className="justify-between"
                            >
                              {locationState.linkedId
                                ? userLocations.find(
                                    (existingLocation) =>
                                      existingLocation.id ===
                                      locationState.linkedId,
                                  )?.name
                                : "Select a location..."}
                              <ChevronDown className="ml-2 h-4 w-4 shrink-0 opacity-50" />
                            </Button>
                          </PopoverTrigger>
                          <PopoverContent className="w-[300px] p-0">
                            <Command>
                              <CommandInput
                                placeholder="Search locations..."
                                value={locationSearchQuery}
                                onValueChange={setLocationSearchQuery}
                              />
                              <CommandEmpty>No locations found.</CommandEmpty>
                              <CommandList>
                                <CommandGroup>
                                  {sortedLocations.map((existingLocation) => (
                                    <CommandItem
                                      key={existingLocation.id}
                                      value={existingLocation.id.toString()}
                                      onSelect={() =>
                                        updateLocationLink(
                                          locationState.sharedId,
                                          existingLocation.id,
                                        )
                                      }
                                    >
                                      <div className="flex items-center gap-2">
                                        <p>{existingLocation.name}</p>
                                        {existingLocation.name.toLowerCase() ===
                                          location.item.name.toLowerCase() && (
                                          <span className="text-xs text-green-600">
                                            (Exact match)
                                          </span>
                                        )}
                                      </div>
                                      <Check
                                        className={cn(
                                          "ml-auto h-4 w-4",
                                          locationState.linkedId ===
                                            existingLocation.id
                                            ? "opacity-100"
                                            : "opacity-0",
                                        )}
                                      />
                                    </CommandItem>
                                  ))}
                                </CommandGroup>
                              </CommandList>
                            </Command>
                          </PopoverContent>
                        </Popover>
                      )}
                    </div>
                  </div>
                </RadioGroup>
              </div>
            </div>
          ) : (
            <div className="py-4 text-center text-sm text-muted-foreground">
              This location will not be added to your collection.
            </div>
          )}
        </AccordionContent>
      </AccordionItem>
    </Accordion>
  );
}
