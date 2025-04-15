interface l {
  id: number;
  name: string;
  yearPublished: number | null;
  imageUrl: string;
  ownedBy: boolean | null;
  duration: number;
  matches: {
    id: number;
    date: Date;
    location: {
      id: number;
      name: string;
    };
    won: boolean;
    name: string;
    //if null user did not play
    userPlacement: number | null;
    //if null user did not play
    userScore: number | null;
    duration: number;
    finished: boolean;
    players: {
      id: number;
      name: string;
      isWinner: boolean | null;
      placement: number;
      score: number | null;
      imageUrl: string | undefined;
      team: {
        id: number;
        name: string;
        matchId: number;
        details: string | null;
        createdAt: Date;
        updatedAt: Date | null;
      } | null;
    }[];
    winners: {
      id: number;
      name: string;
      isWinner: boolean | null;
      score: number | null;
      team: {
        id: number;
        name: string;
        matchId: number;
        details: string | null;
        createdAt: Date;
        updatedAt: Date | null;
      } | null;
    }[];
  };
  players: {
    id: number;
    name: string;
    plays: number;
    wins: number;
    winRate: number;
    imageUrl: string;
    placements: Record<number, number>;
  };
}
