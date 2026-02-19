import { CRUDWrapper } from "@/core";
import {
  FooterSettings,
  FooterSettingsFormData,
  GetFooterSettingsOpts,
  Tables,
} from "@/types";

export const FooterSettingsAPI = new CRUDWrapper<
  FooterSettings,
  FooterSettingsFormData,
  GetFooterSettingsOpts
>(Tables.FooterSettings, { supports_soft_deletion: false });
