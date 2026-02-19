export interface CommonSchema {
    id:string;
    created_at:string;
    updated_at?:string;
}

export enum Tables {
    Projects = "projects",
    Recipes = "recipes",
    Contents = "contents",
    EmailCaptureSettings = "email_capture_settings",
    Footer = "footer",
    FooterSettings = "footer_settings",
    PageSettings = "page_settings",
    Pairings = "pairings",
    Shop = "shop",
    ContentRows = "content_rows"
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
  inValue?:{key: keyof FormData, value: any[]}
  search?: string;
  searchFields?: SearchField[];
}