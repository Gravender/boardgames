type Role =
  | { id: number; type: "original" }
  | { sharedId: number; type: "shared" };
export const isSameRole = (a: Role, b: Role) => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === a.type && a.sharedId === b.sharedId;
};

type MatchPlayer =
  | {
      type: "original";
      id: number;
    }
  | {
      type: "shared";
      sharedMatchPlayerId: number;
    };
export const isSameMatchPlayer = (a: MatchPlayer, b: MatchPlayer) => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === a.type && a.sharedMatchPlayerId === b.sharedMatchPlayerId;
};

type Player =
  | {
      id: number;
      type: "original";
    }
  | {
      sharedId: number;
      type: "shared";
    };
export const isSamePlayer = (a: Player, b: Player) => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === a.type && a.sharedId === b.sharedId;
};
type Location =
  | {
      id: number;
      type: "original";
    }
  | {
      sharedId: number;
      type: "shared";
    };
export const isSameLocation = (a: Location, b: Location) => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === a.type && a.sharedId === b.sharedId;
};

type Scoresheet =
  | { type: "original"; id: number }
  | { type: "shared"; sharedId: number };

export const isSameScoresheet = (a: Scoresheet, b: Scoresheet): boolean => {
  if (a.type === "original") {
    return b.type === "original" && a.id === b.id;
  }
  return b.type === "shared" && a.sharedId === b.sharedId;
};
