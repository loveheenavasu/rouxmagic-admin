import { supabase } from "@/lib";
import { StripePriceProduct } from "@/types";
// import { StripeCheckoutOptions } from "@stripe/stripe-js";
import { toast } from "sonner";

const getUserAccessToken = async () => {
  const { data, error } = await supabase.auth.getSession();
  if (error || !data?.session?.user) {
    toast.error("Unable to fetch user from current session");
    return;
  }
  return data.session.access_token;
};

export const stripe = {
  async getProducts(): Promise<{
    error: any;
    data: StripePriceProduct[] | null;
  }> {
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/get-products",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${
            import.meta.env.VITE_SUPABASE_PUBLISHABLE_KEY
          }`,
        },
      },
    )
      .then((res) => res.json())
      .then((data) => ({ data, error: null }))
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async getPaymentMethods(): Promise<{
    error: any;
    data: any[] | null;
  }> {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/fetch-customer-payment-methods-from-stripe",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async detachPaymentMethod(paymentMethodId: string) {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/detach-payment-method",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethodId }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async attachPaymentMethod(paymentMethodId: string) {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/attach-payment-method",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ paymentMethodId }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async manageSubscriptions(
    action: "cancel_immediately" | "cancel_on_end" | "resume",
    targetUserId?: string
  ) {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/manage-subscriptions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${token}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({ action, target_user_id: targetUserId }),
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async getSubscription() {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/get-subscription",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
  async getTransections() {
    const token = await getUserAccessToken();
    return fetch(
      "https://okusfcxayekqgpbmwyev.supabase.co/functions/v1/get-transections",
      {
        method: "GET",
        headers: {
          Authorization: `Bearer ${token}`,
        },
      },
    )
      .then((res) => res.json())
      .then((data) => {
        return { data, error: null };
      })
      .catch((error) => {
        console.error(error);
        return { error, data: null };
      });
  },
};
