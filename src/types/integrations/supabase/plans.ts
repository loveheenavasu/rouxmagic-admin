import { CommonSchema, GetTableOpts } from "./common";

export interface PlanMetaData {
  name: string;
  stripe_price_id?: string;
  stripe_product_id?: string;
  amount: number;
  currency: string;
  interval: string;
  is_active: boolean;
  features?: string[];
  description?: string;
  badge?: string;
  default_cta_text?: string;
}

export interface PlanFormData extends PlanMetaData {
  featuresString?: string;
}

export type GetPlansBy = "is_active" | "interval" | "currency";
export type SortPlansBy = "created_at" | "amount";
export type SearchablePlanField = "name" | "stripe_price_id";

export interface GetPlansOpts extends GetTableOpts<
  GetPlansBy,
  SortPlansBy,
  PlanFormData,
  SearchablePlanField
> {}

export interface Plan extends CommonSchema, PlanMetaData {}
