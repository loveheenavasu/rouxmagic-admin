import { CommonSchema, GetTableOpts } from "./common";

export enum ChapterStatusEnum {
  Released = "released",
  ComingSoon = "coming_soon",
}

export enum ChapterContentTypeEnum {
  Audio = "AudioBook",
}

export interface ChapterMetaData {
  title: string;
  content_type: ChapterContentTypeEnum;
  content_url?: string;
  project_id:string;
  episode_number?:number;
  season_number?:number;
  release_year?:number;
  description?:string;
  id_deleted:boolean;
  deleted_at?:Date;
  thumbnail_url?:string;
  runtime_minutes?:number;
  youtube_id?:string;
}

export interface ChapterFormData extends Partial<Chapter> {}

export type GetChaptersBy =
  | "content_type"
  | "status"
  | "in_now_playing"
  | "in_coming_soon"
  | "in_latest_releases"
  | "in_hero_carousel";

export type SortChaptersBy = "created_at" | "order_index";

export interface GetChaptersOpts
  extends GetTableOpts<
    GetChaptersBy,
    SortChaptersBy,
    ChapterMetaData,
    unknown
  > {}

export interface Chapter extends CommonSchema, ChapterMetaData {}
