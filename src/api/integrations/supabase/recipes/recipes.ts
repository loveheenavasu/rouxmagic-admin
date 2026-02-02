import { APIResponse } from "@/core";
import { supabase } from "@/lib";
import {
  RecipeCRUDWrapper,
  RecipeFormData,
  Callbacks,
  GetRecipesOpts,
  Flag,
} from "@/types";

const TABLE_NAME = "recipes";

export const Recipes: RecipeCRUDWrapper = {
  async createOne(data: RecipeFormData, cbs?: Callbacks) {
    cbs?.onLoadingStateChange?.(true);
    const { paired_project_id, ...rest } = data;
    console.log("createOne projectMetadata:", data);
    try {
      const { data: ApiData, error } = await supabase
        .from(TABLE_NAME)
        .insert({ ...rest })
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(ApiData, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },
  async updateOneByID(
    recipeId: string,
    update: Partial<RecipeFormData>,
    cbs?: Callbacks
  ) {
    cbs?.onLoadingStateChange?.(true);
    try {
      if (!update || Object.keys(update).length === 0) {
        return new APIResponse(null, Flag.ValidationError, {
          message: "No updates found.",
        }).build();
      }
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({ ...update })
        .eq("id", recipeId)
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(data, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },
  async deleteOneByIDPermanent(recipeId: string, cbs?: Callbacks) {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", recipeId);
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(null, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },
  async getByID(recipeId: string, cbs?: Callbacks) {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("id", recipeId)
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(data, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },
  async get(opts: GetRecipesOpts, cbs?: Callbacks) {
    cbs?.onLoadingStateChange?.(true);
    try {
      const {
        eq,
        or,
        inValue,
        limit,
        single,
        maybeSingle,
        sortBy,
        sort,
        search,
        searchFields,
      } = opts;

      const query = supabase.from(TABLE_NAME).select("*");

      if (eq && eq.length > 0) {
        eq.forEach(({ key, value }) => {
          query.eq(key, value);
        });
      }

      if (or && typeof or === "string") {
        query.or(or);
      }

      if (inValue?.key && inValue?.value?.length) {
        query.in(inValue.key, inValue.value);
      }

      if (typeof limit === "number" && limit > 0) {
        query.limit(limit);
      }
      if (single && !maybeSingle) {
        query.single();
      }
      if (maybeSingle && !single) {
        query.maybeSingle();
      }

      if (sort) {
        query.order(sort, { ascending: sortBy === "asc" });
      }

      // Apply server-side search so filtering happens in the API, not the UI
      if (search && search.trim()) {
        const trimmed = search.trim();
        const fields =
          searchFields && searchFields.length > 0
            ? searchFields
            : (["title", "platform", "notes"] as const);

        const pattern = `%${trimmed}%`;
        const orFilters = fields
          .map((field) => `${field}.ilike.${pattern}`)
          .join(",");

        // Supabase Postgrest: combine OR conditions across multiple columns
        query.or(orFilters);
      }

      const { data, error } = await query;
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(data, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(true);
    }
  },
  /**
   * @function softDeleteOneByID is not built yet because of missing assistive key in projects table, and should not implemented untill properly defined.
   */
  async toogleSoftDeleteOneByID(
    recipeId?: string,
    intent?: boolean,
    cbs?: Callbacks
  ) {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({
          is_deleted: intent,
          deleted_at: !!intent ?  new Date().toISOString() : null ,
        })
        .eq("id", recipeId)
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, { output: error }).build();
      }
      return new APIResponse(data, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },
};
