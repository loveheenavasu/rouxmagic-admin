import { Recipes } from "@/api/integrations/supabase/recipes/recipes";
import { Projects } from "@/api/integrations/supabase/projects/projects";
import { useQueries, useMutation, useQueryClient } from "@tanstack/react-query";
import {
  Archive as ArchiveIcon,
  BookOpen,
  Film,
  Loader2,
  Music,
  RotateCcw,
  Search,
  Trash2,
  Utensils,
} from "lucide-react";
import { useMemo, useState } from "react";
import { Flag, Project, Recipe, Footer } from "@/types";
import {
  Card,
  CardContent,
  CardDescription,
  CardFooter,
  CardHeader,
  CardTitle,
} from "@/components/ui/card";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Badge } from "@/components/ui/badge";
import { cn } from "@/lib/utils";
import { toast } from "sonner";
import { ContentTypeEnum } from "@/types";
import DeleteConfirmationDialog from "@/components/DeleteConfirmationDialog";
import { Footers } from "@/api/integrations/supabase/footer/footer";

const recipesAPI = Recipes as Required<typeof Recipes>;
const projectsAPI = Projects as Required<typeof Projects>;
const footersAPI = Footers as Required<typeof Footers>;

export type ArchiveSource = "recipe" | "watch" | "listen" | "read" | "footer";

export interface ArchivedItem {
  source: ArchiveSource;
  id: string;
  title: string;
  subtitle?: string;
  raw: Recipe | Project | Footer; // <- updated
}

function getProjectSource(contentType: string): ArchiveSource {
  switch (contentType) {
    case ContentTypeEnum.Film:
    case ContentTypeEnum.TvShow:
      return "watch";
    case ContentTypeEnum.Song:
      return "listen";
    case ContentTypeEnum.Comic:
    case ContentTypeEnum.Book:
    case ContentTypeEnum.Audiobook:
      return "read";
    default:
      return "watch";
  }
}

const SOURCE_LABELS: Record<ArchiveSource, string> = {
  recipe: "Recipe",
  watch: "Watch",
  listen: "Listen",
  read: "Read",
  footer: "Footer", // <- new
};

const SOURCE_ICONS: Record<ArchiveSource, typeof Film> = {
  recipe: Utensils,
  watch: Film,
  listen: Music,
  read: BookOpen,
  footer: ArchiveIcon, // <- using archive icon
};

const SOURCE_BADGE_CLASS: Record<ArchiveSource, string> = {
  recipe: "bg-orange-100 text-orange-800 hover:bg-orange-100",
  watch: "bg-violet-100 text-violet-800 hover:bg-violet-100",
  listen: "bg-emerald-100 text-emerald-800 hover:bg-emerald-100",
  read: "bg-sky-100 text-sky-800 hover:bg-sky-100",
  footer: "bg-gray-100 text-gray-800 hover:bg-gray-100", // <- new
};

