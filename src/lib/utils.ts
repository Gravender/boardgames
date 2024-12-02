import { clsx, type ClassValue } from "clsx";
import { twMerge } from "tailwind-merge";

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs));
}
export function CapitalizeFirstLetterOfEachWord(str: string) {
  return str.replace(/(?:^|\s)\w/g, (match) => match.toUpperCase());
}
