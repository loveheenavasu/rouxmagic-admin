import { CommonSchema, GetTableOpts } from "./common";

export enum ChapterStatusEnum {
  Released = "released",
  ComingSoon = "coming_soon",
}

export enum ContentContentTypeEnum {
  Audio = "Audiobook",
}

export interface ContentMetaData {
  title: string;
  content_type: ContentContentTypeEnum;
  content_url?: string;
  project_id?: string;
  platform?: string;
  episode_number?: number;
  season_number?: number;
  description?: string;
  thumbnail_url?: string;
  rating?: string;
  runtime_minutes?: number;
  release_year?: number;
  youtube_id?: string;

  is_deleted?: boolean;
  deleted_at?: string | null;
}

export interface ContentFormData extends Partial<Content> {}

export type GetContentsBy = keyof ContentMetaData | "id";

export type SortContentsBy = "created_at";

export interface GetContentsOpts
  extends GetTableOpts<
    GetContentsBy,
    SortContentsBy,
    ContentMetaData,
    unknown
  > {}

export interface Content extends CommonSchema, ContentMetaData {}