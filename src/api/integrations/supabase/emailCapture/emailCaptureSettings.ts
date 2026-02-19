import { CRUDWrapper } from "@/core";
import {
  EmailCaptureSettings,
  EmailCaptureSettingsFormData,
  GetEmailCaptureSettingsOpts,
  Tables,
} from "@/types";

export const EmailCaptureSettingsAPI = new CRUDWrapper<
  EmailCaptureSettings,
  EmailCaptureSettingsFormData,
  GetEmailCaptureSettingsOpts
>(Tables.EmailCaptureSettings, { supports_soft_deletion: false });
