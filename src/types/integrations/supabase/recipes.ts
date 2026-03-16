import { CommonSchema, GetTableOpts } from "./common";

export enum RecipeCategory {
  Snacks = "snacks",
}
export interface RecipeMetadata {
  title: string;
  slug: string;
  image_url: string;
  short_description: string;
  ingredients: string;
  instructions: string;
  download_url: string | null;
  category: RecipeCategory;
  paired_project_id: string;
  paired_type: string | null;
  suggested_pairings: string | null;
  cook_time_estimate: string | null;
  preview_url: string;
  is_deleted: boolean;
  deleted_at: string | null;
}

export type SortRecipesBy = "created_at";

export type SearchableRecipeField = "title";
export type GetRecipesBy = "category" | "is_deleted";

export interface RecipeFormData extends RecipeMetadata {}

export interface GetRecipesOpts
  extends GetTableOpts<
    GetRecipesBy,
    SortRecipesBy,
    RecipeMetadata,
    SearchableRecipeField
  > {}

export interface Recipe extends CommonSchema, RecipeMetadata {}
