import { createClient } from "@supabase/supabase-js";
import { ENV } from "@/config";

if (!ENV.SUPABASE_ANON_KEY || !ENV.SUPABASE_URL) {
  throw new Error("Missing Supabase environment variables");
}

export const supabase = createClient(ENV.SUPABASE_URL, ENV.SUPABASE_ANON_KEY);