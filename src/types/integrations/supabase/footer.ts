import { CommonSchema, GetTableOpts } from "./common";

export interface FooterMetaData {
  title: string;
  url?: string;
  icon_url?: string;
}

export interface FooterFormData extends Partial<Footer> {}

export type GetFootersBy = "title" | "url" | "is_deleted";

export type SortFootersBy = "created_at" | "order_index";

export type SearchableFooterField = GetFootersBy;

export interface GetFootersOpts
  extends GetTableOpts<
    GetFootersBy,
    SortFootersBy,
    FooterMetaData,
    SearchableFooterField
  > {}
export interface Footer extends CommonSchema, FooterMetaData {}