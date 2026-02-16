import { CommonSchema, GetTableOpts } from "./common";

export enum PairingSourceEnum {
  Film = "Film",
  TvShow = "TV Show",
  Song = "Song",
  Audiobook = "Audiobook",
  Recipe = "Recipe"
}

export interface PairingsMetaData {
  source_id: string;
  source_ref: PairingSourceEnum;
  target_id: string;
  target_ref: PairingSourceEnum;
  is_deleted?: boolean;
  deleted_at?: string | null;
  vibe_tags?: string[];
  flavor_tags?: string[];
}

export interface PairingFormData extends PairingsMetaData {
    updated_at?:CommonSchema["updated_at"];
    vibe_tags?: string[];
    flavor_tags?: string[];
}

export type GetPairingsBy = keyof Pairing

export type SortPairingsBy = "created_at" | "order_index";

export interface GetPairingsOpts
  extends GetTableOpts<
    GetPairingsBy,
    SortPairingsBy,
    PairingsMetaData,
    unknown
  > {}

export interface Pairing extends CommonSchema, PairingsMetaData {}
