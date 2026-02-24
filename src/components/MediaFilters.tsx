// import { Input } from "@/components/ui/input";
// import {
//   Select,
//   SelectContent,
//   SelectItem,
//   SelectTrigger,
//   SelectValue,
// } from "@/components/ui/select";
// import { Search } from "lucide-react";
// import { MultiSelect, MultiSelectOption } from "@/components/ui/multi-select";

// interface MediaFiltersProps {
//   searchPlaceholder?: string;
//   searchQuery: string;
//   onSearchChange: (value: string) => void;
//   statusFilter?: string[];
//   onStatusFilterChange?: (value: string[]) => void;
//   contentTypeFilter?: string[];
//   onContentTypeFilterChange?: (value: string[]) => void;
//   availableStatuses?: string[];
//   availableTypes?: string[];
//   shelves?: any[];
//   selectedShelfId?: string;
//   onShelfChange?: (value: string) => void;
//   genreFilter?: string;
//   onGenreFilterChange?: (value: string) => void;
//   availableGenres?: string[];
//   vibeFilter?: string;
//   onVibeFilterChange?: (value: string) => void;
//   availableVibes?: string[];
//   flavorFilter?: string;
//   onFlavorFilterChange?: (value: string) => void;
//   availableFlavors?: string[];
// }

// export function MediaFilters({
//   searchPlaceholder = "Search by title, platform...",
//   searchQuery,
//   onSearchChange,
//   statusFilter = [],
//   onStatusFilterChange,
//   contentTypeFilter = [],
//   onContentTypeFilterChange,
//   availableStatuses = [],
//   availableTypes = [],
//   shelves = [],
//   selectedShelfId,
//   onShelfChange,
//   genreFilter,
//   onGenreFilterChange,
//   availableGenres = [],
// }: MediaFiltersProps) {
//   // Helper to extract clean values from potentially JSON-stringified types
//   const extractCleanTypes = (types: string[]): string[] => {
//     const typesSet = new Set<string>();

//     const extract = (value: any) => {
//       if (!value) return;
//       if (Array.isArray(value)) {
//         value.forEach(extract);
//         return;
//       }
//       if (typeof value === "string") {
//         const trimmed = value.trim();
//         if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
//           try {
//             const parsed = JSON.parse(trimmed);
//             extract(parsed);
//           } catch {
//             typesSet.add(trimmed);
//           }
//         } else {
//           typesSet.add(trimmed);
//         }
//       }
//     };

//     types.forEach(extract);
//     return Array.from(typesSet).sort();
//   };

//   const cleanTypes = extractCleanTypes(availableTypes);
//   const typeOptions: MultiSelectOption[] = cleanTypes.map(t => ({ label: t, value: t }));
//   const statusOptions: MultiSelectOption[] = availableStatuses.map(s => ({ label: s, value: s }));

//   return (
//     <div className="flex flex-col lg:flex-row items-stretch lg:items-center gap-4 mb-8 w-full">
//       <div className="relative flex-1 min-w-[300px]">
//         <Search className="absolute left-3 top-1/2 -translate-y-1/2 h-4 w-4 text-slate-400" />
//         <Input
//           placeholder={searchPlaceholder}
//           value={searchQuery}
//           onChange={(e) => onSearchChange(e.target.value)}
//           className="pl-10 h-11 border-slate-200 rounded-xl focus:ring-indigo-500 focus:border-indigo-500 bg-slate-50/30 w-full"
//         />
//       </div>

//       <div className="flex flex-wrap gap-3 items-center">
//         {onShelfChange && shelves.length > 0 && (
//           <div className="w-full sm:w-48">
//             <Select value={selectedShelfId} onValueChange={onShelfChange}>
//               <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30">
//                 <SelectValue placeholder="Filter by Shelf" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Items</SelectItem>
//                 {shelves.map((shelf) => (
//                   <SelectItem key={shelf.id} value={shelf.id}>
//                     {shelf.label}
//                   </SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         )}

//         {onStatusFilterChange && (
//           <div className="w-full sm:w-56">
//             <MultiSelect
//               options={statusOptions}
//               selected={statusFilter}
//               onChange={onStatusFilterChange}
//               placeholder="All Status"
//             />
//           </div>
//         )}

//         {onContentTypeFilterChange && (
//           <div className="w-full sm:w-56">
//             <MultiSelect
//               options={typeOptions}
//               selected={contentTypeFilter}
//               onChange={onContentTypeFilterChange}
//               placeholder="All Types"
//             />
//           </div>
//         )}

//         {onGenreFilterChange && (
//           <div className="w-full sm:w-44">
//             <Select value={genreFilter} onValueChange={onGenreFilterChange}>
//               <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30 capitalize">
//                 <SelectValue placeholder="Genre" />
//               </SelectTrigger>
//               <SelectContent>
//                 <SelectItem value="all">All Genres</SelectItem>
//                 {availableGenres.map((genre) => (
//                   <SelectItem key={genre} value={genre} className="capitalize">{genre}</SelectItem>
//                 ))}
//               </SelectContent>
//             </Select>
//           </div>
//         )}
//       </div>
//     </div>
//   );
// }


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
  shelves = [],
  selectedShelfId,
  onShelfChange,
  genreFilter,
  onGenreFilterChange,
  availableGenres = [],
  vibeFilter: _vibeFilter,
  onVibeFilterChange: _onVibeFilterChange,
  availableVibes: _availableVibes = [],
  flavorFilter: _flavorFilter,
  onFlavorFilterChange: _onFlavorFilterChange,
  availableFlavors: _availableFlavors = [],
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