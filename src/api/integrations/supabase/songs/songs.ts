import { CRUDWrapper } from "@/core";
import { Song, SongFormData, GetSongsOpts, Tables } from "@/types";

export const Songs = new CRUDWrapper<Song, SongFormData, GetSongsOpts>(Tables.Songs);
