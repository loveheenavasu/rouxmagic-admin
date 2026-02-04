export interface ShopTag {
  id: string;
  order: number;
  title: string;
  description: string;
}

export interface ShopRow {
  id: number;
  created_at: string;
  pageTitle: string;
  pageSubtitle: string;
  comingSoonTitle: string;
  comingSoonDescription: string;
  shopTags: ShopTag[];
  ctaText: string;
}
