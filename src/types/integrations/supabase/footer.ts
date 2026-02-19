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

// --- Footer Settings (global contact section config) ---

export interface FooterSettingsMetaData {
  contact_section_title?: string;
  contact_section_subtitle?: string;
  contact_section_label?: string;
}

export interface FooterSettings extends CommonSchema, FooterSettingsMetaData {}

export interface FooterSettingsFormData extends Partial<FooterSettings> {}

export type GetFooterSettingsBy = "id";
export type SortFooterSettingsBy = "created_at";

export interface GetFooterSettingsOpts
  extends GetTableOpts<
    GetFooterSettingsBy,
    SortFooterSettingsBy,
    FooterSettingsMetaData,
    GetFooterSettingsBy
  > {}