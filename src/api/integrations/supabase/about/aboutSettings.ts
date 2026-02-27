import { CRUDWrapper } from "@/core";
import {
  AboutPage,
  AboutPageFormData,
  GetAboutPageOpts,
  Tables,
} from "@/types";

export const AboutPageAPI = new CRUDWrapper<
  AboutPage,
  AboutPageFormData,
  GetAboutPageOpts
>(Tables.AboutPage, { supports_soft_deletion: false });
