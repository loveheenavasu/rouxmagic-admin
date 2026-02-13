import { useEffect, useState } from "react";
import {
  Dialog,
  DialogContent,
  DialogDescription,
  DialogHeader,
  DialogTitle,
} from "@/components/ui/dialog";
import { Button } from "@/components/ui/button";
import { Input } from "@/components/ui/input";
import { Label } from "@/components/ui/label";
import { Textarea } from "@/components/ui/textarea";
import { Loader2, Upload } from "lucide-react";
import { mediaService } from "@/services/mediaService";
import { toast } from "sonner";
import { RecipeCategory, RecipeFormData, PairingSourceEnum, Recipe } from "@/types";
import PairingsSection from "@/components/PairingsSection";

interface RecipeDialogProps {
  open: boolean;
  onOpenChange: (open: boolean) => void;
  recipe?: Recipe | null;
  onSubmit: (data: RecipeFormData) => Promise<void>;
  isLoading?: boolean;
}

const emptyForm: RecipeFormData = {
  title: "",
  slug: "",
  image_url: "",
  short_description: "",
  ingredients: "",
  instructions: "",
  category: RecipeCategory.Snacks,
  paired_project_id: "",
  paired_type: null,
  suggested_pairings: null,
  cook_time_estimate: null,
  preview_url: "",
  video_url: null,
  order_index: undefined,
  is_deleted: false,
  deleted_at: null,
};

