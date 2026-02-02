import { CRUDWrapper } from "@/core";
import {
  ChapterFormData,
  Tables,
  Chapter,
  GetChaptersOpts
} from "@/types";

export const Chapters = new CRUDWrapper<Chapter, ChapterFormData, GetChaptersOpts>(Tables.Chapters)