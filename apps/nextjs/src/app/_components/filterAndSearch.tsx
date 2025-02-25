import { useEffect, useMemo, useState } from "react";
import { AlignLeft, ChevronDown, ChevronUp, Search } from "lucide-react";

import { Button } from "@board-games/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "@board-games/ui/dropdown-menu";
import { Input } from "@board-games/ui/input";

type SortOrder = "asc" | "desc";

export function FilterAndSearch<T>({
  items,
  setItems,
  sortFields,
  defaultSortField,
  defaultSortOrder = "desc",
  searchField = undefined,
  searchPlaceholder = "Search items...",
}: {
  items: T[];
  setItems: (items: T[]) => void;
  sortFields: (keyof T)[];
  defaultSortField: keyof T | { primary: keyof T; fallback: keyof T };
  defaultSortOrder: SortOrder;
  searchField: keyof T | undefined;
  searchPlaceholder: string | undefined;
}) {
  const [search, setSearch] = useState("");
  const [sortField, setSortField] = useState(defaultSortField);
  const [sortOrder, setSortOrder] = useState<SortOrder>(defaultSortOrder);

  const getSortValue = (
    item: T,
    field: keyof T | { primary: keyof T; fallback: keyof T },
  ) => {
    if (typeof field === "object") {
      // If primary field is null/undefined, use fallback
      return item[field.primary] ?? item[field.fallback];
    }
    return item[field];
  };

  const compareValues = (a: T[keyof T], b: T[keyof T]): number => {
    if (a == null && b == null) return 0;
    if (a == null) return sortOrder === "asc" ? -1 : 1;
    if (b == null) return sortOrder === "asc" ? 1 : -1;

    if (typeof a === "number" && typeof b === "number") return a - b;
    if (a instanceof Date && b instanceof Date)
      return a.getTime() - b.getTime();

    return String(a).localeCompare(String(b));
  };

  const filteredAndSortedItems = useMemo(() => {
    let filtered = [...items];
    if (searchField && search) {
      filtered = filtered.filter((item) => {
        const value = item[searchField];
        return typeof value === "string"
          ? value.toLowerCase().includes(search.toLowerCase())
          : false;
      });
    }

    filtered.sort((a, b) => {
      const valueA = getSortValue(a, sortField);
      const valueB = getSortValue(b, sortField);

      return compareValues(valueA, valueB) * (sortOrder === "asc" ? 1 : -1);
    });

    return filtered;
  }, [items, search, searchField, sortField, sortOrder]);

  // Update parent state only when filteredAndSortedItems change
  useEffect(() => {
    setItems(filteredAndSortedItems);
  }, [filteredAndSortedItems, setItems]);

  return (
    <div className="mb-4 flex items-center justify-between gap-2 px-4">
      <div className="flex w-full max-w-sm items-center gap-2">
        <Search className="h-4 w-4" />
        <Input
          placeholder={searchPlaceholder}
          value={search}
          onChange={(e) => setSearch(e.target.value)}
          className="max-w-sm"
        />
      </div>
      <div className="flex items-center gap-2">
        <Button
          size="icon"
          variant="ghost"
          aria-label="Toggle sort order"
          onClick={() => setSortOrder(sortOrder === "asc" ? "desc" : "asc")}
        >
          {sortOrder === "asc" ? (
            <ChevronUp className="h-4 w-4" />
          ) : (
            <ChevronDown className="h-4 w-4" />
          )}
        </Button>
        <SortingOptions
          sortFields={sortFields}
          sortField={
            typeof sortField === "object" ? sortField.primary : sortField
          }
          setSortField={setSortField}
        />
      </div>
    </div>
  );
}

function SortingOptions<T>({
  sortField,
  sortFields,
  setSortField,
}: {
  sortField: keyof T;
  sortFields: (keyof T)[];
  setSortField: (field: keyof T) => void;
}) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"icon"} aria-label="Sorting options">
          <AlignLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortFields.map((field) => (
          <DropdownMenuCheckboxItem
            key={String(field)}
            onClick={() => setSortField(field)}
            checked={sortField === field}
          >
            {String(field)}
          </DropdownMenuCheckboxItem>
        ))}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
