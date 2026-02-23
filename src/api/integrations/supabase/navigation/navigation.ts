import { CRUDWrapper } from "@/core";
import { NavigationItem, NavigationItemFormData, GetNavigationItemsOpts, Tables } from "@/types";

export const NavigationItems = new CRUDWrapper<NavigationItem, NavigationItemFormData, GetNavigationItemsOpts>(
  Tables.NavigationItems,
  { supports_soft_deletion: false }
);
