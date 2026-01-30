import { CRUDWrapperBase } from "@/types";
import { CommonSchema } from "./common";

export enum ProjectStatusEnum {
  Released = 'released',
  ComingSoon = 'coming_soon',
}

export enum ContentTypeEnum {
  Film = 'Film',
  TvShow = 'TV Show',
  Song = 'Song',
  Audiobook = 'Audiobook',
  Comic = 'Comic',    
  Book = 'Book',
}

export interface ProjectMetaData{
  title: string;
  content_type: ContentTypeEnum;
  poster_url?: string;
  preview_url?: string;
  status: ProjectStatusEnum;
  release_year?: number;
  runtime_minutes?: number;
  notes?: string;
  genres?: string[];
  platform?: string;
  platform_url?: string;
  in_now_playing: boolean;
  in_coming_soon: boolean;
  in_latest_releases: boolean;
  order_index?:number;
  platform_name?: string;
}

export interface ProjectFormData extends Partial<Project>{
  commaSeperatedGenres:string;
}

export type GetProjectsBy = "content_type" | "status" | "in_now_playing" | "in_coming_soon" | "in_latest_releases" | "in_hero_carousel"

export type SortProjectsBy = "created_at" | "order_index"

export type SearchableProjectField = "title" | "platform" | "notes" | "content_type";

export type GetProjectsOpts = {
  eq?: { key: GetProjectsBy; value: any }[];
  sort?: SortProjectsBy;
  sortBy?: "asc" | "dec";
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  or?: string;
  inValue?:{key: keyof ProjectMetaData, value: any[]}
  /**
   * Optional search term to be applied on the server using ILIKE.
   * This allows all filtering (including search) to be handled by the API.
   */
  search?: string;
  /**
   * Fields to search in when `search` is provided.
   * Defaults to ["title", "platform", "notes"] if not specified.
   */
  searchFields?: SearchableProjectField[];
}

/**
 * @wrapper projects api
 */

export interface ProjectCRUDWrapper extends Partial<CRUDWrapperBase<Project | Project[], ProjectFormData, ProjectFormData, GetProjectsOpts>>{}

export interface Project extends CommonSchema, ProjectMetaData {}