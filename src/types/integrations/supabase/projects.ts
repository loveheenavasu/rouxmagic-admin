import { CRUDWrapperBase } from "@/types";
import { CommonSchema } from "./common";

export enum ProjectStatusEnum {
  Released = 'released',
  ComingSoon = 'comingSoon',
  Watched = 'watched',
  InProgress = 'inProgress',
  InProduction = 'inProduction',
}

export enum ContentTypeEnum {
  Film = 'film',
  TvShow = 'tvShow',
  Song = 'song',
  Audiobook = 'audiobook',
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
  genres?: string;
  platform?: string;
  platform_url?: string;
  in_now_playing: boolean;
  in_coming_soon: boolean;
  in_latest_releases: boolean;
}

export type GetProjectsBy = "content_type" | "status" | "in_now_playing" | "in_coming_soon" | "in_latest_releases"

export type SortProjectsBy = "created_at"

/**
 * @wrapper projects api
 */

export interface ProjectCRUDWrapper extends Partial<CRUDWrapperBase>{}

export interface Project extends CommonSchema, ProjectMetaData {}