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
import { Loader2, Edit, Trash2, List } from "lucide-react";
import { useNavigate } from "react-router-dom";
import { MediaFilters } from "@/components/MediaFilters";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { supabase } from "@/lib";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { Flag, Project, ContentTypeEnum } from "@/types";
import { toast } from "sonner";
import MediaDialog from "@/components/MediaDialog";
import { StatsRow } from "@/components/StatsRow";

const READ_TYPES = ["Comic", "Book", "Audiobook"] as const;
const projectsAPI = Projects as Required<typeof Projects>;

export default function Read() {
  const navigate = useNavigate();
  const [searchQuery, setSearchQuery] = useState("");
  const [statusFilter, setStatusFilter] = useState<string>("all");
  const [contentTypeFilter, setContentTypeFilter] = useState<string>("all");
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Project | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);

  const queryClient = useQueryClient();

  // Fetch read items with server-side filters
  const {
    data: items = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["read-items", searchQuery, statusFilter, contentTypeFilter],
    queryFn: async () => {
      const search = searchQuery.trim();

      let query = supabase
        .from("projects")
        .select("*")
        .in("content_type", READ_TYPES as any)
        .order("order_index", { ascending: true });

      if (statusFilter !== "all") {
        query = query.eq("status", statusFilter);
      }

      if (contentTypeFilter !== "all") {
        query = query.eq("content_type", contentTypeFilter);
      }

      if (search) {
        const pattern = `%${search}%`;
        query = query.or(
          `title.ilike.${pattern},platform.ilike.${pattern},notes.ilike.${pattern}`
        );
      }

      const { data, error } = await query;

      if (error) {
        throw new Error(error.message || "Failed to fetch read content");
      }

      return ((data || []) as Project[]).filter(
        (item) => (item as any).is_deleted !== true
      );
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
        .map((row: any) => row.status)
        .filter((s: string | null) => !!s);
      return [...new Set(statuses)] as string[];
    },
  });

  const availableTypes = READ_TYPES as unknown as string[];

  const displayFields =
    items.length > 0
      ? Object.keys(items[0]).filter(
          (key) =>
            ![
              "id",
              "poster_url",
              "preview_url",
              "platform_url",
              "order_index",
              "created_at",
              "updated_at",
              "user_id",
            ].includes(key)
        )
      : ["title", "content_type", "status", "platform_name"];

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

  const totalItems = items.length;
  const totalComics = items.filter(
    (m) => m.content_type === ContentTypeEnum.Comic
  ).length;
  const totalBooks = items.filter(
    (m) => m.content_type === ContentTypeEnum.Book
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
          { label: "Books", value: totalBooks },
          { label: "Audiobooks", value: totalAudiobooks },
        ]}
        title="Read Library"
        description="Browse comics, books, and audiobooks from your catalog"
        handleNew={handleAddNew}
      />

      {/* Search and Filter Section */}
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
            ) : items.length ? (
              items.map((item) => (
                <TableRow key={item.id}>
                  {displayFields.map((key) => {
                    const value = (item as any)[key];
                    return (
                      <TableCell key={key} className="max-w-[220px] truncate">
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
                  <TableCell className="text-right">
                    <div className="flex justify-end gap-2">
                      {(item.content_type === ContentTypeEnum.Audiobook ||
                        (item as any).content_type === "AudioBook") && (
                        <Button
                          variant="ghost"
                          size="icon"
                          onClick={() =>
                            navigate(`/chapters?projectId=${item.id}`)
                          }
                          title="Chapters"
                        >
                          <List className="h-4 w-4" />
                        </Button>
                      )}
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleEdit(item)}
                      >
                        <Edit className="h-4 w-4" />
                      </Button>
                      <Button
                        variant="ghost"
                        size="icon"
                        onClick={() => handleDelete(item)}
                      >
                        <Trash2 className="h-4 w-4 text-destructive" />
                      </Button>
                    </div>
                  </TableCell>
                </TableRow>
              ))
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
