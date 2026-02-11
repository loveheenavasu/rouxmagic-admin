import { CRUDWrapper } from "@/core";
import {
  ContentRow,
  ContentRowMetaData,
  GetContentRowsOpts,
  Tables,
} from "@/types";

export const ContentRows = new CRUDWrapper<
  ContentRow,
  ContentRowMetaData,
  GetContentRowsOpts
>(Tables.ContentRows, { supports_soft_deletion: false });
