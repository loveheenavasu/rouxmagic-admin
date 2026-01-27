import { APIResponse } from "@/core";
import { supabase } from "@/lib";
import {
  ProjectCRUDWrapper,
  Project,
  ProjectMetaData,
  GetProjectsBy,
  SortProjectsBy,
  Flag,
  Response,
  Callbacks,
  ProjectFormData
} from "@/types";

const TABLE_NAME = "projects";

export const Projects: ProjectCRUDWrapper = {
  async createOne(
    projectMetadata: ProjectFormData,
    cbs?: Callbacks
  ): Promise<Response<Project>> {
    cbs?.onLoadingStateChange?.(true);
    console.log("createOne projectMetadata:", projectMetadata);
    try {
      if (projectMetadata.in_coming_soon && projectMetadata.in_now_playing) {
        return new APIResponse(null, Flag.ValidationError).build();
      }
      const { commaSeperatedGenres, ...projectMetadataWithoutGenres } = projectMetadata;
      const { data, error } = await supabase
        .from(TABLE_NAME)
        .insert({...projectMetadataWithoutGenres, genres:commaSeperatedGenres.split(",").map((g)=>g.trim())})
        .select("*")
        .maybeSingle();
      if (error) {
        return new APIResponse(null, Flag.APIError, {
          output: error,
        }).build();
      }
      const res = new APIResponse(data).build();
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
        .update({...projectMetadataWithoutCommaGenres, genres:commaSeperatedGenres?.split(",").map((g)=>g.trim()) })
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
  ): Promise<Response> {
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
      return new APIResponse(null).build();
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

  async get<T extends Project | Project[] = Project[]>(
    opts: {
      eq: { key: GetProjectsBy; value: any }[];
      sort?: SortProjectsBy;
      sortBy?: "asc" | "dec";
      limit?: number;
      single?: boolean;
      maybeSingle?: boolean;
    },
    cbs?: Callbacks
  ): Promise<Response<T>> {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { eq, limit, single, maybeSingle, sortBy, sort } = opts;
      const query = supabase.from(TABLE_NAME).select("*");

      if (eq.length > 0) {
        eq.forEach(({ key, value }) => {
          query.eq(key, value);
        });
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

      const { data, error } = await query;
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
      cbs?.onLoadingStateChange?.(true);
    }
  },
  /**
   * @function softDeleteOneByID is not built yet because of missing assistive key in projects table, and should not implemented untill properly defined.
   */
  async softDeleteOneByID() {},
};
