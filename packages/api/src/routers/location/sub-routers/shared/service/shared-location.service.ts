import type { GetSharedLocationsFromSharedMatchOutputType } from "../shared-location.output";
import type { GetSharedLocationsWithUserArgs } from "./shared-location.service.types";
import { sharedLocationRepository } from "../repository/shared-location.repository";

class SharedLocationService {
  public async getSharedLocationsFromSharedMatch(
    args: GetSharedLocationsWithUserArgs,
  ): Promise<GetSharedLocationsFromSharedMatchOutputType> {
    const response =
      await sharedLocationRepository.getSharedLocationsFromSharedMatch({
        input: args.input,
        userId: args.ctx.userId,
      });

    const locations = response.locations
      .map((sharedLocation) => ({
        type: "shared" as const,
        sharedId: sharedLocation.id,
        name: sharedLocation.location.name,
        isDefault: sharedLocation.isDefault,
        permission: sharedLocation.permission,
      }))
      .toSorted((a, b) => {
        if (a.isDefault && !b.isDefault) return -1;
        if (!a.isDefault && b.isDefault) return 1;
        return a.name.localeCompare(b.name);
      });

    return {
      locations,
    };
  }
}

export const sharedLocationService = new SharedLocationService();
