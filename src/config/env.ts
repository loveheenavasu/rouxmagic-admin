export const ENV = {
  SUPABASE_URL: import.meta.env.VITE_SUPABASE_URL,
  SUPABASE_ANON_KEY: import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY,
  PUBLIC_SITE_URL: import.meta.env.VITE_PUBLIC_SITE_URL ?? "",
};
