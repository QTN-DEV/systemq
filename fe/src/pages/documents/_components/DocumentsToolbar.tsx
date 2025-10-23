import { Search as SearchIcon, X as XIcon } from "lucide-react";

import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Tabs, TabsList, TabsTrigger } from "@/components/ui/tabs";

interface DocumentsToolbarProps {
  categories: string[];
  activeFilter: string;
  onFilterChange: (filter: string) => void;
  globalQuery: string;
  onQueryChange: (query: string) => void;
  onClearQuery: () => void;
}

export function DocumentsToolbar({
  categories,
  activeFilter,
  onFilterChange,
  globalQuery,
  onQueryChange,
  onClearQuery,
}: DocumentsToolbarProps) {
  return (
    <div className="flex items-center justify-between border-b mb-4 pb-4">
      <Tabs value={activeFilter} onValueChange={onFilterChange}>
        <TabsList>
          {categories.map((category) => (
            <TabsTrigger key={category} value={category}>
              {category}
            </TabsTrigger>
          ))}
        </TabsList>
      </Tabs>

      <div className="relative ml-4">
        <SearchIcon className="absolute left-3 top-1/2 -translate-y-1/2 w-4 h-4 text-muted-foreground" />
        <Input
          value={globalQuery}
          onChange={(e) => onQueryChange(e.target.value)}
          placeholder="Search"
          className="w-[260px] pl-9 pr-9"
        />
        {globalQuery && (
          <Button
            variant="ghost"
            size="icon-sm"
            onClick={onClearQuery}
            className="absolute right-2 top-1/2 -translate-y-1/2"
            aria-label="Clear search"
          >
            <XIcon className="w-4 h-4" />
          </Button>
        )}
      </div>
    </div>
  );
}
