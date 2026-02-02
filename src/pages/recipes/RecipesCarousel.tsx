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
        sort: "created_at",
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

      return data;
    },
  });

  const createOrUpdateMutation = useMutation({
    mutationFn: async (payload: { id?: string; data: any }) => {
      if (payload.id) {
        const response = await recipesAPI.updateOneByID(
          payload.id,
          payload.data,
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
      queryClient.invalidateQueries({ queryKey: ["recipes-carousel"] });
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

  const columns = [
    { key: "title", label: "Title" },
    { key: "category", label: "Category" },
    { key: "slug", label: "Slug" },
    { key: "preview_url", label: "Preview URL" },
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
              <TableHeader className="bg-slate-50/50">
                <TableRow>
                  {columns.map((col) => (
                    <TableHead
                      key={col.key}
                      className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 whitespace-nowrap px-4"
                    >
                      {col.label}
                    </TableHead>
                  ))}
                  <TableHead className="text-xs font-bold uppercase tracking-wider text-slate-500 py-4 text-right whitespace-nowrap px-4">
                    Actions
                  </TableHead>
                </TableRow>
              </TableHeader>
              <TableBody>
                {isLoading ? (
                  <TableRow>
                    <TableCell
                      colSpan={columns.length + 1}
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
                      {columns.map((col) => {
                        const value = (recipe as any)[col.key];
                        return (
                          <TableCell
                            key={col.key}
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
                      colSpan={columns.length + 1}
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
    </div>
  );
}
