import { create } from "zustand";
import { persist } from "zustand/middleware";
import { supabase } from "@/lib";
import { UserRole } from "@/types";
import { toast } from "sonner";

interface User {
  email: string;
  name: string;
}

interface AuthStore {
  user: (User & { profile: Record<string, any> }) | null;
  isAuthenticated: boolean;
  login: (email: string, password: string) => Promise<boolean>;
  logout: () => void;
}

export const useAuthStore = create<AuthStore>()(
  persist(
    (set) => ({
      user: null,
      isAuthenticated: false,
      login: async (email: string, password: string) => {
        const { data, error } = await supabase.auth.signInWithPassword({
          email,
          password,
        });

        if (error) {
          console.error("Login error:", error);
          return false;
        }

        if (data.user) {
          const { data: profile, error } = await supabase
            .from("profiles")
            .select("*")
            .eq("user_id", data.user.id)
            .eq("role", UserRole.Admin)
            .maybeSingle();
          if (error) {
            console.error("Profile error:", error);
            return false;
          }
          if (!profile) {
            toast.error("You dont have permissions to accesss this panel");
            return false;
          }
          set({
            user: { ...data.user, email, name: "Admin", profile },
            isAuthenticated: true,
          });
          return true;
        }
        return false;
      },
      logout: () => {
        set({
          user: null,
          isAuthenticated: false,
        });
      },
    }),
    {
      name: "auth-storage",
    },
  ),
);
