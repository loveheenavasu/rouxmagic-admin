import { CommonSchema, GetTableOpts } from "./common";

export interface EmailCaptureSettingsMetaData {
  title: string;
  subtitle: string;
  cta_text: string;
  footer_text: string;
}

export interface EmailCaptureSettings extends CommonSchema, EmailCaptureSettingsMetaData {}

export interface EmailCaptureSettingsFormData extends Partial<EmailCaptureSettings> {}

export type GetEmailCaptureSettingsBy = "id";
export type SortEmailCaptureSettingsBy = "created_at" | "updated_at";

export interface GetEmailCaptureSettingsOpts
  extends GetTableOpts<
    GetEmailCaptureSettingsBy,
    SortEmailCaptureSettingsBy,
    EmailCaptureSettingsMetaData,
    GetEmailCaptureSettingsBy
  > {}