export default function Archive() {
  const [searchQuery, setSearchQuery] = useState("");
  const [permanentDeleteDialogOpen, setPermanentDeleteDialogOpen] =
    useState(false);
  const [itemToPermanentDelete, setItemToPermanentDelete] =
    useState<ArchivedItem | null>(null);
  const queryClient = useQueryClient();

  const [
    { data: recipes = [], isLoading: recipesLoading, error: recipesError },
    { data: projects = [], isLoading: projectsLoading, error: projectsError },
    { data: footers = [], isLoading: footersLoading, error: footersError },
  ] = useQueries({
    queries: [
      {
        queryKey: ["archived-recipes", searchQuery],
        queryFn: async () => {
          const response = await recipesAPI.get({
            eq: [{ key: "is_deleted", value: true }],
            sort: "created_at",
            sortBy: "dec",
            search: searchQuery || undefined,
            searchFields: ["title"],
          });
          if (response.flag !== Flag.Success || !response.data) {
            throw new Error(
              response.error?.message || "Failed to fetch archived recipes"
            );
          }
          return Array.isArray(response.data) ? response.data : [response.data];
        },
      },
      {
        queryKey: ["archived-projects", searchQuery],
        queryFn: async () => {
          const response = await projectsAPI.get({
            eq: [{ key: "is_deleted", value: true }],
            sort: "created_at",
            sortBy: "dec",
            search: searchQuery || undefined,
            searchFields: ["title", "content_type"],
          });
          if (
            response.flag !== Flag.Success &&
            response.flag !== Flag.UnknownOrSuccess
          ) {
            throw new Error(
              response.error?.message || "Failed to fetch archived items"
            );
          }
          if (!response.data) return [];
          return Array.isArray(response.data)
            ? response.data
            : [response.data].filter(Boolean);
        },
      },
      {
        queryKey: ["archived-footers", searchQuery],
        queryFn: async () => {
          const response = await footersAPI.get({
            eq: [{ key: "is_deleted", value: true }],
            sort: "created_at",
            sortBy: "dec",
            search: searchQuery || undefined,
            searchFields: ["title"],
          });
          if (response.flag !== Flag.Success) {
            throw new Error(
              response.error?.message || "Failed to fetch footers"
            );
          }
          return Array.isArray(response.data) ? response.data : [response.data];
        },
      },
    ],
  });

  const archivedItems = useMemo((): ArchivedItem[] => {
    const recipeItems: ArchivedItem[] = recipes.map((r) => ({
      source: "recipe",
      id: r.id,
      title: r.title,
      subtitle: r.category,
      raw: r,
    }));

    const projectItems: ArchivedItem[] = (projects as Project[]).map((p) => ({
      source: getProjectSource(p.content_type),
      id: p.id,
      title: p.title,
      subtitle: p.content_type,
      raw: p,
    }));

    const footerItems: ArchivedItem[] = (footers as Footer[]).map((f) => ({
      source: "footer",
      id: f.id,
      title: f.title,
      raw: f,
    }));

    const combined = [...recipeItems, ...projectItems, ...footerItems];
    combined.sort((a, b) => {
      const aDate =
        "deleted_at" in a.raw && a.raw.deleted_at
          ? a.raw.deleted_at
          : a.raw.created_at;
      const bDate =
        "deleted_at" in b.raw && b.raw.deleted_at
          ? b.raw.deleted_at
          : b.raw.created_at;
      return new Date(bDate).getTime() - new Date(aDate).getTime();
    });
    return combined;
  }, [recipes, projects, footers]);

  const isLoading = recipesLoading || projectsLoading || footersLoading;
  const error = recipesError || projectsError || footersError;

  const restoreMutation = useMutation({
    mutationFn: async (item: ArchivedItem) => {
      if (item.source === "recipe") {
        const res = await recipesAPI.toogleSoftDeleteOneByID(item.id, false);
        if (res.flag !== Flag.Success) {
          throw new Error(res.error?.message || "Failed to restore");
        }
      } else if (item.source === "footer") {
        const res = await footersAPI.toogleSoftDeleteOneByID(item.id, false);
        if (res.flag !== Flag.Success) {
          throw new Error(res.error?.message || "Failed to restore");
        }
      } else {
        const res = await projectsAPI.toogleSoftDeleteOneByID(item.id, false);
        if (res.flag !== Flag.Success && res.flag !== Flag.UnknownOrSuccess) {
          throw new Error(res.error?.message || "Failed to restore");
        }
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ["archived-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      queryClient.invalidateQueries({ queryKey: ["archived-footers"] }); // <- new
      toast.success(`"${item.title}" restored.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const deletePermanentMutation = useMutation({
    mutationFn: async (item: ArchivedItem) => {
      if (item.source === "recipe") {
        const res = await recipesAPI.deleteOneByIDPermanent(item.id);
        if (res.flag !== Flag.Success) {
          throw new Error(res.error?.message || "Failed to delete");
        }
      } else if (item.source === "footer") {
        const res = await footersAPI.deleteOneByIDPermanent(item.id);
        if (res.flag !== Flag.Success) {
          throw new Error(res.error?.message || "Failed to delete");
        }
      } else {
        const res = await projectsAPI.deleteOneByIDPermanent(item.id);
        if (res.flag !== Flag.Success && res.flag !== Flag.UnknownOrSuccess) {
          throw new Error(res.error?.message || "Failed to delete");
        }
      }
    },
    onSuccess: (_, item) => {
      queryClient.invalidateQueries({ queryKey: ["archived-recipes"] });
      queryClient.invalidateQueries({ queryKey: ["archived-projects"] });
      queryClient.invalidateQueries({ queryKey: ["archived-footers"] }); // <- new
      toast.success(`"${item.title}" permanently deleted.`);
    },
    onError: (err: Error) => {
      toast.error(err.message);
    },
  });

  const handleRestore = (item: ArchivedItem) => restoreMutation.mutate(item);

  const handlePermanentDeleteClick = (item: ArchivedItem) => {
    setItemToPermanentDelete(item);
    setPermanentDeleteDialogOpen(true);
  };

  const confirmPermanentDelete = () => {
    if (itemToPermanentDelete) {
      deletePermanentMutation.mutate(itemToPermanentDelete, {
        onSettled: () => {
          setPermanentDeleteDialogOpen(false);
          setItemToPermanentDelete(null);
        },
      });
    }
  };

  return (
    <div className="space-y-6">
      {/* Page header */}
      <div className="flex flex-col gap-4 sm:flex-row sm:items-center sm:justify-between">
        <div className="flex items-start gap-4">
          <div className="flex h-12 w-12 shrink-0 items-center justify-center rounded-2xl bg-gradient-to-br from-amber-50 to-orange-50 ring-1 ring-amber-100">
            <ArchiveIcon className="h-6 w-6 text-amber-600" />
          </div>
          <div>
            <h1 className="text-2xl font-bold tracking-tight text-slate-900">
              Archive
            </h1>
            <p className="mt-1 text-sm text-muted-foreground">
              Items moved to the bin from Recipe, Watch, Listen, and Read.
              Restore or delete permanently.
            </p>
          </div>
        </div>
        {!isLoading && !error && (
          <div className="flex items-center gap-2 rounded-xl bg-slate-50 px-4 py-2 text-sm">
            <span className="text-muted-foreground">In archive</span>
            <span className="font-semibold text-slate-900">
              {archivedItems.length}
            </span>
          </div>
        )}
      </div>

      {/* Search */}
      <div className="relative max-w-sm">
        <Search className="absolute left-3 top-1/2 h-4 w-4 -translate-y-1/2 text-muted-foreground" />
        <Input
          type="search"
          placeholder="Search archived items…"
          value={searchQuery}
          onChange={(e) => setSearchQuery(e.target.value)}
          className="h-11 rounded-xl border-slate-200 pl-10 focus-visible:ring-2 focus-visible:ring-amber-200"
        />
      </div>

      {/* Error state */}
      {error && (
        <Card className="rounded-2xl border-red-200 bg-red-50/50">
          <CardContent className="flex items-center gap-3 pt-6">
            <div className="flex h-10 w-10 shrink-0 items-center justify-center rounded-full bg-red-100">
              <ArchiveIcon className="h-5 w-5 text-red-600" />
            </div>
            <div>
              <p className="font-medium text-red-900">Couldn’t load archive</p>
              <p className="text-sm text-red-700">{(error as Error).message}</p>
            </div>
          </CardContent>
        </Card>
      )}

      {/* Loading state */}
      {isLoading && (
        <div className="flex flex-col items-center justify-center rounded-2xl border border-dashed border-slate-200 bg-slate-50/50 py-16">
          <Loader2 className="h-10 w-10 animate-spin text-amber-500" />
          <p className="mt-3 text-sm font-medium text-slate-600">
            Loading archive…
          </p>
        </div>
      )}

      {/* Empty state */}
      {!isLoading && !error && archivedItems.length === 0 && (
        <Card className="overflow-hidden rounded-2xl border-dashed border-slate-200 bg-slate-50/30">
          <CardContent className="flex flex-col items-center justify-center py-16 text-center">
            <div className="flex h-16 w-16 items-center justify-center rounded-2xl bg-slate-100">
              <ArchiveIcon className="h-8 w-8 text-slate-400" />
            </div>
            <h3 className="mt-4 text-lg font-semibold text-slate-900">
              No archived items
            </h3>
            <p className="mt-1 max-w-sm text-sm text-muted-foreground">
              {searchQuery
                ? "No items match your search. Try a different term."
                : "Items you move to the bin from Recipe, Watch, Listen, or Read will appear here."}
            </p>
          </CardContent>
        </Card>
      )}

      {/* Unified archive grid */}
      {!isLoading && !error && archivedItems.length > 0 && (
        <div className="grid gap-4 sm:grid-cols-2 lg:grid-cols-3">
          {archivedItems.map((item) => {
            const SourceIcon = SOURCE_ICONS[item.source];
            return (
              <Card
                key={`${item.source}-${item.id}`}
                className={cn(
                  "overflow-hidden rounded-2xl border-slate-200 transition-shadow hover:shadow-md",
                  "border-l-4 border-l-amber-400"
                )}
              >
                <CardHeader className="pb-2">
                  <div className="flex items-start justify-between gap-2">
                    <CardTitle className="line-clamp-2 text-lg leading-tight">
                      {item.title}
                    </CardTitle>
                    <Badge
                      variant="secondary"
                      className={cn(
                        "shrink-0 rounded-full font-medium",
                        SOURCE_BADGE_CLASS[item.source]
                      )}
                    >
                      <SourceIcon className="mr-1 h-3 w-3" />
                      {SOURCE_LABELS[item.source]}
                    </Badge>
                  </div>
                  {item.subtitle && (
                    <CardDescription className="text-xs uppercase tracking-wider">
                      {item.subtitle}
                    </CardDescription>
                  )}
                </CardHeader>
                <CardContent className="pt-0">
                  {item.source === "recipe" &&
                    "short_description" in item.raw &&
                    item.raw.short_description && (
                      <p className="line-clamp-2 text-sm text-muted-foreground">
                        {item.raw.short_description}
                      </p>
                    )}
                  {item.source !== "recipe" && "content_type" in item.raw && (
                    <p className="text-sm text-muted-foreground">
                      {item.raw.content_type}
                    </p>
                  )}
                </CardContent>
                <CardFooter className="flex gap-2 border-t border-slate-100 bg-slate-50/50 pt-4">
                  <Button
                    variant="outline"
                    size="sm"
                    className="flex-1 rounded-xl border-slate-200"
                    onClick={() => handleRestore(item)}
                    disabled={
                      restoreMutation.isPending ||
                      deletePermanentMutation.isPending
                    }
                  >
                    {restoreMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <RotateCcw className="mr-2 h-4 w-4" />
                    )}
                    Restore
                  </Button>
                  <Button
                    variant="destructive"
                    size="sm"
                    className="flex-1 rounded-xl"
                    onClick={() => handlePermanentDeleteClick(item)}
                    disabled={
                      restoreMutation.isPending ||
                      deletePermanentMutation.isPending
                    }
                  >
                    {deletePermanentMutation.isPending ? (
                      <Loader2 className="mr-2 h-4 w-4 animate-spin" />
                    ) : (
                      <Trash2 className="mr-2 h-4 w-4" />
                    )}
                    Delete
                  </Button>
                </CardFooter>
              </Card>
            );
          })}
        </div>
      )}

      <DeleteConfirmationDialog
        open={permanentDeleteDialogOpen}
        onOpenChange={(open) => {
          setPermanentDeleteDialogOpen(open);
          if (!open) setItemToPermanentDelete(null);
        }}
        onConfirm={confirmPermanentDelete}
        title="Permanently delete?"
        description={
          itemToPermanentDelete
            ? `"${itemToPermanentDelete.title}" will be removed forever. This cannot be undone.`
            : "This item will be removed forever. This cannot be undone."
        }
        itemName={itemToPermanentDelete?.title}
        isDeleting={deletePermanentMutation.isPending}
        confirmLabel="Delete permanently"
      />
    </div>
  );
}
