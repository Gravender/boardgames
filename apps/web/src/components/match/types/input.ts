export type MatchInput =
  | { type: "shared"; sharedMatchId: number }
  | { type: "original"; id: number };
export type GameInput =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedGameId: number;
    };
export type GameAndMatchInput =
  | {
      type: "shared";
      game: {
        type: "shared" | "linked";
        sharedGameId: number;
        linkedGameId: number | null;
      };
      match: {
        type: "shared";
        sharedMatchId: number;
      };
    }
  | {
      type: "original";
      game: {
        type: "original";
        id: number;
      };
      match: {
        type: "original";
        id: number;
      };
    };
