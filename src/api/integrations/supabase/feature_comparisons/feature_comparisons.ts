import { CRUDWrapper } from "@/core";
import { FeatureComparison, Tables } from "@/types";

export const FeatureComparisonsAPI = new CRUDWrapper<FeatureComparison, any>(Tables.FeatureComparisons);
