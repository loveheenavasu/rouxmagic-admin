import { CRUDWrapper } from "@/core";
import {
  RecipeFormData,
  GetRecipesOpts,
  Tables,
  Recipe,
} from "@/types";

export const Recipes = new CRUDWrapper<Recipe, RecipeFormData, GetRecipesOpts>(Tables.Chapters)