export default function RecipeDialog({
  open,
  onOpenChange,
  recipe,
  onSubmit,
  isLoading = false,
}: RecipeDialogProps) {
  const [formData, setFormData] = useState<RecipeFormData>(emptyForm);
  const [isUploading, setIsUploading] = useState<string | null>(null);

  useEffect(() => {
    if (open) {
      if (recipe) {
        setFormData({
          ...emptyForm,
          ...recipe,
        });
      } else {
        setFormData(emptyForm);
      }
    }
  }, [open, recipe]);

  const handleChange = (field: keyof RecipeFormData, value: any) => {
    setFormData((prev) => ({ ...prev, [field]: value }));
  };

  const handleSubmit = async (e: React.FormEvent) => {
    e.preventDefault();

    if (!formData.title || !formData.slug || !formData.category) {
      return;
    }

    await onSubmit(formData);
  };

  return (
    <Dialog open={open} onOpenChange={onOpenChange}>
      <DialogContent className="max-w-2xl max-h-[90vh] overflow-y-auto p-0 gap-0 border-none">
        <div className="p-6 border-b sticky top-0 bg-white z-10">
          <DialogHeader>
            <DialogTitle className="text-2xl font-bold">
              {recipe ? "Edit Recipe" : "Add Recipe"}
            </DialogTitle>
            <DialogDescription className="text-muted-foreground">
              Manage recipe metadata used across the app.
            </DialogDescription>
          </DialogHeader>
        </div>

        <form onSubmit={handleSubmit} className="p-6 space-y-6">
          <div className="grid grid-cols-1 md:grid-cols-2 gap-4">
            <div>
              <Label htmlFor="title" className="font-medium">
                Title *
              </Label>
              <Input
                id="title"
                value={formData.title}
                onChange={(e) => handleChange("title", e.target.value)}
                placeholder="Recipe title"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="slug" className="font-medium">
                Slug *
              </Label>
              <Input
                id="slug"
                value={formData.slug}
                onChange={(e) => handleChange("slug", e.target.value)}
                placeholder="URL slug (e.g. spicy-tacos)"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="category" className="font-medium">
                Category *
              </Label>
              <Input
                id="category"
                value={formData.category}
                onChange={(e) => handleChange("category", e.target.value)}
                placeholder="e.g. Dessert, Cocktail"
                className="mt-1.5"
                required
              />
            </div>

            <div>
              <Label htmlFor="order_index" className="font-medium">
                Order Index
              </Label>
              <Input
                id="order_index"
                type="number"
                value={formData.order_index ?? ""}
                onChange={(e) =>
                  handleChange("order_index", parseInt(e.target.value) || undefined)
                }
                placeholder="e.g. 1"
                className="mt-1.5"
              />
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="image_url" className="font-medium">
                Image URL
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="image_url"
                  value={formData.image_url}
                  onChange={(e) => handleChange("image_url", e.target.value)}
                  placeholder="Public image URL or upload"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    className="hidden"
                    id="file-image_url"
                    accept="image/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading("image_url");
                        const bucket = "Media";
                        const safeName = file.name.replace(/\s+/g, "_");
                        const path = `Recipes/images/${Date.now()}-${safeName}`;
                        const publicUrl = await mediaService.uploadFile(
                          file,
                          bucket,
                          path,
                        );
                        handleChange("image_url", publicUrl);
                        toast.success("Image uploaded successfully!");
                      } catch (error: any) {
                        toast.error(
                          `Image upload failed: ${error?.message || "Unknown error"
                          }`,
                        );
                      } finally {
                        setIsUploading(null);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading === "image_url"}
                    onClick={() =>
                      document.getElementById("file-image_url")?.click()
                    }
                    className="h-10 px-3 bg-slate-50 border-dashed"
                  >
                    {isUploading === "image_url" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Upload</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="preview_url" className="font-medium">
                Preview URL
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="preview_url"
                  value={formData.preview_url}
                  onChange={(e) => handleChange("preview_url", e.target.value)}
                  placeholder="Preview media URL or upload"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    className="hidden"
                    id="file-preview_url"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading("preview_url");
                        const bucket = "Media";
                        const safeName = file.name.replace(/\s+/g, "_");
                        const path = `Recipes/previews/${Date.now()}-${safeName}`;
                        const publicUrl = await mediaService.uploadFile(
                          file,
                          bucket,
                          path,
                        );
                        handleChange("preview_url", publicUrl);
                        toast.success("Preview uploaded successfully!");
                      } catch (error: any) {
                        toast.error(
                          `Preview upload failed: ${error?.message || "Unknown error"
                          }`,
                        );
                      } finally {
                        setIsUploading(null);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading === "preview_url"}
                    onClick={() =>
                      document.getElementById("file-preview_url")?.click()
                    }
                    className="h-10 px-3 bg-slate-50 border-dashed"
                  >
                    {isUploading === "preview_url" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Upload</span>
                  </Button>
                </div>
              </div>
            </div>

            <div className="md:col-span-2">
              <Label htmlFor="video_url" className="font-medium">
                Video URL
              </Label>
              <div className="mt-1.5 flex gap-2">
                <Input
                  id="video_url"
                  value={formData.video_url || ""}
                  onChange={(e) => handleChange("video_url", e.target.value)}
                  placeholder="Main video URL or upload"
                  className="flex-1"
                />
                <div className="relative">
                  <Input
                    type="file"
                    className="hidden"
                    id="file-video_url"
                    accept="video/*"
                    onChange={async (e) => {
                      const file = e.target.files?.[0];
                      if (!file) return;
                      try {
                        setIsUploading("video_url");
                        const bucket = "Media";
                        const safeName = file.name.replace(/\s+/g, "_");
                        const path = `Recipes/videos/${Date.now()}-${safeName}`;
                        const publicUrl = await mediaService.uploadFile(
                          file,
                          bucket,
                          path,
                        );
                        handleChange("video_url", publicUrl);
                        toast.success("Video uploaded successfully!");
                      } catch (error: any) {
                        toast.error(
                          `Video upload failed: ${error?.message || "Unknown error"
                          }`,
                        );
                      } finally {
                        setIsUploading(null);
                      }
                    }}
                  />
                  <Button
                    type="button"
                    variant="outline"
                    disabled={isUploading === "video_url"}
                    onClick={() =>
                      document.getElementById("file-video_url")?.click()
                    }
                    className="h-10 px-3 bg-slate-50 border-dashed"
                  >
                    {isUploading === "video_url" ? (
                      <Loader2 className="h-4 w-4 animate-spin" />
                    ) : (
                      <Upload className="h-4 w-4" />
                    )}
                    <span className="ml-2 hidden sm:inline">Upload</span>
                  </Button>
                </div>
              </div>
            </div>


            <div>
              <Label htmlFor="cook_time_estimate" className="font-medium">
                Cook Time Estimate
              </Label>
              <Input
                id="cook_time_estimate"
                value={formData.cook_time_estimate ?? ""}
                onChange={(e) =>
                  handleChange("cook_time_estimate", e.target.value || null)
                }
                placeholder="e.g. 30 minutes"
                className="mt-1.5"
              />
            </div>

          </div>

          <div className="space-y-4">
            <div>
              <Label htmlFor="short_description" className="font-medium">
                Short Description
              </Label>
              <Textarea
                id="short_description"
                value={formData.short_description}
                onChange={(e) =>
                  handleChange("short_description", e.target.value)
                }
                placeholder="A short summary of the recipe"
                className="mt-1.5 min-h-[80px]"
              />
            </div>

            <div>
              <Label htmlFor="ingredients" className="font-medium">
                Ingredients
              </Label>
              <Textarea
                id="ingredients"
                value={formData.ingredients}
                onChange={(e) => handleChange("ingredients", e.target.value)}
                placeholder="List ingredients, one per line"
                className="mt-1.5 min-h-[120px]"
              />
            </div>

            <div>
              <Label htmlFor="instructions" className="font-medium">
                Instructions
              </Label>
              <Textarea
                id="instructions"
                value={formData.instructions}
                onChange={(e) => handleChange("instructions", e.target.value)}
                placeholder="Step-by-step instructions"
                className="mt-1.5 min-h-[160px]"
              />
            </div>
          </div>

          {/* Pairings section */}
          {recipe?.id && (
            <PairingsSection
              sourceId={recipe.id}
              sourceRef={PairingSourceEnum.Recipe}
            />
          )}

          <div className="flex justify-end gap-3 pt-4">
            <Button
              type="button"
              variant="outline"
              onClick={() => onOpenChange(false)}
              disabled={isLoading}
              className="px-6 h-11 rounded-xl"
            >
              Cancel
            </Button>
            <Button
              type="submit"
              disabled={isLoading}
              className="px-8 h-11 rounded-xl bg-indigo-600 hover:bg-indigo-700 shadow-lg shadow-indigo-100"
            >
              {isLoading && <Loader2 className="mr-2 h-4 w-4 animate-spin" />}
              {recipe ? "Update Recipe" : "Save Recipe"}
            </Button>
          </div>
        </form>
      </DialogContent>
    </Dialog>
  );
}
