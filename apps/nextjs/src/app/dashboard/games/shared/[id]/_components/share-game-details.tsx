"use client";

import { EyeIcon, PencilIcon } from "lucide-react";

import { Badge } from "@board-games/ui/badge";

import GameDetail from "~/components/game/detail";

export default function SharedGameDetails({ gameId }: { gameId: number }) {
  return <GameDetail gameId={gameId} type="shared" sharedGameId={gameId} />;
}
