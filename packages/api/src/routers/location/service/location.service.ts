import type { GetLocationsOutputType } from "../location.output";
import type { GetLocationsArgs } from "./location.service.types";
import { locationRepository } from "../repository/location.repository";

class LocationService {
  public async getLocations(
    args: GetLocationsArgs,
  ): Promise<GetLocationsOutputType> {
    const response = await locationRepository.getLocations({
      userId: args.ctx.userId,
    });

    const originalLocations = response.originalLocations.map((location) => ({
      type: "original" as const,
      ...location,
      matches: location.matches.length + location.sharedMatches.length,
    }));

    const sharedLocations = response.sharedLocations.map((sharedLocation) => ({
      type: "shared" as const,
      sharedId: sharedLocation.id,
      name: sharedLocation.location.name,
      isDefault: sharedLocation.isDefault,
      permission: sharedLocation.permission,
      matches: sharedLocation.sharedMatches.length,
    }));
    const combinedLocations = [...originalLocations, ...sharedLocations];
    combinedLocations.sort((a, b) => {
      if (a.isDefault && !b.isDefault) return -1;
      if (!a.isDefault && b.isDefault) return 1;
      return a.name.localeCompare(b.name);
    });

    return combinedLocations;
  }
}

export const locationService = new LocationService();
