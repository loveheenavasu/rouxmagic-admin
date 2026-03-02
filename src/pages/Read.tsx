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
import { Badge } from "@/components/ui/badge";
import { Loader2, Edit, Trash2, List, Pin, PinOff } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MediaFilters } from "@/components/MediaFilters";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { supabase } from "@/lib";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { Flag, Project, ContentTypeEnum, ContentRow, FilterTypeEnum } from "@/types";
import { toast } from "sonner";
import MediaDialog from "@/components/MediaDialog";
import { StatsRow } from "@/components/StatsRow";
import { cn, smartParse } from "@/lib/utils";
import { PageSettingsCard } from "@/components/PageSettingsCard";

const READ_TYPES = ["Audiobook", "Book", "Comic"] as const;
const projectsAPI = Projects;

export default function Read() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string[]>([]);
  const [contentTypeFilter, setContentTypeFilter] = useState<string[]>([]);
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [selectedShelfId, setSelectedShelfId] = useState<string>("all");
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
    platform_name: 150,
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
    queryKey: ["content-rows", "read"],
    queryFn: async () => {
      const { ContentRows } = await import("@/api/integrations/supabase/content_rows/content_rows");
      const resp = await (ContentRows as any).get({ eq: [{ key: "page", value: "read" }, { key: "is_active", value: true }] });
      return Array.isArray(resp.data) ? resp.data as ContentRow[] : [];
    }
  });

  // Fetch read items with server-side filters
  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["read-items", searchQuery, statusFilter, contentTypeFilter, genreFilter, selectedShelfId],
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
            } else {
              // For custom rows, query by row_type using the shelf's row_type or label
              const rowTypeFilter = (shelf as any).row_type || (shelf as any).label;
              ilikeFilters.push({ key: "row_type", value: `%${rowTypeFilter}%` });
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

      // Apply base content type restriction for Read page
      const pageFilterOr = READ_TYPES.map(t => `content_type.ilike.%${t}%`).join(",");
      const visibilityFilter = "is_deleted.eq.false,is_deleted.is.null";
      let finalOr = shelfOr;

      if (finalOr) {
        finalOr = `and(or(${finalOr}),or(${pageFilterOr}),or(${visibilityFilter}))`;
      } else {
        finalOr = `and(or(${pageFilterOr}),or(${visibilityFilter}))`;
      }

      const response = await projectsAPI.get({
        eq: eqFilters,
        contains: containsFilters.length > 0 ? containsFilters : undefined,
        overlaps: overlapsFilters.length > 0 ? overlapsFilters : undefined,
        ilike: ilikeFilters.length > 0 ? ilikeFilters : undefined,
        or: finalOr,
        search: searchQuery.trim() || undefined,
        searchFields: ["title", "platform", "notes"],
        sort: "order_index",
        sortBy: "asc"
      });

      if (response.flag !== Flag.Success && response.flag !== Flag.UnknownOrSuccess) {
        throw new Error(response.error?.message || "Failed to fetch read content");
      }

      const data = response.data;
      let rows = (Array.isArray(data) ? data : data ? [data] : []) as Project[];

      // Apply Genre filter
      if (genreFilter !== "all") {
        rows = rows.filter(r => {
          const gData = r.genres;
          const genres = Array.isArray(gData) ? gData : [];
          return genres.some((g: string) => g.trim().toLowerCase() === genreFilter.toLowerCase());
        });
      }

      return rows;
    },
  });

  // Create mutation
  const createMutation = useMutation<Project, Error, any>({
    mutationFn: async (data: any) => {
      const response = await projectsAPI.createOne(data);
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
      queryClient.invalidateQueries({ queryKey: ["read-items"] });
      queryClient.invalidateQueries({ queryKey: ["read-statuses"] });
      setIsMediaDialogOpen(false);
      toast.success("Content created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create content: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation<Project, Error, { id: string; data: any }>({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await projectsAPI.updateOneByID(id, data);
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
      queryClient.invalidateQueries({ queryKey: ["read-items"] });
      queryClient.invalidateQueries({ queryKey: ["read-statuses"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Content updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update content: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation<void, Error, string>({
    mutationFn: async (id: string) => {
      const response = await projectsAPI.toogleSoftDeleteOneByID(id, true);
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error(response.error?.message || "Failed to delete media");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["read-items"] });
      queryClient.invalidateQueries({ queryKey: ["read-statuses"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content: ${error.message}`);
    },
  });

  // Fetch unique content types for filters
  const { data: availableTypes = [] } = useQuery({
    queryKey: ["read-unique-types"],
    queryFn: async () => {
      const response = await projectsAPI.get({
        inValue: { key: "content_type" as any, value: [...READ_TYPES] }
      });

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

  // Status options based on all read items
  const { data: availableStatuses = [] } = useQuery<string[]>({
    queryKey: ["read-statuses"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select("status")
        .in("content_type", READ_TYPES as any);

      if (error || !data) return [];

      const statuses = data
        .flatMap((row: any) => smartParse(row.status))
        .filter(Boolean);
      return [...new Set(statuses)].sort();
    },
  });

  const displayFields = Array.from(new Set([
    ...(items.length > 0 ? Object.keys(items[0]) : []),
    "genres",
    "vibe_tags"
  ])).filter(
    (key) =>
      ![
        "id",
        "poster_url",
        "order_index",
        "created_at",
        "updated_at",
        "user_id",
      ].includes(key)
  );

  const allAvailableFields = Array.from(new Set(["actions", ...displayFields]));
  const orderedFields = [
    ...allAvailableFields.filter(key => stickyColumns.includes(key)),
    ...allAvailableFields.filter(key => !stickyColumns.includes(key))
  ];

  const { data: availableGenres = [] } = useQuery<string[]>({
    queryKey: ["read-genres"],
    queryFn: async () => {
      const response = await projectsAPI.get({
        eq: [{ key: "is_deleted" as any, value: false }],
        inValue: { key: "content_type" as any, value: [...READ_TYPES] }
      });
      if (response.flag === Flag.Success && Array.isArray(response.data)) {
        const genres = (response.data as Project[]).flatMap(p => smartParse(p.genres));
        return Array.from(new Set(genres)).filter(Boolean).sort();
      }
      return [];
    }
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

  const confirmDelete = async () => {
    if (mediaToDelete) {
      await deleteMutation.mutateAsync(mediaToDelete.id);
    }
  };

  const totalItems = items.length;
  const totalComics = items.filter(
    (m) => m.content_type === ContentTypeEnum.Comic
  ).length;
  const totalAudiobooks = items.filter(
    (m) => m.content_type === ContentTypeEnum.Audiobook
  ).length;

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center">
          <h2 className="text-2xl font-bold text-destructive mb-2">
            Error Loading Read Content
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
          { label: "Total Items", value: totalItems },
          { label: "Comics", value: totalComics },
          { label: "Audiobook", value: totalAudiobooks },
        ]}
        title="Read Library"
        description="Browse comics, books, and audiobooks from your catalog"
        handleNew={handleAddNew}
      />

      <PageSettingsCard pageName="read" />

      <MediaFilters
        searchPlaceholder="Search by title, platform or notes..."
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
      />

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
            ) : items.length ? (
              [...items].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((item) => {
                const isSelected = selectedRowId === item.id;
                return (
                  <TableRow key={item.id} className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50"}`}
                    onClick={() => {
                      if (isSelected) {
                        setSelectedRowId(null);
                      } else {
                        setSelectedRowId(item.id);
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
                              {(item.content_type === ContentTypeEnum.Audiobook ||
                                (item as any).content_type === "AudioBook") && (
                                  <Button
                                    variant="ghost"
                                    size="icon"
                                    onClick={(e) => {
                                      e.stopPropagation();
                                      navigate(`/chapters?projectId=${item.id}`);
                                    }}
                                    title="Chapters"
                                  >
                                    <List className="h-4 w-4" />
                                  </Button>
                                )}
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleEdit(item);
                                }}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={(e) => {
                                  e.stopPropagation();
                                  handleDelete(item);
                                }}
                                className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                              >
                                <Trash2 className="h-4 w-4" />
                              </Button>
                            </div>
                          </TableCell>
                        );
                      }

                      const value = (item as any)[key];
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
                );
              })
            ) : (
              <TableRow>
                <TableCell
                  colSpan={displayFields.length + 1}
                  className="text-center text-muted-foreground py-8"
                >
                  No read content found matching your filters.
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
        isLoading={createMutation.isPending || updateMutation.isPending}
        assignmentPage="read"
        selectedShelfId={selectedShelfId}
        defaultValues={{}}
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
