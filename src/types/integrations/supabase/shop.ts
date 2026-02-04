import { GetTableOpts } from "@/types/integrations/supabase/common";
import { ShopRow } from "../../shop";

export type GetShopOpts = GetTableOpts<
  keyof ShopRow,
  keyof ShopRow,
  ShopRow,
  keyof ShopRow
>;
