import { CommonSchema, GetTableOpts } from "./common";

/** Single-row settings for the About page (hero, mission, philosophy, contact). */
export interface AboutPageMetaData {
  hero_title?: string;
  hero_subtitle?: string;
  mission_heading?: string;
  mission_text?: string;
  card1_title?: string;
  card1_text?: string;
  card2_title?: string;
  card2_text?: string;
  card3_title?: string;
  card3_text?: string;
  philosophy_heading?: string;
  philosophy1_title?: string;
  philosophy1_text?: string;
  philosophy2_title?: string;
  philosophy2_text?: string;
  philosophy3_title?: string;
  philosophy3_text?: string;
  contact_heading?: string;
  contact_subtitle?: string;
  contact_button_text?: string;
}

export interface AboutPage extends CommonSchema, AboutPageMetaData {}

export interface AboutPageFormData extends Partial<AboutPage> {}

export type GetAboutPageBy = "id";
export type SortAboutPageBy = "created_at";

export interface GetAboutPageOpts
  extends GetTableOpts<
    GetAboutPageBy,
    SortAboutPageBy,
    AboutPageMetaData,
    GetAboutPageBy
  > {}
