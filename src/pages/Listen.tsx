import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import { Edit, Trash2, Loader2, Pin, PinOff } from "lucide-react";
import { Badge } from "@/components/ui/badge";
import MediaDialog from "@/components/MediaDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { ContentTypeEnum, Flag, Project, ContentRow, FilterTypeEnum } from "@/types";
import { toast } from "sonner";
import { Songs } from "@/api";
import { MediaFilters } from "@/components/MediaFilters";
import { StatsRow } from "@/components/StatsRow";

// Type assertion to ensure Songs methods are available
const songsAPI = Songs as Required<typeof Songs>;

import { cn, smartParse } from "@/lib/utils";

export default function ListenPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [vibeFilter, setVibeFilter] = useState<string>("all");
  const [selectedShelfId, setSelectedShelfId] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>(["actions", "title"]); const toggleSticky = (key: string) => {
    setStickyColumns((prev) => {
      if (prev.includes(key)) {
        return prev.filter((col) => col !== key);
      }
      if (prev.length >= 2) {
        toast.info("Maximum 2 columns can be pinned");
        return prev;
      }
      return [...prev, key];
    });
  };

  const PINNED_WIDTH = 200;
  const COLUMN_WIDTHS: Record<string, number> = {
    actions: PINNED_WIDTH,
    title: PINNED_WIDTH,
    content_type: 150,
    status: 150,
    platform: 150,
    release_year: 120,
    runtime_minutes: 150,
    notes: 300,
  };

  // Calculate left offset for sticky columns
  const getStickyOffset = (columnKey: string): number => {
    const index = stickyColumns.indexOf(columnKey);
    if (index === -1) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += PINNED_WIDTH;
    }
    return offset;
  };

  const queryClient = useQueryClient();

  const { data: shelves = [] } = useQuery({
    queryKey: ["content-rows", "listen"],
    queryFn: async () => {
      const { ContentRows } = await import("@/api/integrations/supabase/content_rows/content_rows");
      const resp = await (ContentRows as any).get({ eq: [{ key: "page", value: "listen" }, { key: "is_active", value: true }] });
      return Array.isArray(resp.data) ? resp.data as ContentRow[] : [];
    }
  });

  // Fetch all media
  const {
    data: mediaList = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["media", searchQuery, statusFilter, genreFilter, vibeFilter, selectedShelfId, contentTypeFilter],
    queryFn: async () => {
      const eqFilters: any[] = [];
      const containsFilters: any[] = [];
      const overlapsFilters: any[] = [];
      const ilikeFilters: any[] = [];
      let shelfOr: string | undefined = undefined;

      if (statusFilter.length > 0) {
        overlapsFilters.push({ key: "status", value: statusFilter });
      }

      // Apply shelf filter logic
      if (selectedShelfId !== "all") {
        const shelf = shelves.find(s => s.id === selectedShelfId);
        if (shelf) {
          if (shelf.filter_type === FilterTypeEnum.Flag) {
            const knownFlags = ['in_now_playing', 'in_coming_soon', 'in_latest_releases', 'in_hero_carousel', 'featured', 'is_downloadable'];
            const flagExists = knownFlags.includes(shelf.filter_value.toLowerCase());

            if (flagExists) {
              eqFilters.push({ key: shelf.filter_value, value: true });
            }
          } else if (shelf.filter_type === FilterTypeEnum.Audiobook) {
            ilikeFilters.push({ key: "content_type", value: "%Audiobook%" });
          } else if (shelf.filter_type === FilterTypeEnum.Song) {
            ilikeFilters.push({ key: "content_type", value: "%Song%" });
          } else if (shelf.filter_type === FilterTypeEnum.Status || shelf.filter_type === FilterTypeEnum.ContentType) {
            const isStatus = shelf.filter_type === FilterTypeEnum.Status;
            if (shelf.filter_value.includes(",")) {
              const values = shelf.filter_value.split(",").map(v => v.trim());
              if (isStatus) {
                overlapsFilters.push({ key: "status", value: values });
              } else {
                shelfOr = values.map(v => `content_type.ilike.%${v}%`).join(",");
              }
            } else {
              if (isStatus) {
                containsFilters.push({ key: "status", value: [shelf.filter_value] });
              } else {
                ilikeFilters.push({ key: "content_type", value: `%${shelf.filter_value}%` });
              }
            }
          } else if (shelf.filter_type === FilterTypeEnum.Genre) {
            containsFilters.push({ key: "genres", value: [shelf.filter_value] });
          } else if (shelf.filter_type === FilterTypeEnum.VibeTags) {
            containsFilters.push({ key: "vibe_tags", value: [shelf.filter_value] });
          }
        }
      }

      if (contentTypeFilter.length > 0) {
        const contentTypePatterns = contentTypeFilter.map(t => `content_type.ilike.%${t}%`).join(",");
        if (shelfOr) {
          shelfOr = `and(or(${shelfOr}),or(${contentTypePatterns}))`;
        } else {
          shelfOr = contentTypePatterns;
        }
      }

      // Apply base content type restriction for Listen page - ONLY Songs
      const pageFilterOr = `content_type.ilike.%${ContentTypeEnum.Song}%`;
      const visibilityFilter = "is_deleted.eq.false,is_deleted.is.null";

      let finalOr = shelfOr;

      if (finalOr) {
        finalOr = `and(or(${finalOr}),or(${pageFilterOr}),or(${visibilityFilter}))`;
      } else {
        finalOr = `and(or(${pageFilterOr}),or(${visibilityFilter}))`;
      }

      const response = await songsAPI.get({
        eq: eqFilters as any,
        contains: containsFilters.length > 0 ? containsFilters : undefined,
        overlaps: overlapsFilters.length > 0 ? overlapsFilters : undefined,
        ilike: ilikeFilters.length > 0 ? ilikeFilters : undefined,
        or: finalOr,
        sort: "created_at",
        sortBy: "dec",
        search: searchQuery || undefined,
        searchFields: ["title", "content_type"],
      });

      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        const supabaseError = response.error?.output as any;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch media";
        throw new Error(errorMessage);
      }

      let data = Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as Project[]);

      // Apply Genre filter
      if (genreFilter !== "all") {
        data = data.filter((r: Project) => {
          const gData = r.genres;
          const genres = Array.isArray(gData) ? gData : [];
          return genres.some((g: string) => g.trim().toLowerCase() === genreFilter.toLowerCase());
        });
      }

      // Apply Vibe filter
      if (vibeFilter !== "all") {
        data = data.filter((r: Project) => {
          const vData = r.vibe_tags;
          const vibes = Array.isArray(vData) ? vData : [];
          return vibes.some((v: string) => v.trim().toLowerCase() === vibeFilter.toLowerCase());
        });
      }
      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await songsAPI.createOne(data);
      console.log("response::::::", response);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(response.error?.message || "Failed to create media");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setIsMediaDialogOpen(false);
      toast.success("Media created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create media: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await songsAPI.updateOneByID(id, data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        throw new Error(response.error?.message || "Failed to update media");
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Media updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update media: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await songsAPI.toogleSoftDeleteOneByID(id, true);
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error(response.error?.message || "Failed to delete media");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Media deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete media: ${error.message}`);
    },
  });

  const filteredMedia = mediaList;

  const displayFields = Array.from(new Set([
    ...(mediaList.length > 0 ? Object.keys(mediaList[0]) : []),
    "genres",
    "vibe_tags"
  ])).filter((key) => key !== "id");

  const allAvailableFields = Array.from(new Set(["actions", ...displayFields]));
  const orderedFields = [
    ...allAvailableFields.filter(key => stickyColumns.includes(key)),
    ...allAvailableFields.filter(key => !stickyColumns.includes(key))
  ];

  // Fetch unique statuses for filters (global, not affected by current filter)
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ["listen-statuses"],
    queryFn: async () => {
      const response = await songsAPI.get({
        eq: [{ key: "is_deleted" as any, value: false }],
        inValue: { key: "content_type" as any, value: [ContentTypeEnum.Song] }
      });
      if (response.flag === Flag.Success && Array.isArray(response.data)) {
        const statuses = (response.data as Project[])
          .flatMap((item) => smartParse(item.status))
          .filter(Boolean);
        return [...new Set(statuses)].sort();
      }
      return [];
    },
  });

  const { data: availableGenres = [] } = useQuery<string[]>({
    queryKey: ["listen-genres"],
    queryFn: async () => {
      const response = await songsAPI.get({
        eq: [{ key: "is_deleted" as any, value: false }],
        inValue: { key: "content_type" as any, value: [ContentTypeEnum.Song] }
      });
      if (response.flag === Flag.Success && Array.isArray(response.data)) {
        const genres = (response.data as Project[]).flatMap(p => smartParse(p.genres));
        return Array.from(new Set(genres)).filter(Boolean).sort();
      }
      return [];
    }
  });

  const { data: availableVibes = [] } = useQuery<string[]>({
    queryKey: ["listen-vibes"],
    queryFn: async () => {
      const response = await songsAPI.get({
        eq: [{ key: "is_deleted" as any, value: false }],
        inValue: { key: "content_type" as any, value: [ContentTypeEnum.Song] }
      });
      if (response.flag === Flag.Success && Array.isArray(response.data)) {
        const vibes = (response.data as Project[]).flatMap(p => smartParse(p.vibe_tags));
        return Array.from(new Set(vibes)).filter(Boolean).sort();
      }
      return [];
    }
  });


  // Fetch unique types for filters (global, not affected by current filter)
  const { data: availableTypes = [] } = useQuery({
    queryKey: ["listen-unique-types"],
    queryFn: async () => {
      const response = await songsAPI.get({ eq: [] });

      if (response.flag !== Flag.Success || !response.data) {
        return [];
      }

      const typesSet = new Set<string>();
      const extractValues = (value: any): string[] => {
        if (!value) return [];
        if (Array.isArray(value)) return value.flatMap(extractValues);
        if (typeof value === "string") {
          const trimmed = value.trim();
          try {
            const parsed = JSON.parse(trimmed);
            if (parsed !== trimmed) return extractValues(parsed);
          } catch { }
          return [trimmed];
        }
        return [];
      };

      (response.data as Project[]).forEach((item) => {
        const cleanValues = extractValues(item.content_type);
        cleanValues.forEach((val) => {
          if (typeof val === "string" && val.trim()) typesSet.add(val.trim());
        });
      });

      return Array.from(typesSet).sort((a, b) => a.localeCompare(b));
    },
  });

  const handleAddNew = () => {
    setSelectedMedia(null);
    setIsMediaDialogOpen(true);
  };

  const handleEdit = (media: Project) => {
    setSelectedMedia(media);
    setSelectedRowId(media.id);
    setIsMediaDialogOpen(true);
  };

  const handleDelete = (media: Project) => {
    setMediaToDelete(media);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedMedia) {
      await updateMutation.mutateAsync({ id: selectedMedia.id!, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const carouselAllowedFields = [
    "title",
    "content_type",
    "creators",
    "poster_url",
    "runtime_minutes",

    // Playback
    "preview_url",
    "preview_type",
    "audio_url",
    "audio_path",

    // Metadata / feeds
    "slug",
    "platform_name",
    "genres",
    "vibe_tags",
    "flavor_tags",
    "status",
    "release_status",
    "in_now_playing",
    "in_coming_soon",
    "in_latest_releases",
    "release_date",
    "order_index",
    "created_at",
  ];
  const confirmDelete = async () => {
    if (mediaToDelete) {
      await deleteMutation.mutateAsync(mediaToDelete.id);
    }
  };

  // Calculate stats
  const totalSongs = mediaList.filter((m) => m.content_type === "Song").length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Error Loading Media
          </h2>
          <p className="text-muted-foreground">{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-6">
      <StatsRow
        items={[
          { label: "Total Items", value: mediaList?.length },
          { label: "Songs", value: totalSongs },
        ]}
        title="Listen Library"
        description="Manage songs and audiobooks in your catalog"
        handleNew={handleAddNew}
      />

      {/* Search and Filter Section */}

      <div className="flex flex-col lg:flex-row gap-4">
        <MediaFilters
          searchPlaceholder="Search by title..."
          searchQuery={searchQuery}
          onSearchChange={setSearchQuery}
          statusFilter={statusFilter}
          onStatusFilterChange={setStatusFilter}
          contentTypeFilter={contentTypeFilter}
          onContentTypeFilterChange={setContentTypeFilter}
          availableStatuses={availableStatuses}
          availableTypes={availableTypes}
          shelves={shelves}
          selectedShelfId={selectedShelfId}
          onShelfChange={setSelectedShelfId}
          genreFilter={genreFilter}
          onGenreFilterChange={setGenreFilter}
          availableGenres={availableGenres}
          vibeFilter={vibeFilter}
          onVibeFilterChange={setVibeFilter}
          availableVibes={availableVibes}
        />
      </div>
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
            <TableRow>
              {orderedFields.map((key) => (
                <TableHead
                  key={key}
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-4 whitespace-nowrap group"
                  sticky={stickyColumns.includes(key) ? "left" : undefined}
                  left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                  width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                  showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
                >
                  <div className="flex items-center gap-2">
                    {key === "actions" ? "Actions" : key.replace(/_/g, " ")}
                    <Button
                      variant="ghost"
                      size="icon"
                      className={`h-4 w-4 transition-opacity ${stickyColumns.includes(key) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                      onClick={() => toggleSticky(key)}
                    >
                      {stickyColumns.includes(key) ? (
                        <PinOff className="h-3 w-3" />
                      ) : (
                        <Pin className="h-3 w-3" />
                      )}
                    </Button>
                  </div>
                </TableHead>
              ))}
            </TableRow>
          </TableHeader>
          <TableBody>
            {isLoading ? (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="text-center py-8"
                >
                  <Loader2 className="h-8 w-8 animate-spin mx-auto text-muted-foreground" />
                </TableCell>
              </TableRow>
            ) : !!filteredMedia?.length ? (
              [...filteredMedia].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((media) => {
                const isSelected = selectedRowId === media.id;
                return (
                  <TableRow
                    key={media.id}
                    className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50"
                      }`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRowId(null);
                      } else {
                        setSelectedRowId(media.id);
                      }
                    }}
                    data-state={isSelected ? "selected" : undefined}
                  >
                    {orderedFields.map((key) => {
                      if (key === "actions") {
                        return (
                          <TableCell
                            key="actions"
                            className="whitespace-nowrap"
                            sticky={stickyColumns.includes("actions") ? "left" : undefined}
                            left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                            width={PINNED_WIDTH}
                            showShadow={stickyColumns.indexOf("actions") === stickyColumns.length - 1}
                          >
                            <div className="flex gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(media);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(media);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        );
                      }

                      const value = media[key as keyof Project];
                      return (
                        <TableCell
                          key={key}
                          className={cn(
                            "group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
                            (key === "notes" || key === "description") ? "max-w-[300px]" : "max-w-[250px]"
                          )}
                          sticky={stickyColumns.includes(key) ? "left" : undefined}
                          left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                          width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                          showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
                        >
                          {value === null || value === undefined || value === "" ? (
                            <span className="text-muted-foreground text-xs">—</span>
                          ) : (
                            (() => {
                              let values = smartParse(value);

                              // Capitalize and format for display
                              values = values.map((v) => {
                                if (!v) return v;
                                const s = String(v).replace(/_/g, " ");
                                return s.charAt(0).toUpperCase() + s.slice(1);
                              });

                              if (["content_type", "status", "genres", "vibe_tags"].includes(key)) {
                                const MAX_TAGS = 3;
                                const visible = values.slice(0, MAX_TAGS);
                                const overflow = values.length - MAX_TAGS;
                                return (
                                  <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                                    {visible.map((v, i) => (
                                      <Badge
                                        key={`${v}-${i}`}
                                        variant={key === "vibe_tags" ? "outline" : "secondary"}
                                        className={cn(
                                          "text-[10px] h-5 px-2 font-normal whitespace-nowrap shrink-0",
                                          key === "vibe_tags"
                                            ? "border-slate-200 text-slate-500 bg-transparent"
                                            : "bg-slate-100 text-slate-600 border-none"
                                        )}
                                        title={v}
                                      >
                                        {v}
                                      </Badge>
                                    ))}
                                    {overflow > 0 && (
                                      <Badge
                                        variant="outline"
                                        className="text-[10px] h-5 px-1.5 font-normal whitespace-nowrap shrink-0 text-muted-foreground"
                                        title={values.slice(MAX_TAGS).join(", ")}
                                      >
                                        +{overflow}
                                      </Badge>
                                    )}
                                  </div>
                                );
                              }
                              const displayValue = values.join(", ");
                              return (
                                <span className="truncate block" title={displayValue}>
                                  {displayValue}
                                </span>
                              );
                            })()
                          )}
                        </TableCell>
                      );
                    })}
                  </TableRow>
                )
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No media found matching your search.
                </TableCell>
              </TableRow>
            )}
          </TableBody>
        </Table>
      </div>

      {/* Media Dialog */}
      <MediaDialog
        open={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        media={selectedMedia as any}
        onSubmit={handleSubmit}
        allowedFields={carouselAllowedFields}
        assignmentPage="listen"
        selectedShelfId={selectedShelfId}
        defaultValues={{}}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={mediaToDelete?.title}
        isDeleting={deleteMutation.isPending}
        description={
          mediaToDelete
            ? `Are you sure you want to move "${mediaToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
            : "Are you sure you want to move this item to the bin? You’ll be able to permanently delete it later from the Archive."
        }
      />
    </div>
  );
}
