//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

const stripe = new Stripe(
  //@ts-ignore
  Deno.env.get("STRIPE_SECRET_KEY")!,
  { apiVersion: "2025-03-31.basil" },
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

    /* ---------------- CUSTOMER ---------------- */
    const { data: profile } = await supabase
      .from("profiles")
      .select("stripe_customer_id, subscription_id")
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

    /* ---------------- EXISTING SUB ---------------- */
    let existingSubscriptionId: string | null = null;
    let stripeSub: any = null;

    if (profile?.subscription_id) {
      const { data: sub } = await supabase
        .from("subscriptions")
        .select("stripe_subscription_id")
        .eq("id", profile.subscription_id)
        .eq("status", "active")
        .maybeSingle();

      existingSubscriptionId = sub?.stripe_subscription_id || null;

      if (existingSubscriptionId) {
        try {
          stripeSub = await stripe.subscriptions.retrieve(
            existingSubscriptionId,
          );

          // ❌ If invalid → treat as no subscription
          if (
            !stripeSub ||
            ["canceled", "incomplete_expired"].includes(stripeSub.status)
          ) {
            existingSubscriptionId = null;
            stripeSub = null;
          }
        } catch {
          existingSubscriptionId = null;
          stripeSub = null;
        }
      }
    }

    /* ---------------- PAYMENT METHOD FLOW ---------------- */
    if (paymentMethodId) {
      // 🔒 Attach safely (avoid duplicate attach crash)
      try {
        await stripe.paymentMethods.attach(paymentMethodId, {
          customer: customerId,
        });
      } catch (err: any) {
        if (!err.message.includes("already attached")) {
          throw err;
        }
      }

      await stripe.customers.update(customerId, {
        invoice_settings: { default_payment_method: paymentMethodId },
      });

      // ================= SWITCH PLAN =================
      if (existingSubscriptionId && stripeSub) {
        const currentItem = stripeSub.items.data[0];

        const updatedSub = await stripe.subscriptions.update(
          existingSubscriptionId,
          {
            items: [{ id: currentItem.id, price: priceId }],
            proration_behavior: "create_prorations",
            expand: ["latest_invoice.payment_intent"],
          },
        );

        const paymentIntent = updatedSub.latest_invoice?.payment_intent as any;

        return new Response(
          JSON.stringify({
            type: "subscription_update",
            subscriptionId: updatedSub.id,
            clientSecret: paymentIntent?.client_secret ?? null,
          }),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          },
        );
      }

      // ================= NEW SUB =================
      const subscription = await stripe.subscriptions.create({
        customer: customerId,
        items: [{ price: priceId }],
        default_payment_method: paymentMethodId,
        payment_behavior: "allow_incomplete",
        expand: ["latest_invoice.payment_intent"],
        metadata: { user_id: user.id },
      });

      const paymentIntent = subscription.latest_invoice?.payment_intent as any;

      return new Response(
        JSON.stringify({
          type: "subscription",
          subscriptionId: subscription.id,
          clientSecret: paymentIntent?.client_secret ?? null,
        }),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ---------------- CHECKOUT BLOCK ---------------- */
    if (existingSubscriptionId) {
      return new Response(
        JSON.stringify({
          error:
            "You already have an active subscription. Please add/select a payment method to switch plans.",
          code: "ACTIVE_SUBSCRIPTION_EXISTS",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        },
      );
    }

    /* ---------------- CHECKOUT ---------------- */
    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      ui_mode: "custom",
      line_items: [{ price: priceId, quantity: 1 }],
      metadata: { user_id: user.id },
      payment_method_collection: "if_required",
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
