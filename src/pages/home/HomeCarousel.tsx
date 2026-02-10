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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import MediaDialog from "@/components/MediaDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { Flag, Project } from "@/types";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

export default function HomeCarousel() {
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Partial<Project> | null>(
    null
  );
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<Project | null>(null);
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderValue, setOrderValue] = useState<number | "">("");
  const [selectedRowId, setSelectedRowId] = useState<string | null>(null);

  const startEditOrder = (item: Project) => {
    setEditingOrderId(item.id);
    setOrderValue(item.order_index ?? "");
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setOrderValue("");
  };

  const saveOrderIndex = async (item: Project) => {
    if (orderValue === "" || orderValue === item.order_index) {
      cancelEditOrder();
      return;
    }

    const newIndex = Number(orderValue);
    const oldIndex = item?.order_index;

    // Find conflicting item
    const conflictingItem = carouselItems.find(
      (i) => i.order_index === newIndex && i.id !== item.id
    );

    try {
      // If conflict exists → swap its order_index
      if (conflictingItem) {
        await updateMutation.mutateAsync({
          id: conflictingItem.id,
          data: { order_index: oldIndex },
        });
      }

      // Update current item
      await updateMutation.mutateAsync({
        id: item.id,
        data: { order_index: newIndex },
      });

      toast.success("Order index updated");
      cancelEditOrder();
    } catch (err) {
      console.error(err);
      toast.error("Failed to update order index");
    }
  };

  const queryClient = useQueryClient();

  // Fetch carousel items (filtering by a specific flag or content_type)
  // You can customize the filter based on your requirements
  const {
    data: carouselItems = [],
    isLoading,
    error,
  } = useQuery<Project[]>({
    queryKey: ["home-carousel"],
    queryFn: async () => {
      const response = await projectsAPI.get({
        eq: [{ key: "in_hero_carousel" as const, value: true }],
        sort: "order_index",
        sortBy: "asc",
      });
      console.log("response11111", response);
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
          "Failed to fetch carousel items";
        console.error("Carousel API Error:", response);
        throw new Error(errorMessage);
      }

      if (response.data === null || response.data === undefined) {
        return [];
      }

      const rows = Array.isArray(response.data)
        ? (response.data as Project[])
        : [];
      return rows.filter((item) => (item as any).is_deleted !== true);
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
          "Failed to create carousel item";
        console.error("Create Error:", response);
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-carousel"] });
      setIsMediaDialogOpen(false);
      toast.success("Carousel item added successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to add carousel item: ${error.message}`);
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
          "Failed to update carousel item";
        console.error("Update Error:", response);
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-carousel"] });
      setIsMediaDialogOpen(false);
      setSelectedMedia(null);
      toast.success("Carousel item updated successfully!");
    },
    onError: (error: Error) => {
      toast.error(`Failed to update carousel item: ${error.message}`);
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
          "Failed to delete carousel item";
        console.error("Delete Error:", response);
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["home-carousel"] });
      setDeleteDialogOpen(false);
      setMediaToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (error: Error) => {
      toast.error(`Failed to delete carousel item: ${error.message}`);
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
    "status",
    "platform",
    "platform_name",
    "poster_url",
    "preview_url",
    "order_index",
    "release_year",
    "runtime_minutes",
    "notes",
    "synopsis",
    "in_hero_carousel",
  ];

  const confirmDelete = async () => {
    if (mediaToDelete) {
      await deleteMutation.mutateAsync(mediaToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Carousel</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const columns = [
    { key: "actions", label: "Actions", align: "left" as const },
    { key: "title", label: "Title" },
    { key: "content_type", label: "Content Type" },
    { key: "status", label: "Status" },
    { key: "platform", label: "Platform" },
    { key: "order_index", label: "Order Index" },
    { key: "release_year", label: "Release Year", align: "right" as const },
    {
      key: "runtime_minutes",
      label: "Runtime Minutes",
      align: "right" as const,
    },
    { key: "notes", label: "Notes" },
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Home Carousel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage featured content displayed on the home page carousel
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Carousel Item
        </Button>
      </div>

      {/* Main Content Area */}
      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6">
          <div className="rounded-xl border border-slate-100 overflow-hidden overflow-x-auto">
            <Table>
              <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                <TableRow>
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className={[
                        "text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap px-4 bg-slate-50",
                        col.align === "right" ? "text-right" : "",
                      ]
                        .filter(Boolean)
                        .join(" ")}
                      sticky={col.key === "title" ? "left" : undefined}
                    >
                      {col.label}
                    </TableHead>
                  ))}
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell colSpan={9} className="h-64 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        Loading carousel items...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : carouselItems.length > 0 ? (
                  [...carouselItems].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((item: Project) => {
                    const isSelected = selectedRowId === item.id;
                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50/50"
                          }`}
                        onClick={() => {
                          if (isSelected) {
                            setSelectedRowId(null);
                          } else {
                            setSelectedRowId(item.id);
                          }
                        }}
                        data-state={isSelected ? "selected" : undefined}
                      >
                        <TableCell className="px-4 whitespace-nowrap">
                          <div className="flex justify-start gap-1">
                            <Button
                              variant="ghost"
                              size="icon"
                              onClick={(e) => {
                                e.stopPropagation();
                                handleEdit(item);
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
                                handleDelete(item);
                              }}
                              className="text-red-500 hover:text-red-700 hover:bg-red-50 rounded-lg"
                            >
                              <Trash2 className="h-4 w-4" />
                            </Button>
                          </div>
                        </TableCell>
                        <TableCell
                          className="text-slate-600 font-medium px-4 max-w-[200px] truncate group-hover:bg-slate-50/50 group-data-[state=selected]:bg-indigo-50"
                          sticky="left"
                        >
                          <span
                            className="truncate block"
                            title={item.title || ""}
                          >
                            {item.title || (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium px-4 max-w-[200px] truncate">
                          <span
                            className="truncate block"
                            title={item.content_type || ""}
                          >
                            {item.content_type || (
                              <span className="text-slate-300 text-xs">—</span>
                            )}
                          </span>
                        </TableCell>
                        <TableCell className="text-slate-600 font-medium px-4 whitespace-nowrap">
                          <span
                            className={`px-2 py-1 rounded-full text-xs font-medium ${item.status === "released"
                              ? "bg-green-100 text-green-700"
                              : item.status === "coming_soon"
                              ? "bg-blue-100 text-blue-700"
                              : "bg-gray-100 text-gray-700"
                          }`}
                        >
                          {item.status || "—"}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium px-4 max-w-[200px] truncate">
                        <span
                          className="truncate block"
                          title={item.platform || ""}
                        >
                          {item.platform || (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </span>
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium px-4 whitespace-nowrap">
                        {editingOrderId === item.id ? (
                          <div className="flex items-center gap-2" onClick={(e) => e.stopPropagation()}>
                            <input
                              type="number"
                              value={orderValue}
                              onChange={(e) =>
                                setOrderValue(Number(e.target.value))
                              }
                              className="w-20 rounded-md border border-slate-300 px-2 py-1 text-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                            />

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={() => saveOrderIndex(item)}
                              className="text-green-600 hover:bg-green-50"
                            >
                              ✔
                            </Button>

                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={cancelEditOrder}
                              className="text-slate-400 hover:bg-slate-100"
                            >
                              ✕
                            </Button>
                          </div>
                        ) : (
                          <div className="flex items-center gap-2">
                            <span>{item.order_index}</span>
                            <Button
                              size="icon"
                              variant="ghost"
                              onClick={(e) => {
                                e.stopPropagation();
                                startEditOrder(item);
                              }}
                              className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                            >
                              <Edit className="h-4 w-4" />
                            </Button>
                          </div>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium px-4 text-right whitespace-nowrap">
                        {item.release_year || (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium px-4 text-right whitespace-nowrap">
                        {item.runtime_minutes || (
                          <span className="text-slate-300 text-xs">—</span>
                        )}
                      </TableCell>
                      <TableCell className="text-slate-600 font-medium px-4 max-w-[200px] truncate">
                        <span
                          className="truncate block"
                          title={item.notes || ""}
                        >
                          {item.notes || (
                            <span className="text-slate-300 text-xs">—</span>
                          )}
                        </span>
                      </TableCell>
                    </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={9}
                      className="h-32 text-center text-slate-500 font-medium"
                    >
                      No carousel items found. Add your first carousel item to
                      get started.
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
        allowedFields={carouselAllowedFields}
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
    </div>
  );
}
