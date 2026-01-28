import { CRUDWrapperBase } from "@/types/api/CRUDWrapper";
import { CommonSchema } from "./common";

export interface RecipeMetadata {
  title: string;
  slug: string;
  image_url: string;
  short_description: string;
  ingredients: string;
  instructions: string;
  download_url: string | null;
  category: string;
  paired_project_id: string;
  paired_type: string | null;
  suggested_pairings: string | null;
  cook_time_estimate: string | null;
  preview_url: string;
}

export type SortRecipesBy = "created_at"

export type SearchableRecipeField = "title" | "platform" | "notes" | "content_type";
export type GetRecipesBy = "content_type" | "status" | "in_now_playing" | "in_coming_soon" | "in_latest_releases"

export interface RecipeFormData extends RecipeMetadata {}

export type GetRecipesOpts = {
   eq?: { key: GetRecipesBy; value: any }[];
    sort?: SortRecipesBy;
    sortBy?: "asc" | "dec";
    limit?: number;
    single?: boolean;
    maybeSingle?: boolean;
    or?: string;
    inValue?:{key: keyof RecipeMetadata, value: any[]}
    search?: string;
    searchFields?: SearchableRecipeField[];
}

/**
 * @wrapper projects api
 */

export interface RecipeCRUDWrapper extends Partial<CRUDWrapperBase<Recipe | Recipe[], RecipeFormData, Partial<RecipeFormData> , any>>{}
// ProjectFormData, ProjectFormData, GetProjectsOpts
export interface Recipe extends CommonSchema, RecipeMetadata {}
