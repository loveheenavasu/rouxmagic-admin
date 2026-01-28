import { useState } from "react";
import { useQuery, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Card,
  CardContent,
  CardDescription,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import {
  Table,
  TableBody,
  TableCell,
  TableHead,
  TableHeader,
  TableRow,
} from "@/components/ui/table";
import {
  AlertDialog,
  AlertDialogAction,
  AlertDialogCancel,
  AlertDialogContent,
  AlertDialogDescription,
  AlertDialogFooter,
  AlertDialogHeader,
  AlertDialogTitle,
} from "@/components/ui/alert-dialog";
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import MediaDialog from "@/components/MediaDialog";
import { ContentTypeEnum, Flag, Project } from "@/types";
import { toast } from "sonner";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { MediaFilters } from "@/components/MediaFilters";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

export default function Watch() {
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);

  const queryClient = useQueryClient();

  // Fetch all media
  const {
    data: mediaList = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["media", searchQuery, statusFilter],
    queryFn: async () => {
      const eqFilters: { key: "status" | "content_type"; value: any }[] = [
        { key: "content_type", value: ContentTypeEnum.Song },
      ];

      if (statusFilter !== "all") {
        eqFilters.push({ key: "status", value: statusFilter });
      }

      const response = await projectsAPI.get({
        eq: eqFilters,
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
      const response = await projectsAPI.deleteOneByIDPermanent(id);
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
      ? Object.keys(mediaList[0])
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
  const totalFilms = mediaList.filter((m) => m.content_type === "Film").length;
  const totalTVShows = mediaList.filter(
    (m) => m.content_type === "TV Show",
  ).length;
  const avgRuntime =
    mediaList.length > 0
      ? Math.round(
          mediaList
            .filter((m) => m.runtime_minutes)
            .reduce((acc, m) => acc + (m.runtime_minutes || 0), 0) /
            (mediaList.filter((m) => m.runtime_minutes).length || 1),
        )
      : 0;

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
      {/* Header Section */}
      <div className="flex flex-col gap-4 md:flex-row md:items-center md:justify-between">
        <div>
          <h1 className="text-3xl font-bold tracking-tight">Listen Library</h1>
          <p className="text-muted-foreground">
            Manage songs and audiobooks in your catalog
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add New Content
        </Button>
      </div>

      {/* Stats Cards */}
      <div className="grid gap-4 md:grid-cols-4">
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Total Content</CardDescription>
            <CardTitle className="text-3xl">{mediaList.length}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Films</CardDescription>
            <CardTitle className="text-3xl">{totalFilms}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>TV Shows</CardDescription>
            <CardTitle className="text-3xl">{totalTVShows}</CardTitle>
          </CardHeader>
        </Card>
        <Card>
          <CardHeader className="pb-2">
            <CardDescription>Avg Runtime</CardDescription>
            <CardTitle className="text-3xl">
              {avgRuntime > 0 ? `${avgRuntime}m` : "N/A"}
            </CardTitle>
          </CardHeader>
        </Card>
      </div>

      {/* Search and Filter Section */}
   
          <MediaFilters
            searchPlaceholder="Search by title..."
            searchQuery={searchQuery}
            onSearchChange={setSearchQuery}
            statusFilter={statusFilter}
            onStatusFilterChange={setStatusFilter}
            availableStatuses={availableStatuses}
            availableTypes={availableTypes}
          />
          {/* Table */}
          <div className="rounded-md border">
            <Table>
              <TableHeader>
                <TableRow>
                  {displayFields.map((key) => (
                    <TableHead
                      key={key}
                      className="text-xs font-bold uppercase tracking-wider text-muted-foreground py-4 whitespace-nowrap"
                    >
                      {key.replace(/_/g, " ")}
                    </TableHead>
                  ))}
                  <TableHead className="text-right">Actions</TableHead>
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
                  filteredMedia.map(
                    (media) => (
                      console.log("media::::", media),
                      (
                        <TableRow key={media.id}>
                          {displayFields.map((key) => {
                            const value = media[key as keyof Project];
                            return (
                              <TableCell
                                key={key}
                                className="max-w-[200px] truncate"
                              >
                                {value === null || value === undefined ? (
                                  <span className="text-muted-foreground text-xs">
                                    —
                                  </span>
                                ) : (
                                  <span title={String(value)}>
                                    {String(value)}
                                  </span>
                                )}
                              </TableCell>
                            );
                          })}
                          <TableCell className="text-right">
                            <div className="flex justify-end gap-2">
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleEdit(media)}
                              >
                                <Edit className="h-4 w-4" />
                              </Button>
                              <Button
                                variant="ghost"
                                size="icon"
                                onClick={() => handleDelete(media)}
                              >
                                <Trash2 className="h-4 w-4 text-destructive" />
                              </Button>
                            </div>
                          </TableCell>
                        </TableRow>
                      )
                    ),
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
        isLoading={createMutation.isPending || updateMutation.isPending}
      />

      {/* Delete Confirmation Dialog */}
      <AlertDialog open={deleteDialogOpen} onOpenChange={setDeleteDialogOpen}>
        <AlertDialogContent>
          <AlertDialogHeader>
            <AlertDialogTitle>Are you sure?</AlertDialogTitle>
            <AlertDialogDescription>
              This will permanently delete "{mediaToDelete?.title}". This action
              cannot be undone.
            </AlertDialogDescription>
          </AlertDialogHeader>
          <AlertDialogFooter>
            <AlertDialogCancel>Cancel</AlertDialogCancel>
            <AlertDialogAction
              onClick={confirmDelete}
              className="bg-destructive text-destructive-foreground hover:bg-destructive/90"
            >
              {deleteMutation.isPending && (
                <Loader2 className="mr-2 h-4 w-4 animate-spin" />
              )}
              Delete
            </AlertDialogAction>
          </AlertDialogFooter>
        </AlertDialogContent>
      </AlertDialog>
    </div>
  );
}
