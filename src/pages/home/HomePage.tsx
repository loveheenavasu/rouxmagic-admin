import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import { Card } from "@/components/ui/card";
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
import { Projects } from "@/api/integrations/supabase/projects/projects";
import MediaDialog from "@/components/MediaDialog";
import { MediaFilters } from "@/components/MediaFilters";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks";
import { Flag, Project, ContentRow, FilterTypeEnum } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { cn } from "@/lib/utils";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Partial<Project> | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);
  const [stickyColumns, setStickyColumns] = useState<string[]>(["actions", "title"]);
  const [selectedShelfId, setSelectedShelfId] = useState<string>("all");

  const { data: shelves = [] } = useQuery({
    queryKey: ["content-rows", "home"],
    queryFn: async () => {
      const { ContentRows } = await import("@/api/integrations/supabase/content_rows/content_rows");
      const resp = await (ContentRows as any).get({ eq: [{ key: "page", value: "home" }, { key: "is_active", value: true }] });
      return Array.isArray(resp.data) ? resp.data as ContentRow[] : [];
    }
  });



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

  // Calculate left offset for sticky columns
  const getStickyOffset = (columnKey: string): number => {
    const columnWidths: Record<string, number> = {
      actions: 120,
      title: 200,
      content_type: 150,
      status: 150,
      platform: 150,
      release_year: 120,
      runtime_minutes: 150,
      notes: 300,
    };

    const index = stickyColumns.indexOf(columnKey);
    if (index === -1) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += columnWidths[stickyColumns[i]] || 150;
    }
    return offset;
  };

  const debouncedSearchQuery = useDebounce(searchQuery);

  const queryClient = useQueryClient();

  // Fetch unique statuses for filters
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ["unique-statuses"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });
      if (
        response.flag === Flag.Success ||
        (Flag.UnknownOrSuccess && response.data)
      ) {
        const statuses = (response.data as Project[])
          .map((item) => item.status)
          .filter(Boolean);
        return [...new Set(statuses)].sort();
      }
      return [];
    },
  });

  // Fetch unique types for filters
  const { data: availableTypes = [] } = useQuery({
    queryKey: ["unique-types"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });
      if (response.flag === Flag.Success && response.data) {
        const types = (response.data as Project[])
          .map((item) => item.content_type)
          .filter(Boolean);
        return [...new Set(types)].sort();
      }
      return [];
    },
  });

  // Fetch projects with server-side filters
  const {
    data: projects = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: [
      "home-library",
      debouncedSearchQuery,
      statusFilter,
      contentTypeFilter,
      selectedShelfId
    ],
    queryFn: async () => {
      const eqFilters: any[] = [];
      let inValueFilter: any = undefined;

      if (statusFilter !== "all") {
        eqFilters.push({ key: "status" as const, value: statusFilter });
      }
      if (contentTypeFilter !== "all") {
        eqFilters.push({ key: "content_type" as const, value: contentTypeFilter });
      }

      // Apply shelf filter logic
      if (selectedShelfId !== "all") {
        const shelf = shelves.find(s => s.id === selectedShelfId);
        if (shelf) {
          if (shelf.filter_type === FilterTypeEnum.Flag) {
            eqFilters.push({ key: shelf.filter_value, value: true });
          } else if (shelf.filter_type === FilterTypeEnum.Audiobook) {
            eqFilters.push({ key: "content_type", value: "Audiobook" });
          } else if (shelf.filter_type === FilterTypeEnum.Song) {
            eqFilters.push({ key: "content_type", value: "Song" });
          } else if (shelf.filter_type === FilterTypeEnum.Listen) {
            inValueFilter = {
              key: "content_type",
              value: ["Audiobook", "Song"]
            };
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
        eq: eqFilters,
        inValue: inValueFilter,
        sort: "created_at",
        sortBy: "dec",
        search: debouncedSearchQuery || undefined,
        searchFields: ["title", "platform", "notes"],
      });

      if (response.flag !== Flag.Success && response.flag !== Flag.UnknownOrSuccess) {
        throw new Error(response.error?.message || "Failed to fetch projects");
      }
      const rows = Array.isArray(response.data) ? (response.data as Project[]) : [];
      return rows.filter((item) => (item as any).is_deleted !== true);
    },
  });

  const displayFields =
    projects.length > 0
      ? Object.keys(projects[0]).filter(
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
      : ["title", "content_type", "status", "release_year", "platform"];

  // Create mutation
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await projectsAPI.createOne(data);
      if (
        (response.flag !== Flag.Success &&
          response.flag !== Flag.UnknownOrSuccess) ||
        !response.data
      ) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to create content item";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setIsMediaDialogOpen(false);
      toast.success("Content item created successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to create content item: ${error.message}`);
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
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to update content item";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Content item updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update content item: ${error.message}`);
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
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to delete content item";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-library"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content item: ${error.message}`);
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
      await updateMutation.mutateAsync({ id: (selectedMedia as any).id, data });
    } else {
      await createMutation.mutateAsync(data);
    }
  };

  const confirmDelete = async () => {
    if (mediaToDelete) {
      await deleteMutation.mutateAsync(mediaToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center min-h-[400px]">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Content</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <StatsRow
        title="Home Page Library"
        description="Manage all content items displayed on the home page."
        handleNew={handleAddNew}
      />

      {/* Main Content Area */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6 space-y-4">
          <div className="flex flex-col lg:flex-row gap-4 mb-6">
            <MediaFilters
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
            />
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                <TableRow>
                  <TableHead
                    className={cn(
                      "text-xs font-bold uppercase tracking-wider text-slate-500 py-4 bg-slate-50 group",
                      stickyColumns.includes("actions") && stickyColumns.indexOf("actions") === stickyColumns.length - 1 ? "px-4" : stickyColumns.includes("actions") ? "pl-4 pr-0" : "px-4"
                    )}
                    sticky={stickyColumns.includes("actions") ? "left" : undefined}
                    left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
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
                      className={cn(
                        "text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap bg-slate-50 group",
                        stickyColumns.includes(key) && stickyColumns.indexOf(key) === stickyColumns.length - 1 ? "px-4" : stickyColumns.includes(key) ? "pl-4 pr-0" : "px-4"
                      )}
                      sticky={stickyColumns.includes(key) ? "left" : undefined}
                      left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
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
                      className="h-64 text-center"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        Loading content library...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : projects.length > 0 ? (
                  [...projects].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((project: Project) => {
                    const isSelected = selectedRowId === project.id;
                    return (
                      <TableRow
                        key={project.id}
                        className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50/50"
                          }`}
                        onClick={() => setSelectedRowId(isSelected ? null : project.id)}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell
                          className={cn(
                            "whitespace-nowrap",
                            stickyColumns.includes("actions") && stickyColumns.indexOf("actions") === stickyColumns.length - 1 ? "px-4" : stickyColumns.includes("actions") ? "pl-4 pr-0" : "px-4"
                          )}
                          sticky={stickyColumns.includes("actions") ? "left" : undefined}
                          left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                        >
                          <div className="flex gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(project);
                              }}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleDelete(project);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        {displayFields.map((key) => {
                          const value = (project as any)[key];
                          return (
                            <TableCell
                              key={key}
                              className={cn(
                                "text-slate-600 font-medium group-hover:bg-slate-50/50 group-data-[state=selected]:bg-indigo-50",
                                key === "notes" || key === "description" ? "max-w-[300px]" : "max-w-[200px]",
                                stickyColumns.includes(key) && stickyColumns.indexOf(key) === stickyColumns.length - 1 ? "px-4" : stickyColumns.includes(key) ? "pl-4 pr-0" : "px-4"
                              )}
                              sticky={stickyColumns.includes(key) ? "left" : undefined}
                              left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                            >
                              {value === null || value === undefined ? (
                                <span className="text-slate-300 text-xs">—</span>
                              ) : key === "status" ? (
                                <span
                                  className={`px-2 py-1 rounded-full text-[10px] font-bold uppercase tracking-wider ${value === "released"
                                    ? "bg-emerald-100 text-emerald-700"
                                    : value === "coming_soon"
                                      ? "bg-amber-100 text-amber-700"
                                      : "bg-slate-100 text-slate-700"
                                    }`}
                                >
                                  {value}
                                </span>
                              ) : (
                                <span
                                  className="truncate block"
                                  title={String(value)}
                                >
                                  {String(value)}
                                </span>
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
                      className="h-32 text-center text-slate-500 font-medium"
                    >
                      No items found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div >
      </Card >



      <MediaDialog
        open={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        media={selectedMedia as any}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
        assignmentPage="home"
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        title="Move to archive?"
        itemName={mediaToDelete?.title}
        description={
          mediaToDelete?.title
            ? `Are you sure you want to move "${mediaToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
            : "Are you sure you want to move this item to the bin? You’ll be able to permanently delete it later from the Archive."
        }
        isDeleting={deleteMutation.isPending}
      />
    </div >
  );
};

export default HomePage;
