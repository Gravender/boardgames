import type { SharedLocationsFromSharedMatchInput } from "../shared-location.input";

export interface GetSharedLocationsWithUserArgs {
  ctx: {
    userId: string;
  };
  input: SharedLocationsFromSharedMatchInput;
}
