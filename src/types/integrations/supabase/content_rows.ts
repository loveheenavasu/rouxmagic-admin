import { CommonSchema, GetTableOpts } from "./common";

export enum PageEnum {
  Home = "home",
  Watch = "watch",
  Listen = "listen",
  Read = "read",
  MyList = "mylist",
}

export enum FilterTypeEnum {
  Status = "status",
  ContentType = "content_type",
  Flag = "flag",
  Custom = "custom",
  Audiobook = "Audiobook",
  Song = "Song",
  Listen = "Listen",
  Genre = "genres",
  VibeTags = "vibe_tags",
  FlavorTags = "flavor_tags",
}

export interface ContentRowMetaData {
  label: string;
  page: PageEnum;
  filter_type: FilterTypeEnum;
  filter_value: string;
  order_index: number;
  is_active: boolean;
  max_items?: number | null;
  is_deleted?: boolean;
  deleted_at?: string | null;
}

export type GetContentRowsBy =
  | "page"
  | "filter_type"
  | "is_active";

export type SortContentRowsBy = "order_index" | "created_at";

export type SearchableContentRowField = "label" | "filter_value";

export interface GetContentRowsOpts
  extends GetTableOpts<
    GetContentRowsBy,
    SortContentRowsBy,
    SearchableContentRowField,
    SearchableContentRowField
  > {}

export interface ContentRow extends CommonSchema, ContentRowMetaData {}
