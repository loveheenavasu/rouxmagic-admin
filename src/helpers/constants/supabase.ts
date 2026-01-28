import { ContentTypeEnum } from "@/types";

const MediaPathStatic:Record<Partial<ContentTypeEnum>, string> = {
Film:"Film Posters/",
Song:"Song Posters/",
"TV Show":"TV Show Posters/",
Audiobook:"Audiobooks/"
}

export const createBucketPath=(fileName:string, fileType:ContentTypeEnum)=>{
    return MediaPathStatic[fileType] + fileName
}