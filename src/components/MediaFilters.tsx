import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";
import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";
import { useLocation } from "react-router-dom";

interface MediaFiltersProps {
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string[];
  onStatusFilterChange?: (value: string[]) => void;
  contentTypeFilter?: string[];
  onContentTypeFilterChange?: (value: string[]) => void;
  availableStatuses?: string[];
  availableTypes?: string[];
  shelves?: any[];
  selectedShelfId?: string;
  onShelfChange?: (value: string) => void;
  genreFilter?: string;
  onGenreFilterChange?: (value: string) => void;
  availableGenres?: string[];
  vibeFilter?: string;
  onVibeFilterChange?: (value: string) => void;
  availableVibes?: string[];
  flavorFilter?: string;
  onFlavorFilterChange?: (value: string) => void;
  availableFlavors?: string[];
}

export function MediaFilters({
  searchPlaceholder = "Search by title, platform...",
  searchQuery,
  onSearchChange,
  statusFilter = [],
  onStatusFilterChange,
  contentTypeFilter = [],
  onContentTypeFilterChange,
  availableStatuses = [],
  availableTypes = [],
  genreFilter,
  onGenreFilterChange,
  availableGenres = [],
}: MediaFiltersProps) {
  const location = useLocation();
  const pathname = location.pathname.toLowerCase();

  /**
   * Page-based content type mapping
   */
  const PAGE_TYPE_MAP: Record<string, string[]> = {
    watch: ["Film", "TV Show"],
    home: ["Film", "TV Show"],
    read: ["Audiobook"],
    listen: ["Song"],
  };

  /**
   * Determine types based on current route
   */
  const getTypesByPage = (): string[] => {
    for (const key of Object.keys(PAGE_TYPE_MAP)) {
      if (pathname.includes(key)) {
        return PAGE_TYPE_MAP[key];
      }
    }
    return availableTypes; // fallback if page not matched
  };

  const cleanTypes = getTypesByPage();

  const typeOptions: MultiSelectOption[] = cleanTypes.map((t) => ({
    label: t,
    value: t,
  }));

  const statusOptions: MultiSelectOption[] = availableStatuses.map((s) => ({
    label: s,
    value: s,
  }));

  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8 w-full">
      {/* Search */}
      <div className="relative flex-1 min-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/30 w-full"
        />
      </div>

      <div className="flex flex-wrap gap-3 items-center">        

        {/* Status Filter */}
        {onStatusFilterChange && (
          <div className="w-full sm:w-56">
            <MultiSelect
              options={statusOptions}
              selected={statusFilter}
              onChange={onStatusFilterChange}
              placeholder="All Status"
            />
          </div>
        )}

        {/* Content Type Filter */}
        {onContentTypeFilterChange && cleanTypes.length > 0 && (
          <div className="w-full sm:w-56">
            <MultiSelect
              options={typeOptions}
              selected={contentTypeFilter}
              onChange={onContentTypeFilterChange}
              placeholder="All Types"
            />
          </div>
        )}

        {/* Genre Filter */}
        {onGenreFilterChange && (
          <div className="w-full sm:w-44">
            <Select value={genreFilter} onValueChange={onGenreFilterChange}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 capitalize">
                <SelectValue placeholder="Genre" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Genres</SelectItem>
                {availableGenres.map((genre) => (
                  <SelectItem
                    key={genre}
                    value={genre}
                    className="capitalize"
                  >
                    {genre}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}
      </div>
    </div>
  );
}