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
