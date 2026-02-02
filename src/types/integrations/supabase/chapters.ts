import { CommonSchema, GetTableOpts } from "./common";

export enum ChapterStatusEnum {
  Released = "released",
  ComingSoon = "coming_soon",
}

export enum ChapterContentTypeEnum {
  Audio = "Audiobook",
}

export interface ChapterMetaData {
  title: string;
  content_type: ChapterContentTypeEnum;
  content_url?: string;
  project_id?: string;
  poster_url?: string;
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

export interface ChapterFormData extends Partial<Chapter> {}

export type GetChaptersBy = keyof ChapterMetaData | "id";

export type SortChaptersBy = "created_at";

export interface GetChaptersOpts
  extends GetTableOpts<
    GetChaptersBy,
    SortChaptersBy,
    ChapterMetaData,
    unknown
  > {}

export interface Chapter extends CommonSchema, ChapterMetaData {}