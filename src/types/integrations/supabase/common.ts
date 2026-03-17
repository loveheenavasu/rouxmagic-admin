export interface CommonSchema {
  id: string;
  created_at: string;
  updated_at?: string;
}

export enum Tables {
  Projects = "projects",
  Recipes = "recipes",
  Contents = "contents",
    EmailCaptureSettings = "email_capture_settings",
  Footer = "footer",
    FooterSettings = "footer_settings",
    AboutPage = "about_page",
    PageSettings = "page_settings",
  Pairings = "pairings",
  Plans = "plans",
    Shop = "shop",
    ContentRows = "content_rows",
    NavigationItems = "navigation_items",
    Songs = "v_songs",
    CommonFaqs = "common_faqs",
    Deals = "deals",
    DealSteps = "deal_steps",
    DealTerms = "deal_terms",
    FeatureComparisons = "feature_comparisons"
}

export interface GetTableOpts<GetBy, SortBy, FormData, SearchField> {
  eq?: { key: GetBy; value: any }[];
  sort?: SortBy;
  sortBy?: "asc" | "dec";
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  or?: string;
  contains?: { key: GetBy; value: any }[];
  overlaps?: { key: GetBy; value: any[] }[];
  ilike?: { key: GetBy; value: string }[];
  inValue?: { key: keyof FormData, value: any[] }
  search?: string;
  searchFields?: SearchField[];
}

export enum RequiredPlanEnum {
  FREE = "Free",
  AllAccess = "All_Access",
  AdFree = "Ad_Free",
}

export enum UserRole {
  Admin = "admin",
  User = "user",
}