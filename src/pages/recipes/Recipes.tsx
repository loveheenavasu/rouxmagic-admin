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
import { Input } from "@/components/ui/input";
import { Edit, Trash2, Loader2, Pin, PinOff } from "lucide-react";
import { Recipes } from "@/api/integrations/supabase/recipes/recipes";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import RecipeDialog from "@/components/RecipeDialog";
import { toast } from "sonner";
import { Flag, Recipe } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { cn } from "@/lib/utils";

const recipesAPI = Recipes as Required<typeof Recipes>;

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);
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
    preview_url: 150,
    ingredients: 150,
    instructions: 150,
    short_description: 150,
    image_url: 150,
    video_url: 150,
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

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["recipe-categories"],
    queryFn: async () => {
      const response = await recipesAPI.get({
        eq: [{ key: "is_deleted" as any, value: false }],
        limit: 200,
      });

      if (response.flag !== Flag.Success || !response.data) {
        return [];
      }

      const data = Array.isArray(response.data)
        ? (response.data as Recipe[])
        : ([response.data] as Recipe[]);

      const cats = data.map((r) => r.category).filter(Boolean);
      return Array.from(new Set(cats)).sort();
    },
  });

  const {
    data: recipes = [],
    isLoading,
    error,
  } = useQuery<Recipe[]>({
    queryKey: ["recipes", searchQuery, categoryFilter],
    queryFn: async () => {
      const eqFilters = [
        ...(categoryFilter !== "all"
          ? [{ key: "category" as const, value: categoryFilter }]
          : []),
        { key: "is_deleted" as any, value: false },
      ];

      const response = await recipesAPI.get({
        eq: eqFilters,
        sort: "created_at",
        sortBy: "dec",
        search: searchQuery || undefined,
        searchFields: ["title"],
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

      return data;
    },
  });
  const createMutation = useMutation({
    mutationFn: async (data: any) => {
      const response = await recipesAPI.createOne(data);
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
      console.log("RESPONSE HERE: ", response)
      return response.data;
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
      setIsDialogOpen(false);
      toast.success("Recipe created successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to create recipe: ${err.message}`);
    },
  });

  const updateMutation = useMutation({
    mutationFn: async ({ id, data }: { id: string; data: any }) => {
      const response = await recipesAPI.updateOneByID(id, data);
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
    },
    onSuccess: () => {
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
      setIsDialogOpen(false);
      setSelectedRecipe(null);
      toast.success("Recipe updated successfully!");
    },
    onError: (err: Error) => {
      toast.error(`Failed to update recipe: ${err.message}`);
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
      queryClient.invalidateQueries({ queryKey: ["recipes"] });
      queryClient.invalidateQueries({ queryKey: ["recipe-categories"] });
      setDeleteDialogOpen(false);
      setRecipeToDelete(null);
      toast.success("Recipe deleted successfully!");
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
      await updateMutation.mutateAsync({ id: selectedRecipe.id, data });
    } else {
      await createMutation.mutateAsync(data);
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
    "title",
    "category",
    "slug",
    "preview_url",
    "ingredients",
    "instructions",
    "short_description",
    "image_url",
    "video_url",
  ];
  const allAvailableFields = ["actions", ...displayFields];
  const orderedFields = [
    ...allAvailableFields.filter(key => stickyColumns.includes(key)),
    ...allAvailableFields.filter(key => !stickyColumns.includes(key))
  ];
  return (
    <div className="space-y-8 animate-in fade-in duration-500">
      <StatsRow
        title="Recipes Library"
        description="Manage recipes and pairings used across the app."
        handleNew={handleAddNew}
      />

      <Card className="border-none shadow-sm overflow-hidden bg-white">
        <div className="p-6 space-y-4">
          <div className="flex flex-col md:flex-row gap-4 md:items-center md:justify-between">
            <div className="flex-1">
              <Input
                placeholder="Search recipes by title..."
                value={searchQuery}
                onChange={(e) => setSearchQuery(e.target.value)}
                className="h-10"
              />
            </div>
            <div className="w-full md:w-56">
              <select
                className="h-10 w-full rounded-md border border-slate-200 bg-white px-3 text-sm text-slate-700 shadow-sm focus:outline-none focus:ring-2 focus:ring-indigo-500"
                value={categoryFilter}
                onChange={(e) => setCategoryFilter(e.target.value)}
              >
                <option value="all">All Categories</option>
                {categories.map((cat) => (
                  <option key={cat} value={cat}>
                    {cat}
                  </option>
                ))}
              </select>
            </div>
          </div>

          <div className="rounded-xl border border-slate-100 overflow-hidden">
            <Table>
              <TableHeader className="sticky top-0 z-40 bg-slate-50 shadow-sm">
                <TableRow>
                  {orderedFields.map((key) => (
                    <TableHead
                      key={key}
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap group"
                      sticky={stickyColumns.includes(key) ? "left" : undefined}
                      left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                      width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                    // showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
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
                                <div className="flex gap-1">
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

                          const value = (recipe as any)[key];
                          return (
                            <TableCell
                              key={key}
                              className={cn(
                                "text-slate-600 font-medium group-hover:bg-slate-50 group-data-[state=selected]:bg-indigo-50",
                                (key === "notes" || key === "description" || key === "short_description" || key === "ingredients" || key === "instructions") ? "max-w-[300px]" : "max-w-[250px]"
                              )}
                              sticky={stickyColumns.includes(key) ? "left" : undefined}
                              left={stickyColumns.includes(key) ? getStickyOffset(key) : undefined}
                              width={stickyColumns.includes(key) ? PINNED_WIDTH : (COLUMN_WIDTHS[key] || 150)}
                              showShadow={stickyColumns.indexOf(key) === stickyColumns.length - 1}
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
                      </TableRow>
                    );
                  })
                ) : (
                  <TableRow>
                    <TableCell
                      colSpan={displayFields.length + 1}
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
      </Card>

      <RecipeDialog
        open={isDialogOpen}
        onOpenChange={setIsDialogOpen}
        recipe={selectedRecipe as any}
        onSubmit={handleSubmit}
        isLoading={createMutation.isPending || updateMutation.isPending}
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
    </div>
  );
}
