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
import { Plus, Edit, Trash2, Loader2, Pin, PinOff } from "lucide-react";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import MediaDialog from "@/components/MediaDialog";
import { Badge } from "@/components/ui/badge";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { supabase } from "@/lib";
import { toast } from "sonner";
import { Flag, Project } from "@/types";

// Type assertion to ensure Projects methods are available
const projectsAPI = Projects as Required<typeof Projects>;

type WatchCarouselItem = Partial<Project> & { id: string };

export default function WatchCarousel() {
  const [isMediaDialogOpen, setIsMediaDialogOpen] = useState(false);
  const [selectedMedia, setSelectedMedia] = useState<Partial<Project> | null>(
    null
  );
  const [isLoadingEditItem, setIsLoadingEditItem] = useState(false);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [mediaToDelete, setMediaToDelete] = useState<WatchCarouselItem | null>(
    null
  );
  const [editingOrderId, setEditingOrderId] = useState<string | null>(null);
  const [orderValue, setOrderValue] = useState<number | "">("");
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
    status: 120,
    platform_name: 150,
    order_index: 120,
    vibe_tags: 200,
    release_year: 120,
    runtime_minutes: 150,
    notes: 300,
  };

  const getStickyOffset = (columnKey: string): number => {
    const index = stickyColumns.indexOf(columnKey);
    if (index === -1) return 0;

    let offset = 0;
    for (let i = 0; i < index; i++) {
      offset += PINNED_WIDTH;
    }
    return offset;
  };

  const startEditOrder = (item: WatchCarouselItem) => {
    setEditingOrderId(item.id);
    setOrderValue(item.order_index ?? "");
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setOrderValue("");
  };

  const saveOrderIndex = async (item: WatchCarouselItem) => {
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
  } = useQuery<WatchCarouselItem[]>({
    queryKey: ["watch-carousel"],
    queryFn: async () => {
      const { data, error } = await supabase
        .from("projects")
        .select(
          "id, title, content_type, status, in_hero_carousel, poster_url, preview_url, rating, release_year, runtime_minutes, synopsis, notes, platform_name, audio_preview_url, order_index, is_deleted"
        )
        .in("content_type", ["Film", "TV Show"])
        .eq("in_hero_carousel", true)
        .eq("is_deleted", false)
        .order("order_index", { ascending: true });

      if (error) {
        throw new Error(error.message || "Failed to fetch carousel items");
      }

      return ((data || []) as WatchCarouselItem[]).filter(
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
      queryClient.invalidateQueries({ queryKey: ["watch-carousel"] });
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
      queryClient.invalidateQueries({ queryKey: ["watch-carousel"] });
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
      queryClient.invalidateQueries({ queryKey: ["watch-carousel"] });
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

  const handleEdit = async (media: WatchCarouselItem) => {
    setSelectedRowId(media.id);
    try {
      setIsLoadingEditItem(true);

      const { data, error } = await supabase
        .from("projects")
        .select("*")
        .eq("id", media.id)
        .single();

      if (error) {
        throw new Error(error.message || "Failed to fetch item details");
      }

      setSelectedMedia((data || {}) as Project);
      setIsMediaDialogOpen(true);
    } catch (err) {
      console.error(err);
      toast.error("Failed to load item for editing");
    } finally {
      setIsLoadingEditItem(false);
    }
  };

  const handleDelete = (media: WatchCarouselItem) => {
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
    "vibe_tags",
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

  const displayFields = [
    { key: "actions", label: "Actions" },
    { key: "title", label: "Title" },
    { key: "content_type", label: "Content Type" },
    { key: "status", label: "Status" },
    { key: "platform_name", label: "Platform" },
    { key: "order_index", label: "Order Index" },
    { key: "vibe_tags", label: "Vibe Tags" },
    { key: "release_year", label: "Release Year" },
    { key: "runtime_minutes", label: "Runtime Minutes" },
    { key: "notes", label: "Notes" },
  ];

  const orderedFields = [
    ...displayFields.filter(f => stickyColumns.includes(f.key)),
    ...displayFields.filter(f => !stickyColumns.includes(f.key))
  ];

  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      {/* Header */}
      <div className="flex flex-col md:flex-row md:items-center justify-between gap-4">
        <div>
          <h1 className="text-3xl font-bold tracking-tight text-slate-900">
            Watch Carousel
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
                  {orderedFields.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap px-4 bg-slate-50 group"
                      sticky={stickyColumns.includes(col.key) ? "left" : undefined}
                      left={stickyColumns.includes(col.key) ? getStickyOffset(col.key) : undefined}
                      width={stickyColumns.includes(col.key) ? PINNED_WIDTH : (COLUMN_WIDTHS[col.key] || 150)}
                      showShadow={stickyColumns.indexOf(col.key) === stickyColumns.length - 1}
                    >
                      <div className="flex items-center gap-2">
                        {col.label}
                        <Button
                          variant="ghost"
                          size="icon"
                          className={`h-4 w-4 transition-opacity ${stickyColumns.includes(col.key) ? "opacity-100" : "opacity-0 group-hover:opacity-100"}`}
                          onClick={() => toggleSticky(col.key)}
                        >
                          {stickyColumns.includes(col.key) ? (
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
                    <TableCell colSpan={orderedFields.length} className="h-64 text-center">
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        Loading carousel items...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : carouselItems.length > 0 ? (
                  [...carouselItems].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((item: WatchCarouselItem) => {
                    const isSelected = selectedRowId === item.id;
                    return (
                      <TableRow
                        key={item.id}
                        className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50"
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
                        {orderedFields.map((field) => {
                          const key = field.key;
                          if (key === "actions") {
                            return (
                              <TableCell
                                key="actions"
                                className="px-4 whitespace-nowrap"
                                sticky={stickyColumns.includes("actions") ? "left" : undefined}
                                left={stickyColumns.includes("actions") ? getStickyOffset("actions") : undefined}
                                width={PINNED_WIDTH}
                                showShadow={stickyColumns.indexOf("actions") === stickyColumns.length - 1}
                              >
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
                            );
                          }

                          if (key === "title") {
                            return (
                              <TableCell
                                key="title"
                                className="text-slate-600 font-medium px-4 max-w-[200px] truncate group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50"
                                sticky={stickyColumns.includes("title") ? "left" : undefined}
                                left={stickyColumns.includes("title") ? getStickyOffset("title") : undefined}
                                width={PINNED_WIDTH}
                                showShadow={stickyColumns.indexOf("title") === stickyColumns.length - 1}
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
                            );
                          }

                          const value = (item as any)[key];
                          return (
                            <TableCell
                              key={key}
                              className="text-slate-600 font-medium px-4 max-w-[200px] truncate group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50"
                              sticky={stickyColumns.includes(key) ? "left" : undefined}
                              left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                              width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                              showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
                            >
                              {key === "order_index" ? (
                                editingOrderId === item.id ? (
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
                                      className="text-green-600 hover:bg-green-50 h-8 w-8"
                                    >
                                      <span className="text-lg">✔</span>
                                    </Button>

                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={cancelEditOrder}
                                      className="text-slate-400 hover:bg-slate-100 h-8 w-8"
                                    >
                                      <span className="text-lg">✕</span>
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
                                      className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 h-6 w-6"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              ) : value === null || value === undefined || value === "" ? (
                                <span className="text-muted-foreground text-xs">—</span>
                              ) : (
                                (() => {
                                  let values: string[] = [];
                                  if (Array.isArray(value)) {
                                    values = value.map(String);
                                  } else if (typeof value === "string") {
                                    const trimmed = value.trim();
                                    if (trimmed.startsWith("[") && trimmed.endsWith("]")) {
                                      try {
                                        const parsed = JSON.parse(trimmed);
                                        values = Array.isArray(parsed) ? parsed.map(String) : [value];
                                      } catch (e) {
                                        values = [value];
                                      }
                                    } else if (value.includes(",")) {
                                      values = value.split(",").map((v) => v.trim()).filter(Boolean);
                                    } else {
                                      values = [value];
                                    }
                                  } else {
                                    values = [String(value)];
                                  }

                                  if (["content_type", "status", "genres", "vibe_tags"].includes(key)) {
                                    const MAX_TAGS = 3;
                                    const visible = values.slice(0, MAX_TAGS);
                                    const overflow = values.length - MAX_TAGS;
                                    return (
                                      <div className="flex items-center gap-1 flex-nowrap overflow-hidden">
                                        {visible.map((v, i) => (
                                          <Badge
                                            key={`${v}-${i}`}
                                            variant="secondary"
                                            className="bg-slate-100 text-slate-600 text-[10px] h-5 px-2 font-normal whitespace-nowrap shrink-0"
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
                                  return (
                                    <span className="truncate block" title={String(value)}>
                                      {String(value)}
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
                      colSpan={orderedFields.length}
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
        isLoading={
          isLoadingEditItem ||
          createMutation.isPending ||
          updateMutation.isPending
        }
        allowedFields={carouselAllowedFields}
        defaultValues={{ in_hero_carousel: true }}
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
