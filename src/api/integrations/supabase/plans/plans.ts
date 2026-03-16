import { CRUDWrapper } from "@/core";
import { PlanFormData, GetPlansOpts, Tables, Plan } from "@/types";

export const Plans = new CRUDWrapper<Plan, PlanFormData, GetPlansOpts>(
  Tables.Plans
);
