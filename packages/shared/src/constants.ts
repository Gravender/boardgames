import type { LucideIcon } from "lucide-react";
import {
  BowArrow,
  Dice1,
  Dices,
  Flame,
  Gamepad2,
  Ghost,
  Puzzle,
  Swords,
  User,
} from "lucide-react";

export const gameIcons: { icon: LucideIcon; name: string }[] = [
  { icon: Gamepad2, name: "Gamepad" },
  { icon: Dices, name: "Dices" },
  { icon: BowArrow, name: "Bow & Arrow" },
  { icon: Dice1, name: "Dice" },
  { icon: Flame, name: "Flame" },
  { icon: Ghost, name: "Ghost" },
  { icon: Puzzle, name: "Puzzle" },
  { icon: Swords, name: "Swords" },
];

export const playerIcons: { icon: LucideIcon; name: string }[] = [
  { icon: User, name: "User" },
];
