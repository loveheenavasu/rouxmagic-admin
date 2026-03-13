import { supabase } from "@/lib";
import { UserProfile } from "@/types/integrations/supabase/profiles";

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

      console.log("DATA HERE: ", data);
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
        return await fetch(
          "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/manage-subscriptions",
          {
            method: "POST",
            headers: { "Content-Type": "application/json" },
            body: JSON.stringify({
              action: "cancel_immediately",
              target_user_id: targetId,
            }),
          },
        )
          .then((data) => data.json())
          .catch((err) => console.log("ERROR IN MANAGE SUBSCRIPTIONS: ", err));
      },
    },
  },
};
