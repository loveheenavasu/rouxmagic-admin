import { CRUDWrapper } from "@/core";
import { DealTerm, Tables } from "@/types";

export const DealTermsAPI = new CRUDWrapper<DealTerm, any>(Tables.DealTerms);
