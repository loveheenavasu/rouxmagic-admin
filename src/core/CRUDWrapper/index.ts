import {
  Callbacks,
  Flag,
  GetTableOpts,
  ProjectFormData,
  Response,
  Tables,
} from "@/types";
import { APIResponse } from "../response";
import { supabase } from "@/lib";
import { validator } from "@/helpers";

const {
  amend: { deleteUnwantedValues },
} = validator;

interface TableBehaviour {
  supports_soft_deletion?: boolean;
}

export class CRUDWrapper<
  Table,
  TableFormData,
  GetOptions extends GetTableOpts<any, any, any, any> = any
> {
  constructor(
    private readonly table_name: Tables,
    private readonly behaviour: TableBehaviour = {
      supports_soft_deletion: true,
    }
  ) {}

  thisTable() {
    return {
      table_name: this.table_name,
      table_behaviour: this.behaviour,
    };
  }

  async createOne(
    data: TableFormData,
    cbs?: Callbacks
  ): Promise<Response<Table>> {
    cbs?.onLoadingStateChange?.(true);

    try {
      let payload: any = { ...data };

      if (this.table_name === Tables.Projects) {
        const { commaSeperatedGenres, ...rest } = data as ProjectFormData;

        payload = {
          ...rest,
          genres: commaSeperatedGenres
            ? commaSeperatedGenres
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean)
            : [],
        };
      }

      const newPayload = deleteUnwantedValues(payload, ["undefined"]);

      const { data: apiData, error } = await supabase
        .from(this.table_name)
        .insert(newPayload)
        .select("*")
        .maybeSingle();

      if (error) {
        return new APIResponse(null, Flag.APIError, { output: error }).build();
      }

      return new APIResponse(apiData, Flag.Success).build();
    } catch (error) {
      return new APIResponse(null, Flag.InternalError, {
        output: error,
      }).build();
    } finally {
      cbs?.onLoadingStateChange?.(false);
    }
  }

  async updateOneByID(
    tableId: string,
    update: Partial<TableFormData>,
    cbs?: Callbacks
  ): Promise<Response<Table>> {
    cbs?.onLoadingStateChange?.(true);
    try {
      let payload: any = { ...update };

      if (this.table_name === Tables.Projects) {
        const { commaSeperatedGenres, ...rest } =
          update as Partial<ProjectFormData>;

        payload = {
          ...rest,
          genres: commaSeperatedGenres
            ? commaSeperatedGenres
                .split(",")
                .map((g) => g.trim())
                .filter(Boolean)
            : [],
        };
      }
      const newPayload = deleteUnwantedValues(payload, [
        "undefined",
        "emptystrings",
      ]);
      // Check if update object is empty or has no valid fields
      if (!newPayload || Object.keys(newPayload).length === 0) {
        return new APIResponse(null, Flag.ValidationError, {
          message: "No updates found.",
        }).build();
      }

      const { data, error } = await supabase
        .from(this.table_name)
        .update({ ...newPayload })
        .eq("id", tableId)
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
  }

  async getByID(tableId: string, cbs?: Callbacks): Promise<Response> {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { data, error } = await supabase
        .from(this.table_name)
        .select("*")
        .eq("id", tableId)
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
  }

  async get(
    opts: GetOptions,
    cbs?: Callbacks
  ): Promise<Response<Table | Table[]>> {
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

      const query = supabase.from(this.table_name).select("*");

      if (Array.isArray(eq) && eq.length > 0) {
        eq.forEach(({ key, value }) => {
          query.eq(key as string, value);
        });
      }

      if (or && typeof or === "string") {
        query.or(or);
      }

      if (inValue?.key && inValue?.value?.length) {
        query.in(inValue.key as string, inValue.value);
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
      cbs?.onLoadingStateChange?.(false);
    }
  }

  async deleteOneByIDPermanent(
    tableId: string,
    cbs?: Callbacks
  ): Promise<Response<null>> {
    cbs?.onLoadingStateChange?.(true);
    try {
      const { error } = await supabase
        .from(this.table_name)
        .delete()
        .eq("id", tableId);
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
  }

  async toogleSoftDeleteOneByID(
    tableId: string,
    intent: boolean,
    cbs?: Callbacks
  ) {
    if (!this.behaviour.supports_soft_deletion) {
      throw new Error(
        `Table '${this.table_name}' doesn't support soft deletion.`
      );
    }
    cbs?.onLoadingStateChange?.(true);
    try {
      const { data, error } = await supabase
        .from(this.table_name)
        .update({
          is_deleted: intent,
          deleted_at: !!intent ? null : new Date().toISOString(),
        })
        .eq("id", tableId)
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
  }
}
