//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

const stripe = new Stripe(
  "Deno.env.get("STRIPE_SECRET_KEY")"!,
  {
    apiVersion: "2025-03-31.basil",
  }
);

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL"),
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

//@ts-ignore
Deno.serve(async (req) => {
  // ✅ Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", {
      headers: corsHeaders,
      status: 200,
    });
  }

  try {
    // ✅ Get Authorization header
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);
    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    const user_id = user.id;

    // ✅ Get profile
    const { data: profile, error: profileError } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user_id)
      .maybeSingle();

    if (profileError) {
      return new Response(JSON.stringify({ error: "Profile lookup failed" }), {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      });
    }

    let customerId = profile?.stripe_customer_id;

    // ✅ Create Stripe customer if missing
    if (!customerId) {
      const email = user.email;

      if (!email) {
        return new Response(JSON.stringify({ error: "Email not found" }), {
          status: 500,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        });
      }

      const customer = await stripe.customers.create({
        email,
        metadata: {
          user_id,
        },
      });

      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user_id);
    }

    const setupIntent = await stripe.setupIntents.create({
      customer: customerId,
      payment_method_types: ["card"],
      usage: "off_session",
      metadata: {
        user_id,
      },
    });

    return new Response(
      JSON.stringify({
        clientSecret: setupIntent.client_secret,
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
    console.error("SetupIntent error:", err);

    return new Response(
      JSON.stringify({
        error: "Internal server error",
      }),
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