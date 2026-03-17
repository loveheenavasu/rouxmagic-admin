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
//@ts-ignore
const endpointSecret = "whsec_MlQ2VSYWuIpnYi7zHXu0DjPU5mWVvEfC"!;

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL")!,
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

const PRODUCT_TIER_MAP: Record<string, string> = {
  prod_U7ZOSbCHh4AxQ9: "All_Access",
  prod_U7ZOZiVysCdEQ9: "Ad_Free",
};

async function handleCheckoutCompleted(session: any) {
  console.log("checkout.session.completed");

  const userId = session.metadata?.user_id;
  const customerId = session.customer;

  if (!userId || !customerId) {
    console.log("USER ID OR CUSTOMER ID NOT FOUND");
    return;
  }

  const response = await supabase
    .from("profiles")
    .update({ stripe_customer_id: customerId })
    .eq("user_id", userId)
    .select("*")
    .maybeSingle();
}

async function handleInvoicePaid(invoice: any) {
  const subscriptionId = invoice.parent?.subscription_details?.subscription;

  const customerId = invoice.customer;

  if (!subscriptionId || !customerId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  console.log("PROFILE HERE:", profile);

  if (!profile) {
    console.log("Customer not linked yet, skipping invoice event");
    return;
  }

  const line = invoice.lines?.data?.find((l: any) => l.pricing?.price_details);

  const priceId = line?.pricing?.price_details?.price;

  const productId = line?.pricing?.price_details?.product;

  const tier = PRODUCT_TIER_MAP[productId] || "Free";

  console.log("INVOICE: ", invoice);

  const res = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: profile.user_id,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        stripe_product_id: productId,
        status: "active",
        current_period_end: new Date(invoice.period_end * 1000).toISOString(),
        description: line.description,
        amount: line.amount,
      },
      { onConflict: "stripe_subscription_id" },
    )
    .select("id")
    .maybeSingle();

  if (res.error) {
    console.log("Error occured while adding entry in 'subscriptions' table.");
    return;
  }

  await supabase
    .from("profiles")
    .update({ tier, subscription_id: res?.data?.id })
    .eq("id", profile.id);

  console.log("Subscription activated");
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("customer.subscription.deleted");

  const customerId = subscription.customer;

  await supabase
    .from("subscriptions")
    .update({ status: "canceled" })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("profiles")
    .update({ tier: "Free" })
    .eq("stripe_customer_id", customerId);

  console.log("User downgraded");
}

async function handlePaymentRefund(charge: any) {
  console.log("charge.refunded event received");

  const customerId = charge.customer;

  if (!customerId) {
    console.log("Customer ID missing in refund event");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) {
    console.log("Profile not found for refunded customer");
    return;
  }

  console.log("Refund profile:", profile);

  // Mark subscription refunded
  const { error: subError } = await supabase
    .from("subscriptions")
    .update({ status: "refunded" })
    .eq("user_id", profile.user_id);

  if (subError) {
    console.log("Error updating subscription status:", subError);
    return;
  }

  // Downgrade user tier
  const { error: profileError } = await supabase
    .from("profiles")
    .update({
      tier: "Free",
      subscription_id: null,
    })
    .eq("id", profile.id);

  if (profileError) {
    console.log("Error downgrading user:", profileError);
    return;
  }

  console.log("Refund processed successfully for user:", profile.user_id);
}

const handlers: Record<string, (data: any) => Promise<void>> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "invoice.payment_succeeded": handleInvoicePaid,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  // "charge.refunded": handlePaymentRefund,
};
//@ts-ignore
Deno.serve(async (req) => {
  const signature = req.headers.get("stripe-signature");

  if (!signature) {
    return new Response("Missing signature", { status: 400 });
  }

  const body = await req.text();

  let event;

  try {
    event = await stripe.webhooks.constructEventAsync(
      body,
      signature,
      endpointSecret,
    );
  } catch (err: any) {
    console.error("Webhook verification failed:", err.message);
    return new Response("Webhook Error", { status: 400 });
  }
  const handler = handlers[event.type];

  if (handler) {
    await handler(event?.data?.object || event?.object);
  } else {
    console.log("UNHANDLED EVENT: ", event.type);
  }

  return new Response(JSON.stringify({ received: true }), {
    status: 200,
  });
});
