import { CommonSchema, GetTableOpts } from "./common";

export enum ProjectStatusEnum {
  Released = "released",
  ComingSoon = "coming_soon",
  Created = "created",
}

export enum ContentTypeEnum {
  Film = "Film",
  Song = "Song",
  Comic = "Comic",
  Book = "Book",
  TvShow = "TV Show",
  Audiobook = "Audiobook",
}

export interface ProjectMetaData {
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
  in_hero_carousel: boolean;
  order_index?: number;
  platform_name?: string;
  is_deleted?: boolean;
  deleted_at?: string | null;
  vibe_tags?: string[];
}

export interface ProjectFormData extends Partial<Project> {
  commaSeperatedGenres: string;
}

export type GetProjectsBy =
  | "content_type"
  | "status"
  | "in_now_playing"
  | "in_coming_soon"
  | "in_latest_releases"
  | "in_hero_carousel"
  | "is_deleted";

export type SortProjectsBy = "created_at" | "order_index";

export type SearchableProjectField =
  | "title"
  | "platform"
  | "notes"
  | "content_type";

export interface GetProjectsOpts
  extends GetTableOpts<
    GetProjectsBy,
    SortProjectsBy,
    SearchableProjectField,
    SearchableProjectField
  > {}

export interface Project extends CommonSchema, ProjectMetaData {}
