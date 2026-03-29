"use client";

import { ChevronDown, ChevronUp } from "lucide-react";

export function SortIcon({
  sortOrder,
}: {
  sortOrder: "asc" | "desc" | "none";
}) {
  if (sortOrder === "none") {
    return null;
  }
  return sortOrder === "asc" ? (
    <ChevronUp className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
  ) : (
    <ChevronDown className="ml-1 h-3 w-3 sm:ml-2 sm:h-4 sm:w-4" />
  );
}
