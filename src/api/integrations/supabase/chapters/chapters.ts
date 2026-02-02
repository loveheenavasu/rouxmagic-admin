import { CRUDWrapper } from "@/core";
import {
  Chapter,
  GetChaptersOpts,
  ChapterFormData,
  Tables
} from "@/types";

export const Chapters = new CRUDWrapper<Chapter, ChapterFormData, GetChaptersOpts>(Tables.Chapters)