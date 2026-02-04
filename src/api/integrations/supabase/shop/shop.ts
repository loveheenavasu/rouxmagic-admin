import { CRUDWrapper } from "@/core/CRUDWrapper";
import { Tables, ShopRow, GetShopOpts } from "@/types";

export const ShopAPI = new CRUDWrapper<
  ShopRow,
  ShopRow,
  GetShopOpts
>(Tables.Shop);
