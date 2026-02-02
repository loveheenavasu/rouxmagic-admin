import { CRUDWrapper } from "@/core";
import {
  Project,
  GetProjectsOpts,
<<<<<<< Updated upstream
=======
  Flag,
  Response,
  Callbacks,
>>>>>>> Stashed changes
  ProjectFormData,
  Tables
} from "@/types";

<<<<<<< Updated upstream
export const Projects = new CRUDWrapper<Project, ProjectFormData, GetProjectsOpts>(Tables.Projects);
=======
const TABLE_NAME = Tables.Projects;

export const Projects: ProjectCRUDWrapper = {
  async createOne(
    data: ProjectFormData,
    cbs?: Callbacks
  ): Promise<Response<Project>> {
    cbs?.onLoadingStateChange?.(true);
    console.log("createOne projectMetadata:", data);
    try {
      if (data.in_coming_soon && data.in_now_playing) {
        return new APIResponse(null, Flag.ValidationError).build();
      }
      const { commaSeperatedGenres, ...projectMetadataWithoutGenres } = data;
      const { data:ApiData, error } = await supabase
        .from(TABLE_NAME)
        .insert({...projectMetadataWithoutGenres, genres:commaSeperatedGenres?.split(",")?.map((g)=>g?.trim())})
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      const res = new APIResponse(ApiData).build();
      console.log("createOne response:", res);
      return res;
      // return new APIResponse(data).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },

  async updateOneByID(
    projectId: string,
    update: Partial<ProjectFormData>,
    cbs?: Callbacks
  ): Promise<Response<Project>> {
    cbs?.onLoadingStateChange?.(true);
    try {
        const { commaSeperatedGenres, ...projectMetadataWithoutCommaGenres } = update;
      // Check if update object is empty or has no valid fields
      if (!update || Object.keys(update).length === 0) {
        return new APIResponse(null, Flag.ValidationError, {
          message: "No updates found.",
        }).build();
      }
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .update({...projectMetadataWithoutCommaGenres, genres:commaSeperatedGenres?.split(",")?.map((g)=>g?.trim()) })
        .eq("id", projectId)
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(data).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },

  async deleteOneByIDPermanent(
    projectId: string,
    cbs?: Callbacks
  ): Promise<Response<null>> {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { error } = await supabase
        .from(TABLE_NAME)
        .delete()
        .eq("id", projectId);
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
  async getByID(projectId: string, cbs?: Callbacks): Promise<Response> {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .select("*")
        .eq("id", projectId)
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      return new APIResponse(data).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  },

  async get(
    opts: GetProjectsOpts,
    cbs?: Callbacks
  ): Promise<Response<Project | Project[]>> {
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

      if(or && typeof or === "string"){
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
      projectId?: string,
      intent?: boolean,
      cbs?: Callbacks
    ) {
      cbs?.onLoadingStateChange?.(true);
      try {
        const { data, error } = await supabase
          .from(TABLE_NAME)
          .update({
            is_deleted: intent,
            deleted_at: !!intent ? null : new Date().toISOString(),
          })
          .eq("id", projectId)
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
>>>>>>> Stashed changes
