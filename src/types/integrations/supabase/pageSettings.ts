import { CommonSchema, GetTableOpts } from "./common";

export interface PageSettingsMetaData {
  page_name: string;
  title?: string;
  subtitle?: string;
}

export interface PageSettings extends CommonSchema, PageSettingsMetaData {}

export interface PageSettingsFormData extends Partial<PageSettings> {}

export type GetPageSettingsBy = "id" | "page_name";
export type SortPageSettingsBy = "created_at";

export interface GetPageSettingsOpts
  extends GetTableOpts<
    GetPageSettingsBy,
    SortPageSettingsBy,
    PageSettingsMetaData,
    GetPageSettingsBy
  > {}
