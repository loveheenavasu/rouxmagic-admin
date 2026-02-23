import { CommonSchema } from "./common";

export interface NavigationItem extends CommonSchema {
    label: string;
    href: string;
    order_index: number;
    is_active: boolean;
}

export type NavigationItemFormData = Omit<NavigationItem, keyof CommonSchema>;

export type GetNavigationItemsOpts = {
    eq?: { key: keyof NavigationItem; value: any }[];
    sort?: keyof NavigationItem;
    sortBy?: "asc" | "dec";
    limit?: number;
};
