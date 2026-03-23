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
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

async function updatePlan(payload: any) {
  const {
    plan_id,
    name,
    amount, // already in cents
    currency,
    interval,
    features,
    description,
    badge,
    is_active,
    default_cta_text,
    stripe_product_id,
    stripe_price_id,
  } = payload;

  if (!plan_id) throw new Error("plan_id required");

  // 🔹 Fetch existing plan
  const { data: plan } = await supabase
    .from("plans")
    .select("*")
    .eq("id", plan_id)
    .maybeSingle();

  if (!plan) throw new Error("Plan not found");

  let targetProductId = stripe_product_id !== undefined ? (stripe_product_id || null) : plan.stripe_product_id;
  let targetPriceId = stripe_price_id !== undefined ? (stripe_price_id || null) : plan.stripe_price_id;

  let newPriceId = targetPriceId;

  const isAmountChanged = amount !== undefined && amount !== plan.amount;
  const isIntervalChanged =
    interval !== undefined && interval !== plan.interval;
  const isCurrencyChanged =
    currency !== undefined && currency !== plan.currency;

  const isPriceIdOverridden = stripe_price_id !== undefined;

  const shouldCreateNewPrice =
    (isAmountChanged || isIntervalChanged || isCurrencyChanged) && !isPriceIdOverridden;

  // 🔥 STEP 1: Update product name (safe)
  if (name && targetProductId) {
    try {
      await stripe.products.update(targetProductId, {
        name,
      });
    } catch (e) {
      console.log("Could not update product name in Stripe", e);
    }
  }

  // 🔥 STEP 2: Create NEW price (DO NOT DELETE OLD)
  if (shouldCreateNewPrice && targetProductId) {
    console.log("🚀 Creating new price...");

    const newPrice = await stripe.prices.create(
      {
        unit_amount: amount ?? plan.amount,
        currency: (currency || plan.currency || "usd").toLowerCase(),
        recurring:
          interval || plan.interval
            ? { interval: interval || plan.interval }
            : undefined,
        product: targetProductId,
      },
      {
        idempotencyKey: `plan-${plan_id}-${amount ?? plan.amount}-${interval ?? plan.interval}-${currency ?? plan.currency}-${Date.now()}`,
      },
    );

    newPriceId = newPrice.id;

    try {
      await stripe.products.update(targetProductId, {
        default_price: newPriceId,
      });
    } catch (e) {
      console.log("Could not update default_price on product in Stripe", e);
    }

    // ❌ DO NOT deactivate old price here (causes error)
  }

  // 🔥 STEP 3: Update DB
  const { error } = await supabase
    .from("plans")
    .update({
      name: name ?? plan.name,
      amount: amount ?? plan.amount,
      interval: interval ?? plan.interval,
      currency: currency ?? plan.currency,
      features: features ?? plan.features,
      description: description ?? plan.description,
      badge: badge ?? plan.badge,
      is_active: is_active ?? plan.is_active,
      default_cta_text: default_cta_text ?? plan.default_cta_text,
      stripe_product_id: targetProductId,
      stripe_price_id: newPriceId,
    })
    .eq("id", plan_id);

  if (error) throw new Error("DB update failed");

  return {
    success: true,
    message: shouldCreateNewPrice
      ? "New price version created successfully"
      : "Plan updated successfully",
    new_price_id: newPriceId,
  };
}

// 🔹 Handler Map (scalable)
const handlers: Record<string, (payload: any) => Promise<any>> = {
  update_plan: updatePlan,
};

// 🔹 Server
//@ts-ignore
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const { action, ...payload } = await req.json();

    if (!action) {
      return new Response(JSON.stringify({ error: "action required" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const handler = handlers[action];

    if (!handler) {
      return new Response(JSON.stringify({ error: "Invalid action" }), {
        status: 400,
        headers: corsHeaders,
      });
    }

    const result = await handler(payload);

    return new Response(JSON.stringify(result), {
      status: 200,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
    });
  } catch (err) {
    return new Response(
      //@ts-ignore
      JSON.stringify({ error: err.message }),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      },
    );
  }
});
