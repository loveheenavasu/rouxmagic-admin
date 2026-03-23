import { UserRole } from "./common";
import { Plan } from "./plans";

export interface UserProfile {
  created_at: string;
  email: string;
  id: string;
  last_active_at: string;
  profile: Profile | null;
}

export interface Profile {
  name?: string;
  created_at: string;
  id: string;
  stripe_customer_id: string;
  subscription_id: string;
  /** Raw stripe_product_id stored in DB */
  tier: string | null;
  updated_at: string;
  user_id: string;
  role: UserRole;
  /** Resolved plan from plans table via stripe_product_id */
  plan: Plan | null;
}
