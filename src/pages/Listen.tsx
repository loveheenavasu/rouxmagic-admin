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
import MediaDialog from "@/components/MediaDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { ContentTypeEnum, Flag, Project, ContentRow, FilterTypeEnum } from "@/types";
import { toast } from "sonner";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { MediaFilters } from "@/components/MediaFilters";
import { StatsRow } from "@/components/StatsRow";
import {
  Select,
  SelectContent,
  SelectItem,
  SelectTrigger,
  SelectValue,
} from "@/components/ui/select";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

export default function Watch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>(["title"]);
  const [activeShelfId, setActiveShelfId] = useState<string>("all");

  const { data: shelves = [] } = useQuery({
    queryKey: ["content-rows", "listen"],
    queryFn: async () => {
      const { ContentRows } = await import("@/api/integrations/supabase/content_rows/content_rows");
      const resp = await (ContentRows as any).get({ eq: [{ key: "page", value: "listen" }, { key: "is_active", value: true }] });
      return Array.isArray(resp.data) ? resp.data as ContentRow[] : [];
    }
  });

  const toggleSticky = (key: string) => {
    setStickyColumns((prev) =>
      prev.includes(key)
        ? prev.filter((col) => col !== key)
        : [...prev, key]
    );
  };

  const queryClient = useQueryClient();

  // Fetch all media
  const {
    data: mediaList = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["media", searchQuery, statusFilter, activeShelfId],
    queryFn: async () => {
      const eqFilters: any[] = [
        { key: "content_type", value: ContentTypeEnum.Song },
      ];

      if (statusFilter !== "all") {
        eqFilters.push({ key: "status", value: statusFilter });
      }

      let inValueFilter: any = undefined;

      // Apply shelf filter logic
      if (activeShelfId !== "all") {
        const shelf = shelves.find(s => s.id === activeShelfId);
        if (shelf) {
          if (shelf.filter_type === FilterTypeEnum.Flag) {
            eqFilters.push({ key: shelf.filter_value, value: true });
          } else if (shelf.filter_type === FilterTypeEnum.Status || shelf.filter_type === FilterTypeEnum.ContentType) {
            if (shelf.filter_value.includes(",")) {
              inValueFilter = {
                key: shelf.filter_type === FilterTypeEnum.Status ? "status" : "content_type",
                value: shelf.filter_value.split(",").map(v => v.trim())
              };
            } else {
              eqFilters.push({ key: shelf.filter_type, value: shelf.filter_value });
            }
          }
        }
      }

      const response = await projectsAPI.get({
        eq: [
          ...eqFilters,
          { key: "is_deleted" as any, value: false }
        ] as any,
        inValue: inValueFilter,
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

      const data = Array.isArray(response.data)
        ? response.data
        : ([response.data].filter(Boolean) as Project[]);

      return data;
    },
  });

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await projectsAPI.createOne(data);
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
      const response = await projectsAPI.toogleSoftDeleteOneByID(id, true);
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

  const displayFields =
    mediaList.length > 0
      ? Object.keys(mediaList[0]).filter((key) => key !== "id")
      : ["title", "content_type", "status", "release_year", "platform"];

  // Fetch unique statuses for filters (global, not affected by current filter)
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ["unique-statuses"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        return [];
      }
      const statuses = (response.data as Project[])
        .map((item) => item.status)
        .filter(Boolean);
      return [...new Set(statuses)].sort();
    },
  });

  // Fetch unique types for filters (global, not affected by current filter)
  // For Listen page we always show songs, so we don't need a type filter dropdown.
  const availableTypes: string[] = [];

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
    "vibes",
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
  const totalFilms = mediaList.filter((m) => m.content_type === "Film").length;
  const totalTVShows = mediaList.filter(
    (m) => m.content_type === "TV Show"
  ).length;

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
          { label: "Films", value: totalFilms },
          { label: "TV Shows", value: totalTVShows },
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
          availableStatuses={availableStatuses}
          availableTypes={availableTypes}
        />
        <div className="w-full lg:w-64">
          <Select value={activeShelfId} onValueChange={setActiveShelfId}>
            <SelectTrigger className="h-11 rounded-xl border-slate-200 bg-slate-50/30">
              <SelectValue placeholder="Filter by Shelf" />
            </SelectTrigger>
            <SelectContent>
              <SelectItem value="all">All Items (No Shelf)</SelectItem>
              {shelves.map(shelf => (
                <SelectItem key={shelf.id} value={shelf.id}>{shelf.label}</SelectItem>
              ))}
            </SelectContent>
          </Select>
        </div>
      </div>
      {/* Table */}
      <div className="rounded-md border">
        <Table>
          <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
            <TableRow>
              <TableHead
                className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-4 whitespace-nowrap px-4 bg-slate-50 group"
                sticky={stickyColumns.includes("actions") ? "left" : undefined}
              >
                <div className="flex items-center gap-2">
                  Actions
                  <Button
                    variant="ghost"
                    size="icon"
                    className={`h-4 w-4 transition-opacity ${stickyColumns.includes("actions") ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                    onClick={() => toggleSticky("actions")}
                  >
                    {stickyColumns.includes("actions") ? (
                      <PinOff className="h-3 w-3" />
                    ) : (
                      <Pin className="h-3 w-3" />
                    )}
                  </Button>
                </div>
              </TableHead>
              {displayFields.map((key) => (
                <TableHead
                  key={key}
                  className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-4 whitespace-nowrap px-4 bg-slate-50 group"
                  sticky={stickyColumns.includes(key) ? "left" : undefined}
                >
                  <div className="flex items-center gap-2">
                    {key.replace(/_/g, " ")}
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
                    className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50/50"
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
                    <TableCell
                      className="px-4 whitespace-nowrap"
                      sticky={stickyColumns.includes("actions") ? "left" : undefined}
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
                    {displayFields.map((key) => {
                      const value = media[key as keyof Project];
                      return (
                        <TableCell
                          key={key}
                          className="max-w-[200px] truncate px-4 group-hover:bg-slate-50/50 group-data-[state=selected]:bg-indigo-50"
                          sticky={stickyColumns.includes(key) ? "left" : undefined}
                        >
                          {value === null || value === undefined ? (
                            <span className="text-muted-foreground text-xs">
                              —
                            </span>
                          ) : (
                            <span title={String(value)}>{String(value)}</span>
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
        defaultValues={(() => {
          const defaults: any = {
            content_type: ContentTypeEnum.Song, // Default for Listen page
          };

          // Apply manual filters
          if (statusFilter !== "all") defaults.status = statusFilter;

          // Apply shelf filters (overriding manual if specific)
          if (activeShelfId !== "all") {
            const shelf = shelves.find((s) => s.id === activeShelfId);
            if (shelf) {
              if (shelf.filter_type === FilterTypeEnum.ContentType) {
                const type = shelf.filter_value.split(",")[0].trim();
                defaults.content_type = type;
              }
              if (shelf.filter_type === FilterTypeEnum.Status) {
                const status = shelf.filter_value.split(",")[0].trim();
                defaults.status = status;
              }
              if (shelf.filter_type === FilterTypeEnum.Flag) {
                defaults[shelf.filter_value] = true;
              }
            }
          }

          return defaults;
        })()}
        isLoading={createMutation.isPending || updateMutation.isPending}
        allowedFields={carouselAllowedFields}
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
