"use client";

import { useCallback, useRef, useState } from "react";
import { ArrowDown, ArrowUp, ArrowUpDown } from "lucide-react";

import { TableHead } from "@board-games/ui/table";
import { cn } from "@board-games/ui/utils";

/**
 * Sortable column header for data tables. Click toggles direction when the same
 * column stays active; switching columns applies a sensible default direction.
 */
export function useSortableTableState<K extends string>(
  defaultKey: K,
  options?: {
    defaultDir?: "asc" | "desc";
    /** Columns that should default to ascending when first selected (e.g. name). */
    textAscendingKeys?: readonly K[];
  },
) {
  const defaultDir = options?.defaultDir ?? "desc";
  const optionsRef = useRef(options);
  optionsRef.current = options;

  const [sortKey, setSortKey] = useState<K>(defaultKey);
  const [sortDir, setSortDir] = useState<"asc" | "desc">(defaultDir);

  const onSort = useCallback(
    (key: K) => {
      if (key === sortKey) {
        setSortDir((d) => (d === "asc" ? "desc" : "asc"));
        return;
      }
      setSortKey(key);
      const textKeys = optionsRef.current?.textAscendingKeys ?? [];
      const textDefault = textKeys.includes(key);
      setSortDir(textDefault ? "asc" : "desc");
    },
    [sortKey],
  );

  return { sortKey, sortDir, onSort };
}

export function SortableTableHead<K extends string>({
  label,
  columnKey,
  sortKey,
  sortDir,
  onSort,
  className,
  align = "left",
}: {
  label: string;
  columnKey: K;
  sortKey: K;
  sortDir: "asc" | "desc";
  onSort: (key: K) => void;
  className?: string;
  align?: "left" | "right" | "center";
}) {
  const isActive = sortKey === columnKey;
  const SortIcon = isActive
    ? sortDir === "asc"
      ? ArrowUp
      : ArrowDown
    : ArrowUpDown;

  const handleClick = () => {
    onSort(columnKey);
  };

  const handleKeyDown = (e: React.KeyboardEvent) => {
    if (e.key === "Enter" || e.key === " ") {
      e.preventDefault();
      onSort(columnKey);
    }
  };

  const alignClass =
    align === "right"
      ? "justify-end"
      : align === "center"
        ? "justify-center"
        : "justify-start";

  return (
    <TableHead
      className={cn(
        align === "right" && "text-right",
        align === "center" && "text-center",
        className,
      )}
    >
      <button
        type="button"
        onClick={handleClick}
        onKeyDown={handleKeyDown}
        className={cn(
          "hover:text-foreground inline-flex w-full items-center gap-1 rounded-sm",
          alignClass,
          isActive ? "text-foreground" : "text-muted-foreground",
        )}
        aria-label={`Sort by ${label}${isActive ? `, ${sortDir === "asc" ? "ascending" : "descending"}` : ""}`}
        tabIndex={0}
      >
        <span>{label}</span>
        <SortIcon className="h-3.5 w-3.5 shrink-0" aria-hidden />
      </button>
    </TableHead>
  );
}
