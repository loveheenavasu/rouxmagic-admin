import { Input } from "@/components/ui/input";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";
import { Search } from "lucide-react";

interface MediaFiltersProps {
  searchPlaceholder?: string;
  searchQuery: string;
  onSearchChange: (value: string) => void;
  statusFilter?: string;
  onStatusFilterChange?: (value: string) => void;
  contentTypeFilter?: string;
  onContentTypeFilterChange?: (value: string) => void;
  availableStatuses?: string[];
  availableTypes?: string[];
  shelves?: any[];
  selectedShelfId?: string;
  onShelfChange?: (value: string) => void;
}

export function MediaFilters({
  searchPlaceholder = "Search by title, platform...",
  searchQuery,
  onSearchChange,
  statusFilter,
  onStatusFilterChange,
  contentTypeFilter,
  onContentTypeFilterChange,
  availableStatuses = [],
  availableTypes = [],
  shelves = [],
  selectedShelfId,
  onShelfChange,
}: MediaFiltersProps) {
  return (
    <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8 w-full">
      <div className="relative flex-1 min-w-[300px]">
        <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
        <Input
          placeholder={searchPlaceholder}
          value={searchQuery}
          onChange={(e) => onSearchChange(e.target.value)}
          className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/30 w-full"
        />
      </div>

      <div className="flex flex-wrap gap-3">
        {onShelfChange && shelves.length > 0 && (
          <div className="w-full sm:w-48">
            <Select value={selectedShelfId} onValueChange={onShelfChange}>
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30">
                <SelectValue placeholder="Filter by Shelf" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Items</SelectItem>
                {shelves.map((shelf) => (
                  <SelectItem key={shelf.id} value={shelf.id}>
                    {shelf.label}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {onStatusFilterChange && (
          <div className="w-full sm:w-44">
            <Select
              value={statusFilter}
              onValueChange={onStatusFilterChange}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 capitalize">
                <SelectValue placeholder="All Status" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Status</SelectItem>
                {availableStatuses.map((status) => (
                  <SelectItem
                    key={status}
                    value={status}
                    className="capitalize"
                  >
                    {status}
                  </SelectItem>
                ))}
              </SelectContent>
            </Select>
          </div>
        )}

        {onContentTypeFilterChange && (
          <div className="w-full sm:w-44">
            <Select
              value={contentTypeFilter}
              onValueChange={onContentTypeFilterChange}
            >
              <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 capitalize">
                <SelectValue placeholder="All Types" />
              </SelectTrigger>
              <SelectContent>
                <SelectItem value="all">All Types</SelectItem>
                {availableTypes.map((type) => (
                  <SelectItem
                    key={type}
                    value={type}
                    className="capitalize"
                  >
                    {type}
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
