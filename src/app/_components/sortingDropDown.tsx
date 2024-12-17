import { AlignLeft } from "lucide-react";

import { Button } from "~/components/ui/button";
import {
  DropdownMenu,
  DropdownMenuCheckboxItem,
  DropdownMenuContent,
  DropdownMenuTrigger,
} from "~/components/ui/dropdown-menu";

type SortingOptionsProps<T extends string> = {
  sortFields: T[];
  sortField: T;
  setSortField: (field: T) => void;
};

export function SortingOptions<T extends string>({
  sortFields,
  sortField,
  setSortField,
}: SortingOptionsProps<T>) {
  return (
    <DropdownMenu>
      <DropdownMenuTrigger asChild>
        <Button variant="ghost" size={"icon"}>
          <span className="sr-only">Open menu</span>
          <AlignLeft />
        </Button>
      </DropdownMenuTrigger>
      <DropdownMenuContent align="end">
        {sortFields.map((field) => {
          return (
            <DropdownMenuCheckboxItem
              key={field}
              onClick={() => setSortField(field)}
              checked={sortField === field}
            >
              {field}
            </DropdownMenuCheckboxItem>
          );
        })}
      </DropdownMenuContent>
    </DropdownMenu>
  );
}
