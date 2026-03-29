export type LocationDetailInput =
  | { type: "original"; id: number }
  | { type: "shared"; sharedId: number };
