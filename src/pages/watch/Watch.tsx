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
import { Flag, Project } from "@/types";
import { toast } from "sonner";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { MediaFilters } from "@/components/MediaFilters";
import { StatsRow } from "@/components/StatsRow";
import { supabase } from "@/lib";
import { pairingService } from "@/services/pairingService";
import { cn } from "@/lib/utils";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

export default function Watch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [genreFilter, setGenreFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>(["actions", "title"]);

  const toggleSticky = (key: string) => {
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
    vibe_tags: 200,
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

  // Fetch all media
  const {
    data: mediaList = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["media", searchQuery, statusFilter, contentTypeFilter, genreFilter],
    queryFn: async () => {
      const eqFilters: any[] = [{ key: "is_deleted", value: false }];
      if (statusFilter !== "all") eqFilters.push({ key: "status", value: statusFilter });
      if (contentTypeFilter !== "all") {
        eqFilters.push({ key: "content_type", value: contentTypeFilter });
      }


      const response = await projectsAPI.get({
        eq: eqFilters as any,
        inValue: (contentTypeFilter === "all" ? { key: "content_type", value: ["TV Show", "Film"] } : undefined) as any,
        sort: "created_at",
        sortBy: "dec",
        search: searchQuery || undefined,
        searchFields: ["title"],
      });

      if (response.flag !== Flag.Success && response.flag !== Flag.UnknownOrSuccess) {
        throw new Error(response.error?.message || "Failed to fetch projects");
      }

      let rows = Array.isArray(response.data) ? response.data : [response.data].filter(Boolean) as Project[];

      // Apply Genre filter (client-side if multiple genres per project)
      if (genreFilter !== "all") {
        rows = rows.filter(r => {
          const gData = r.genres as any;
          const genres = typeof gData === 'string' ? gData.split(',') : (Array.isArray(gData) ? gData : []);
          return genres.some((g: string) => g.trim().toLowerCase() === genreFilter.toLowerCase());
        });
      }

      // Handle smart search (including inheritance)
      if (searchQuery.length > 2) {
        try {
          const inheritedProjects = await pairingService.searchProjectsByInheritedTag(searchQuery);
          const existingIds = new Set(rows.map(r => r.id));
          inheritedProjects.forEach(p => {
            if (!existingIds.has(p.id)) {
              // Apply basic filters to inherited results
              if (statusFilter !== "all") {
                const statuses = Array.isArray(p.status) ? p.status : [p.status];
                if (!statuses.includes(statusFilter as any)) return;
              }
              if (contentTypeFilter !== "all") {
                const types = Array.isArray(p.content_type) ? p.content_type : [p.content_type];
                if (!types.includes(contentTypeFilter as any)) return;
              }
              // If it's inherited but doesn't match content category 'TV Show' or 'Film', skip
              const pTypes = Array.isArray(p.content_type) ? p.content_type : [p.content_type];
              if (!pTypes.some(t => ["TV Show", "Film"].includes(String(t)))) return;

              rows.push(p);
            }
          });
        } catch (e) {
          console.error("Error fetching inherited projects:", e);
        }
      }

      return rows;
    },
  });

  // Create mutation
  const createMutation = useMutation({
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

  // Soft delete (move to bin) – item will appear in Archive.
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await projectsAPI.toogleSoftDeleteOneByID(id, true);
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        throw new Error(response.error?.message || "Failed to move to bin");
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["media"] });
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Media moved to bin!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to move media to bin: ${error.message}`);
    },
  });

  const displayFields =
    mediaList.length > 0
      ? Object.keys(mediaList[0]).filter(
        (key) =>
          ![
            "id",
            "poster_url",
            "preview_url",
            "platform_url",
            "order_index",
            "created_at",
            "updated_at",
          ].includes(key)
      )
      : ["title", "content_type", "status", "release_year", "platform", "vibe_tags"];

  const allAvailableFields = Array.from(new Set(["actions", ...displayFields]));
  const orderedFields = [
    ...allAvailableFields.filter(key => stickyColumns.includes(key)),
    ...allAvailableFields.filter(key => !stickyColumns.includes(key))
  ];

  // Fetch unique statuses for filters (global, not affected by current filter)
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ["unique-statuses"],
    queryFn: async () => {
      const response = await projectsAPI.get({
        or: "content_type.eq.TV Show,content_type.eq.Film",
      });
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        return [];
      }
      const statuses = (response.data as Project[])
        .flatMap((item) => item.status)
        .filter(Boolean);
      return [...new Set(statuses)].sort();
    },
  });

  // Fetch unique types for filters (global, not affected by current filter)
  const { data: availableTypes = [] } = useQuery({
    queryKey: ["unique-types"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        return [];
      }
      const types = (response.data as Project[])
        .flatMap((item) => item.content_type)
        .filter(Boolean);
      return [...new Set(types)].sort();
    },
  });

  const { data: availableGenres = [] } = useQuery({
    queryKey: ["unique-genres"],
    queryFn: async () => {
      const { data, error } = await supabase.from('projects').select('genres').eq('is_deleted', false);
      if (error) return [];
      const tags = data.flatMap(d => {
        let g = d.genres;
        if (typeof g === 'string') return g.split(',').map((s: string) => s.trim());
        return Array.isArray(g) ? g : [];
      });
      return Array.from(new Set(tags)).sort();
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

  // Calculate stats
  const totalFilms = mediaList.filter((m) => {
    const types = Array.isArray(m.content_type) ? m.content_type : [m.content_type];
    return types.some(t => String(t) === "Film");
  }).length;
  const totalTVShows = mediaList.filter((m) => {
    const types = Array.isArray(m.content_type) ? m.content_type : [m.content_type];
    return types.some(t => String(t) === "TV Show");
  }).length;

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
  {
    console.log("selectedMedia", selectedMedia);
  }

  return (
    <div className="space-y-6">
      <StatsRow
        items={[
          { label: "Total Items", value: mediaList?.length },
          { label: "Films", value: totalFilms },
          { label: "TV Shows", value: totalTVShows },
        ]}
        title="Watch Library"
        description="Manage films and TV shows in your catalog"
        handleNew={handleAddNew}
      />

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
          genreFilter={genreFilter}
          onGenreFilterChange={setGenreFilter}
          availableGenres={availableGenres}
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
            ) : !!mediaList?.length ? (
              [...mediaList].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map(
                (media) => {
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
                                let values: string[] = [];
                                if (Array.isArray(value)) {
                                  values = value.map(String);
                                } else if (typeof value === "string") {
                                  if (value.startsWith("[") && value.endsWith("]")) {
                                    try {
                                      const parsed = JSON.parse(value);
                                      values = Array.isArray(parsed) ? parsed.map(String) : [value];
                                    } catch (e) {
                                      values = [value];
                                    }
                                  } else {
                                    values = [value];
                                  }
                                } else {
                                  values = [String(value)];
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
                }
              )
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
          const defaults: any = {};

          // Apply manual filters first
          if (statusFilter !== "all") defaults.status = statusFilter;
          if (contentTypeFilter !== "all") defaults.content_type = contentTypeFilter;


          return Object.keys(defaults).length > 0 ? defaults : undefined;
        })()}
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
