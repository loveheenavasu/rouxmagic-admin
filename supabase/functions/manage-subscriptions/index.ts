//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

const stripe = new Stripe(
  //@ts-ignore
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-03-31.basil",
  },
);

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL")!,
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function cancelImmediately(subscription: any) {
  return await stripe.subscriptions.cancel(subscription.stripe_subscription_id);
}

async function cancelOnEnd(subscription: any) {
  return await stripe.subscriptions.update(
    subscription.stripe_subscription_id,
    { cancel_at_period_end: true },
  );
}

async function resume(subscription: any) {
  return await stripe.subscriptions.update(
    subscription.stripe_subscription_id,
    { cancel_at_period_end: false },
  );
}

const handlers: Record<string, (subscription: any) => Promise<any>> = {
  cancel_immediately: cancelImmediately,
  cancel_on_end: cancelOnEnd,
  resume,
};

//@ts-ignore
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const token = req.headers.get("authorization");

    if (!token) {
      return new Response(
        JSON.stringify({ error: "Authorization header missing" }),
        { status: 401, headers: corsHeaders },
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Invalid user token" }), {
        status: 401,
        headers: corsHeaders,
      });
    }

    const { action, target_user_id } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    if (!target_user_id) {
      return new Response(
        JSON.stringify({ error: "target_user_id is required for testing" }),
        { status: 400, headers: corsHeaders },
      );
    }

    const handler = handlers[action];

    if (!handler) {
      return new Response(
        JSON.stringify({
          error:
            "Invalid action. Use cancel_immediately | cancel_on_end | resume",
        }),
        { status: 400, headers: corsHeaders },
      );
    }

    // Always target this user (testing mode)
    const targetId = target_user_id;

    const { data: profile } = await supabase
      .from("profiles")
      .select("subscription_id")
      .eq("user_id", targetId)
      .maybeSingle();

    if (!profile?.subscription_id) {
      return new Response(JSON.stringify({ error: "No active subscription" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const { data: subscription } = await supabase
      .from("subscriptions")
      .select("*")
      .eq("id", profile.subscription_id)
      .maybeSingle();

    if (!subscription) {
      return new Response(JSON.stringify({ error: "Subscription not found" }), {
        status: 404,
        headers: corsHeaders,
      });
    }

    const stripeResponse = await handler(subscription);

    return new Response(
      JSON.stringify({
        success: true,
        stripe: stripeResponse,
      }),
      { status: 200, headers: corsHeaders },
    );
  } catch (error) {
    console.error("Subscription action error:", error);

    return new Response(
      //@ts-ignore
      JSON.stringify({ error: error.message }),
      { status: 500, headers: corsHeaders },
    );
  }
});
