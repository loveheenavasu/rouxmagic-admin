import { CommonSchema, GetTableOpts } from "./common";

export enum PairingSourceEnum {
 Film = "Film",
  TvShow = "TV Show",
  Song = "Song",
  Audiobook = "Audiobook",
  Comic = "Comic",
  Book = "Book",
  Recipe = "Recipe"
}

export interface PairingsMetaData {
source_id:string;
source_type:PairingSourceEnum;
target_id:string;
target_type:PairingSourceEnum
}

export interface PairingFormData extends PairingsMetaData {
    updated_at?:CommonSchema["updated_at"]
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
