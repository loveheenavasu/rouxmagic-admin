import { supabase } from "@/lib";
import { UserProfile } from "@/types/integrations/supabase/profiles";
import { stripe } from "../../stripe/stripe";

export const admin = {
  async getAllUsers(): Promise<{ users: UserProfile[]; error: unknown }> {
    try {
      const { data, error } = await supabase.functions.invoke("get-all-users", {
        method: "GET",
      });

      if (error) {
        return {
          users: [],
          error,
        };
      }
      return {
        users: data.users,
        error: null,
      };
    } catch (err: any) {
      console.error("Error fetching users:", err);
      return {
        users: [],
        error: err,
      };
    }
  },
  users: {
    manageSubsctions: {
      async cancelImmediately(targetId: string) {
        return await stripe.manageSubscriptions("cancel_immediately", targetId);
      },
    },
  },
};
