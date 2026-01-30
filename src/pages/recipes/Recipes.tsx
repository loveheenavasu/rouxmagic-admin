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
import { Plus, Edit, Trash2, Loader2 } from "lucide-react";
import { Recipes } from "@/api/integrations/supabase/recipes/recipes";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import RecipeDialog from "@/components/RecipeDialog";
import { toast } from "sonner";
import { Flag, Recipe } from "@/types";
import { StatsRow } from "@/components/StatsRow";
import { MediaFilters } from "@/components/MediaFilters";

const recipesAPI = Recipes as Required<typeof Recipes>;

export default function RecipesPage() {
  const [searchQuery, setSearchQuery] = useState("");
  const [categoryFilter, setCategoryFilter] = useState<string>("all");
  const [isDialogOpen, setIsDialogOpen] = useState(false);
  const [selectedRecipe, setSelectedRecipe] = useState<Recipe | null>(null);
  const [deleteDialogOpen, setDeleteDialogOpen] = useState(false);
  const [recipeToDelete, setRecipeToDelete] = useState<Recipe | null>(null);

  const queryClient = useQueryClient();

  const { data: categories = [] } = useQuery<string[]>({
    queryKey: ["recipe-categories"],
    queryFn: async () => {
      const response = await recipesAPI.get({ eq: [], limit: 200 });

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
      const eqFilters =
        categoryFilter !== "all"
          ? [{ key: "category" as const, value: categoryFilter }]
          : [];

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
      const response = await recipesAPI.deleteOneByIDPermanent(id);
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

  const displayFields = ["title", "category", "slug", "preview_url"];
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
                        Loading recipes...
                      </p>
                    </TableCell>
                  </TableRow>
                ) : recipes.length > 0 ? (
                  recipes.map((recipe: Recipe) => (
                    <TableRow
                      key={recipe.id}
                      className="hover:bg-slate-50/50 transition-colors"
                    >
                      {displayFields.map((key) => {
                        const value = (recipe as any)[key];
                        return (
                          <TableCell
                            key={key}
                            className="text-slate-600 font-medium px-4 max-w-[260px] truncate"
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
                      <TableCell className="text-right px-4 whitespace-nowrap">
                        <div className="flex justify-end gap-1">
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleEdit(recipe)}
                            className="text-slate-400 hover:text-indigo-600 hover:bg-indigo-50 rounded-lg"
                          >
                            <Edit className="h-4 w-4" />
                          </Button>
                          <Button
                            variant="ghost"
                            size="icon"
                            onClick={() => handleDelete(recipe)}
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
        title="Delete Recipe?"
        itemName={recipeToDelete?.title}
        isDeleting={deleteMutation.isPending}
      />
    </div>
  );
}
