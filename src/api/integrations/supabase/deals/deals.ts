import { CRUDWrapper } from "@/core";
import { Deal, Tables } from "@/types";

export const DealsAPI = new CRUDWrapper<Deal, any>(Tables.Deals);
