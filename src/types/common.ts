export type JSDataType =
  | "string"
  | "number"
  | "boolean"
  | "object"
  | "function"
  | "undefined"
  | "bigint"
  | "symbol"
  | "null"
  | "emptystrings";

export enum PageName {
  DealMain = "deal_main",
  PricingDeal = "pricing_deal",
  PricingFAQs = "pricing_faqs",
  PricingMain = "pricing_main",
  PricingFeatureComparison = "pricing_feature_comparison",
  DealTerms = "deal_terms",
  DealSteps = "deal_steps",
  DealCollaborators = "deal_collaborators",
}
