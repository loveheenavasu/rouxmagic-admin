export interface StripeProductMetadata {
  id: string;
  name: string;
  description: string | null;
  active: boolean;
  attributes: string[];
  created: number;
  default_price: string;
  images: string[];
  livemode: boolean;
  marketing_features: any[];
  metadata: Record<string, string>;
  object: "product";
  package_dimensions: null;
  shippable: boolean | null;
  statement_descriptor: string | null;
  tax_code: string | null;
  type: "service";
  unit_label: string | null;
  updated: number;
  url: string | null;
}

export interface StripePriceProduct {
  priceId: string;
  productId: string;
  productName: string;
  description: string | null;

  currency: string;
  interval: "day" | "week" | "month" | "year" | null;
  unit_amount: number;

  product_metadata: StripeProductMetadata;
}