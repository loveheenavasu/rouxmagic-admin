export type ContentType = 'film' | 'tvShow' | 'song' | 'audiobook';
export type ProjectStatus = 'released' | 'comingSoon' | 'watched' | 'inProgress' | 'inProduction';

export interface MediaContent {
  id: string;
  title: string;
  content_type: ContentType;
  poster_url: string | null;
  preview_url: string | null;
  status: ProjectStatus;
  release_year: number | null;
  runtime_minutes: number | null;
  notes: string | null;
  genres: string | null;
  platform: string | null;
  platform_url: string | null;
  in_now_playing: boolean;
  in_coming_soon: boolean;
  in_latest_releases: boolean;
  order_index?: number;
  created_at?: string;
  updated_at?: string;
}

export interface MediaFormData {
  title: string;
  content_type: ContentType;
  poster_url?: string;
  preview_url?: string;
  status: ProjectStatus;
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
