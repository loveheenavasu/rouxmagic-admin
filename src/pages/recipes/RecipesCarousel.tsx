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
import { Recipes } from "@/api/integrations/supabase/recipes/recipes";
import RecipeDialog from "@/components/RecipeDialog";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { toast } from "sonner";
import { Flag, Recipe } from "@/types";

const recipesAPI = Recipes as Required<typeof Recipes>;

export default function RecipesCarousel() {
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
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
    category: 150,
    slug: 150,
    order_index: 120,
    short_description: 250,
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

  const startEditOrder = (item: Recipe) => {
    setEditingOrderId(item.id);
    setOrderValue(item.order_index ?? "");
  };

  const cancelEditOrder = () => {
    setEditingOrderId(null);
    setOrderValue("");
  };

  const saveOrderIndex = async (item: Recipe) => {
    if (orderValue === "" || orderValue === item.order_index) {
      cancelEditOrder();
      return;
    }

    const newIndex = Number(orderValue);
    const oldIndex = item?.order_index;

    // Find conflicting item
    const conflictingItem = recipes.find(
      (i) => i.order_index === newIndex && i.id !== item.id
    );

    try {
      // If conflict exists → swap its order_index
      if (conflictingItem) {
        await createOrUpdateMutation.mutateAsync({
          id: conflictingItem.id,
          data: { order_index: oldIndex },
        });
      }

      // Update current item
      await createOrUpdateMutation.mutateAsync({
        id: item.id,
        data: { order_index: newIndex },
      });

      toast.success("Order index updated");
      cancelEditOrder();
    } catch (err: any) {
      console.error(err);
      toast.error("Failed to update order index");
    }
  };

  const queryClient = useQueryClient();

  const {
    data: recipes = [],
    isLoading,
    error,
  } = useQuery<Recipe[]>({
    queryKey: ["recipes-carousel"],
    queryFn: async () => {
      const response = await recipesAPI.get({
        eq: [],
        sort: "order_index",
        sortBy: "asc",
      });

      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to fetch recipes";
        throw new Error(errorMessage);
      }

      const data = Array.isArray(response.data)
        ? (response.data as Recipe[])
        : ([response.data] as Recipe[]);

      return data.filter((item) => item.is_deleted !== true);
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: any }) => {
      if (payload.id) {
        const response = await recipesAPI.updateOneByID(
          payload.id,
          payload.data
        );
        if (response.flag !== Flag.Success || !response.data) {
          const supabaseError = response.error?.output as
            | { message?: string }
            | undefined;
          const errorMessage =
            supabaseError?.message ||
            response.error?.message ||
            "Failed to update recipe";
          throw new Error(errorMessage);
        }
        return response.data;
      }

      const response = await recipesAPI.createOne(payload.data);
      if (response.flag !== Flag.Success || !response.data) {
        const supabaseError = response.error?.output as
          | { message?: string }
          | undefined;
        const errorMessage =
          supabaseError?.message ||
          response.error?.message ||
          "Failed to create recipe";
        throw new Error(errorMessage);
      }
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes-carousel"] });
      setIsDialogOpen(false);
      setSelectedRecipe(null);
      toast.success("Recipe saved successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to save recipe: ${err.message}`);
    },
  });

  const deleteMutation = useMutation({
    mutationFn: async (id: string) => {
      const response = await recipesAPI.toogleSoftDeleteOneByID(id, true);
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
          "Failed to delete recipe";
        throw new Error(errorMessage);
      }
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes-carousel"] });
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
      toast.success("Moved to archive.");
    },
    onError: (err: Error) => {
      toast.error(`Failed to delete recipe: ${err.message}`);
    },
  });

  const handleAddNew = () => {
    setSelectedRecipe(null);
    setIsDialogOpen(true);
  };

  const handleEdit = (recipe: Recipe) => {
    setSelectedRecipe(recipe);
    setSelectedRowId(recipe.id);
    setIsDialogOpen(true);
  };

  const handleDelete = (recipe: Recipe) => {
    setRecipeToDelete(recipe);
    setDeleteDialogOpen(true);
  };

  const handleSubmit = async (data: any) => {
    if (selectedRecipe) {
      await createOrUpdateMutation.mutateAsync({ id: selectedRecipe.id, data });
    } else {
      await createOrUpdateMutation.mutateAsync({ data });
    }
  };

  const confirmDelete = async () => {
    if (recipeToDelete) {
      await deleteMutation.mutateAsync(recipeToDelete.id);
    }
  };

  if (error) {
    return (
      <div className="flex items-center justify-center h-96">
        <div className="text-center text-red-500">
          <h2 className="text-2xl font-bold mb-2">Error Loading Recipes</h2>
          <p>{(error as Error).message}</p>
        </div>
      </div>
    );
  }

  const displayFields = [
    { key: "actions", label: "Actions" },
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "slug", label: "Slug" },
    { key: "preview_url", label: "Preview URL" },
    { key: "order_index", label: "Order Index" },
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
            Recipe Carousel
          </h1>
          <p className="text-muted-foreground mt-1">
            Manage recipes that appear in the recipe carousel.
          </p>
        </div>
        <Button
          onClick={handleAddNew}
          className="bg-indigo-600 hover:bg-indigo-700 text-white px-6 h-11 rounded-xl shadow-lg shadow-indigo-200 transition-all hover:scale-[1.02]"
        >
          <Plus className="mr-2 h-5 w-5" />
          Add Recipe
        </Button>
      </div>

      {/* Table */}
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
                    <TableCell
                      colSpan={orderedFields.length}
                      className="h-64 text-center"
                    >
                      <Loader2 className="h-8 w-8 animate-spin mx-auto text-indigo-600" />
                      <p className="mt-2 text-sm text-slate-500 font-medium">
                        Loading recipes...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : recipes.length > 0 ? (
                  [...recipes].sort((a, b) => a.id === selectedRowId ? -1 : b.id === selectedRowId ? 1 : 0).map((recipe: Recipe) => {
                    const isSelected = selectedRowId === recipe.id;
                    return (
                      <TableRow
                        key={recipe.id}
                        className={`transition-colors cursor-pointer group ${isSelected ? "bg-indigo-50 hover:bg-indigo-50 sticky top-[48px] z-20 shadow-sm" : "hover:bg-slate-50"
                          }`}
                        onClick={() => setSelectedRowId(isSelected ? null : recipe.id)}
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
                                      handleEdit(recipe);
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
                                      handleDelete(recipe);
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
                                  title={recipe.title || ""}
                                >
                                  {recipe.title || (
                                    <span className="text-slate-300 text-xs">—</span>
                                  )}
                                </span>
                              </TableCell>
                            );
                          }

                          const value = (recipe as any)[key];
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
                                editingOrderId === recipe.id ? (
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
                                      onClick={() => saveOrderIndex(recipe)}
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
                                    <span>{recipe.order_index ?? "—"}</span>
                                    <Button
                                      size="icon"
                                      variant="ghost"
                                      onClick={(e) => {
                                        e.stopPropagation();
                                        startEditOrder(recipe);
                                      }}
                                      className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50"
                                    >
                                      <Edit className="h-4 w-4" />
                                    </Button>
                                  </div>
                                )
                              ) : (
                                value || <span className="text-slate-300 text-xs">—</span>
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
                      No recipes found.
                    </TableCell>
                  </TableRow>
                )}
              </TableBody>
            </Table>
          </div>
        </div>
      </Card >

      <RecipeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recipe={selectedRecipe as any}
        onSubmit={handleSubmit}
        isLoading={createOrUpdateMutation.isPending}
      />

      <DeleteConfirmationDialog
        open={deleteDialogOpen}
        onOpenChange={setDeleteDialogOpen}
        onConfirm={confirmDelete}
        itemName={recipeToDelete?.title}
        isDeleting={deleteMutation.isPending}
        description={
          recipeToDelete
            ? `Are you sure you want to move "${recipeToDelete.title}" to the bin? You’ll be able to permanently delete it later from the Archive.`
            : "Are you sure you want to move this item to the bin? You’ll be able to permanently delete it later from the Archive."
        }
      />
    </div >
  );
}
