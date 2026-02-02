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
import { Edit, Trash2, Loader2 } from "lucide-react";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import MediaDialog from "@/components/MediaDialog";
import { MediaFilters } from "@/components/MediaFilters";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { useDebounce } from "@/hooks";
import { Flag, Project } from "@/types";
import { StatsRow } from "@/components/StatsRow";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

const HomePage = () => {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Partial<Project> | null>(
    null,
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const debouncedSearchQuery = useDebounce(searchQuery);

  const queryClient = useQueryClient();

  // Fetch unique statuses for filters
  const { data: availableStatuses = [] } = useQuery({
    queryKey: ["unique-statuses"],
    queryFn: async () => {
      const response = await projectsAPI.get({ eq: [] });
      console.log("response", response);
      if (
        response.flag === Flag.Success ||
        (Flag.UnknownOrSuccess && response.data)
      ) {
        const statuses = (response.data as Project[])
          .map((item) => item.status)
          .filter(Boolean);
        console.log("statuses", statuses);
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
      "projects",
      debouncedSearchQuery,
      statusFilter,
      contentTypeFilter,
    ],
    queryFn: async () => {
      const eqFilters = [];
      if (statusFilter !== "all") {
        eqFilters.push({ key: "status" as const, value: statusFilter });
      }
      if (contentTypeFilter !== "all") {
        eqFilters.push({
          key: "content_type" as const,
          value: contentTypeFilter,
        });
      }

      // Fetch projects using Projects.get() with server-side filters + search
      const response = await projectsAPI.get({
        eq: eqFilters,
        sort: "created_at",
        sortBy: "dec",
        search: debouncedSearchQuery || undefined,
        searchFields: ["title", "platform", "notes"],
      });

      // Handle error responses - check for both Success and UnknownOrSuccess flags
      if (
        response.flag !== Flag.Success &&
        response.flag !== Flag.UnknownOrSuccess
      ) {
        // Extract error message from Supabase error object
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch projects";
        console.error("Projects API Error:", {
          flag: response.flag,
          error: response.error,
          supabaseError,
        });
        throw new Error(errorMessage);
      }

      // Handle case where data might be null or undefined - return empty array
      if (response.data === null || response.data === undefined) {
        return [];
      }

      return Array.isArray(response.data) ? (response.data as Project[]) : [];
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
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to create content";
        console.error("Create Error:", response);
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setIsMediaDialogOpen(false);
      toast.success("Content added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add content: ${error.message}`);
    },
  });

  // Update mutation
  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      console.log("Update payload:", { id, data });
      const response = await projectsAPI.updateOneByID(id, data);
      console.log("Update response:", response);
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
          "Failed to update content";
        console.error("Update Error:", response);
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Content updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update content: ${error.message}`);
    },
  });

  // Delete mutation
  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await projectsAPI.deleteOneByIDPermanent(id);
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
          "Failed to delete content";
        console.error("Delete Error:", response);
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["projects"] });
      queryClient.invalidateQueries({ queryKey: ["unique-statuses"] });
      queryClient.invalidateQueries({ queryKey: ["unique-types"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Content deleted successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete content: ${error.message}`);
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
            ].includes(key),
        )
      : ["title", "content_type", "status", "release_year", "platform"];

  const handleAddNew = () => {
    setSelectedMedia(null);
    setIsMediaDialogOpen(true);
  };

  const handleEdit = (media: Project) => {
    setSelectedMedia(media);
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

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Catalog</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

   const totalFilms = projects.filter((m) => m.content_type === "Film").length;
   const totalTVShows = projects.filter(
     (m) => m.content_type === "TV Show",
   ).length;
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <StatsRow
        items={[
          { label: "Total Items", value: projects?.length },
          { label: "Films", value: totalFilms },
          { label: "TV Shows", value: totalTVShows },
        ]}
        title="Home Page"
        description="One form, multiple categories - manage all content dynamically"
        handleNew={handleAddNew}
      />

      {/* Main Content Area */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6">
          <MediaFilters
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            contentTypeFilter={contentTypeFilter}
            onContentTypeFilterChange={setContentTypeFilter}
            availableStatuses={availableStatuses}
            availableTypes={availableTypes}
          />

          <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  {displayFields.map((key) => (
                    <TableHead
                      key={key}
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap px-4"
                    >
                      {key.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 text-right px-4">
                    Actions
                  </TableHead>
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
                  projects.map((project: Project) => (
                    <TableRow
                      key={project.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {displayFields.map((key) => {
                        const value = project[key as keyof Project];

                        return (
                          <TableCell
                            key={key}
                            className="text-slate-600 font-medium px-4 max-w-[200px] truncate"
                          >
                            {value === null || value === undefined ? (
                              <span className="text-slate-300 text-xs">—</span>
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

                      <TableCell className="text-right px-4">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(project)}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(project)}
                            className="text-slate-400 hover:text-red-600 hover:bg-red-50 rounded-lg"
                          >
                            <Trash2 className="h-4 w-4" />
                          </Button>
                        </div>
                      </TableCell>
                    </TableRow>
                  ))
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={displayFields.length + 1}
                      className="h-32 text-center text-slate-500 font-medium"
                    >
                      No content found matching your filters.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card>

      <MediaDialog
        open={isMediaDialogOpen}
        onOpenChange={setIsMediaDialogOpen}
        media={selectedMedia as any}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

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
};

export default HomePage;
