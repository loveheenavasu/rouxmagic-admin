export interface CommonSchema {
    id:string;
    created_at:string;
    updated_at?:string;
}

export enum Tables {
    Projects = "projects",
    Recipes = "recipes",
    Chapters = "chapters",
    Footer = "footer"
}

export interface GetTableOpts<GetBy, SortBy, FormData, SearchField> {
  eq?: { key: GetBy; value: any }[];
  sort?: SortBy;
  sortBy?: "asc" | "dec";
  limit?: number;
  single?: boolean;
  maybeSingle?: boolean;
  or?: string;
  inValue?:{key: keyof FormData, value: any[]}
  search?: string;
  searchFields?: SearchField[];
}