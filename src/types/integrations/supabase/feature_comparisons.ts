export interface PlanMeta {
  id: string;
  name: string;
}

export type FeatureValue = string | boolean | null;

export interface PlansJSON {
  plan_meta: PlanMeta[];
  values: Record<string, FeatureValue>;
}

export interface FeatureComparison {
    id: string;
    created_at: string;
    feature_key: string;
    feature: string;
    order: number;
    plans: PlansJSON;
}
