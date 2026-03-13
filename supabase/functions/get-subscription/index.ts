//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

const stripe = new Stripe(
  //@ts-ignore
  "Deno.env.get("STRIPE_SECRET_KEY")"!,
  {
    apiVersion: "2025-03-31.basil",
  }
);

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL")!,
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
};

//@ts-ignore
Deno.serve(async (req) => {

  /**
   * Handle preflight
   */
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {

    const authHeader = req.headers.get("authorization");

    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    const accessToken = authHeader.replace("Bearer ", "");

    /**
     * Authenticate user
     */
    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(accessToken);

    if (authError || !user) {
      return new Response(
        JSON.stringify({ error: "Invalid access token" }),
        {
          status: 401,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Get subscription from DB
     */
    const { data: subscription, error } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("user_id", user.id).eq("status", "active")
      .maybeSingle();

      console.log(JSON.stringify({subscription, error}), null, 2)

    if (error || !subscription) {
      return new Response(
        JSON.stringify({ error: "Subscription not found" }),
        {
          status: 404,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    /**
     * Retrieve subscription from Stripe
     */
    const stripeSubscription = await stripe.subscriptions.retrieve(
      subscription.stripe_subscription_id
    );

    return new Response(
      JSON.stringify({
        success: true,
        subscription: stripeSubscription,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (err) {

    console.error("Get subscription error:", err);

    return new Response(
      //@ts-ignore
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }

});