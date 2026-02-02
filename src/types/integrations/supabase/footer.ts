import { CRUDWrapperBase } from "@/types";
import { CommonSchema } from "./common";

export enum FooterStatusEnum {
  Released = 'released',
  ComingSoon = 'coming_soon',
}

export interface FooterMetaData{
  title: string;
  url?:string;
  icon_url?:string;
}

export interface FooterFormData extends Partial<Footer>{}

export type GetFootersBy = "title" | "url";

export type SortFootersBy = "created_at" | "order_index"

export type SearchableFooterField = "title"

export type GetFootersOpts = {
  eq?: { key: GetFootersBy; value: any }[];
  sort?: SortFootersBy;
  sortBy?: "asc" | "dec";
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  or?: string;
  inValue?:{key: keyof FooterMetaData, value: any[]}
  /**
   * Optional search term to be applied on the server using ILIKE.
   * This allows all filtering (including search) to be handled by the API.
   */
  search?: string;
  /**
   * Fields to search in when `search` is provided.
   * Defaults to ["title", "platform", "notes"] if not specified.
   */
  searchFields?: SearchableFooterField[];
}

/**
 * @wrapper Footers api
 */

export interface FooterCRUDWrapper extends Partial<CRUDWrapperBase<Footer | Footer[], FooterFormData, FooterFormData, GetFootersOpts>>{}

export interface Footer extends CommonSchema, FooterMetaData {}