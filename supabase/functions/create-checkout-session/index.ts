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
  "Access-Control-Allow-Methods": "POST, OPTIONS",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
};

//@ts-ignore
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    /* ---------------- AUTH ---------------- */
    const authHeader = req.headers.get("Authorization");

    if (!authHeader) {
      return new Response(JSON.stringify({ error: "Missing Authorization" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const token = authHeader.replace("Bearer ", "");

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(token);

    if (!user || authError) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const { price_id: priceId, paymentMethodId } = await req.json();

    if (!priceId) {
      return new Response(JSON.stringify({ error: "Missing price_id" }), {
        status: 400,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    // ---------------- Get or create Stripe customer ----------------
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = profile?.stripe_customer_id;

    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email ?? undefined,
        metadata: { user_id: user.id },
      });

      customerId = customer.id;

      await supabase
        .from("profiles")
        .update({ stripe_customer_id: customerId })
        .eq("user_id", user.id);
    }

    // ---------------- Saved card subscription ----------------
    if (paymentMethodId) {
      // Attach the payment method to the customer
      await stripe.paymentMethods.attach(paymentMethodId, {
        customer: customerId,
      });

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // Create subscription
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        payment_behavior: "allow_incomplete", // lets client confirm payment
        expand: ["latest_invoice.payment_intent"],
        metadata: { user_id: user.id },
      });

      const paymentIntent = subscription.latest_invoice?.payment_intent as any;

      return new Response(
        JSON.stringify({
          type: "subscription",
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret ?? null,
          invoiceStatus: subscription.latest_invoice?.status,
          paymentIntentStatus: paymentIntent?.status ?? null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    // ---------------- Checkout session ----------------
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "custom",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: user.id },
      return_url: "http://localhost:8080/watch",
      payment_method_collection: "if_required",
      saved_payment_method_options: { payment_method_save: "enabled" },
    });

    return new Response(
      JSON.stringify({
        type: "checkout",
        clientSecret: session.client_secret,
        sessionId: session.id,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  } catch (error) {
    console.error("Stripe subscription error:", error);

    return new Response(
      JSON.stringify({
        //@ts-ignore
        error: error?.message || "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      },
    );
  }
});
