export interface UserProfile {
  created_at: string;
  email: string;
  id: string;
  last_sign_in_at: string;
  role: string;
  profile: Profile;
}

export interface Profile {
  name?: string;
  created_at: string;
  id: string;
  stripe_customer_id: string;
  subscription_id: string;
  tier: Tier;
  updated_at: string;
  user_id: string;
}

export enum Tier {
  AllAccess = "All-Access",
  Free = "Free",
  AdFree = "Ad-Free",
}
