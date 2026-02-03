import { CRUDWrapper } from "@/core";
import {
  ContentFormData,
  Tables,
  Content,
  GetContentsOpts
} from "@/types";

export const Contents = new CRUDWrapper<Content, ContentFormData, GetContentsOpts>(Tables.Contents)