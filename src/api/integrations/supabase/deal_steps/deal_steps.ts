import { CRUDWrapper } from "@/core";
import { DealStep, Tables } from "@/types";

export const DealStepsAPI = new CRUDWrapper<DealStep, any>(Tables.DealSteps);
