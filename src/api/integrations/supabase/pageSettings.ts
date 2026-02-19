import { CRUDWrapper } from "@/core";
import {
  PageSettings,
  PageSettingsFormData,
  GetPageSettingsOpts,
  Tables,
} from "@/types";

export const PageSettingsAPI = new CRUDWrapper<
  PageSettings,
  PageSettingsFormData,
  GetPageSettingsOpts
>(Tables.PageSettings, { supports_soft_deletion: false });
