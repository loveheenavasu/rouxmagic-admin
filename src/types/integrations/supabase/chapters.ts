import { CRUDWrapperBase } from "@/types";
import { CommonSchema } from "./common";

export enum ChapterStatusEnum {
  Released = 'released',
  ComingSoon = 'coming_soon',
}

export enum ChapterContentTypeEnum {
  Audio = "audio"
}

export interface ChapterMetaData{
  title: string;
  content_type: ChapterContentTypeEnum;
  content_url?: string;
}

export interface ChapterFormData extends Partial<Chapter>{
  commaSeperatedGenres:string;
}

export type GetChaptersBy = "content_type" | "status" | "in_now_playing" | "in_coming_soon" | "in_latest_releases" | "in_hero_carousel"

export type SortChaptersBy = "created_at" | "order_index"

export type GetChaptersOpts = {
  eq?: { key: GetChaptersBy; value: any }[];
  sort?: SortChaptersBy;
  sortBy?: "asc" | "dec";
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  or?: string;
  inValue?:{key: keyof ChapterMetaData, value: any[]}
  /**
   * Optional search term to be applied on the server using ILIKE.
   * This allows all filtering (including search) to be handled by the API.
   */
  search?: string;
  /**
   * Fields to search in when `search` is provided.
   * Defaults to ["title", "platform", "notes"] if not specified.
   */
  // searchFields?: SearchableProjectField[];
}

/**
 * @wrapper chapters api
 */

export interface ChapterCRUDWrapper extends Partial<CRUDWrapperBase<Chapter | Chapter[], ChapterFormData, ChapterFormData, GetChaptersOpts>>{}

export interface Chapter extends CommonSchema, ChapterMetaData {}