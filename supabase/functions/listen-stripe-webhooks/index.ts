//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

const stripe = new Stripe(
  //@ts-ignore
  Deno.env.get("STRIPE_SECRET_KEY")!,
  { apiVersion: "2025-03-31.basil" },
);

//@ts-ignore
const endpointSecret = "whsec_MlQ2VSYWuIpnYi7zHXu0DjPU5mWVvEfC"!;

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL")!,
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!,
);

/* ---------------- HELPERS ---------------- */

async function getFreePlanId() {
  const { data, error } = await supabase
    .from("plans")
    .select("id")
    .eq("name", "Free")
    .maybeSingle();

  if (error) {
    console.error("Error fetching free plan:", error);
    return null;
  }

  return data?.id ?? null;
}

async function getPlanIdFromProduct(productId: string | null) {
  if (!productId) {
    return await getFreePlanId();
  }

  const { data, error } = await supabase
    .from("plans")
    .select("id")
    .eq("stripe_product_id", productId)
    .maybeSingle();

  if (error) {
    console.error("Error fetching plan by product:", error);
    return await getFreePlanId();
  }

  return data?.id ?? (await getFreePlanId());
}

async function dedupePaymentMethods(customerId: string) {
  try {
    const methods = await stripe.paymentMethods.list({
      customer: customerId,
      type: "card",
    });

    const seen = new Map();

    for (const pm of methods.data) {
      const fingerprint = pm.card?.fingerprint;

      if (!fingerprint) continue;

      if (seen.has(fingerprint)) {
        await stripe.paymentMethods.detach(pm.id);
      } else {
        seen.set(fingerprint, pm.id);
      }
    }
  } catch (error) {
    console.error("dedupePaymentMethods error:", error);
  }
}

/* ---------------- HANDLERS ---------------- */

async function handleCheckoutCompleted(session: any) {
  console.log("checkout.session.completed");

  const userId = session?.metadata?.user_id;
  const customerId = session?.customer;

  if (!userId || !customerId) {
    console.log("Missing user/customer id");
    return;
  }

  await supabase
    .from("profiles")
    .update({
      stripe_customer_id: customerId,
    })
    .eq("user_id", userId);

  await dedupePaymentMethods(customerId);
}

async function handleInvoicePaid(invoice: any) {
  console.log("invoice.payment_succeeded");

  const subscriptionId =
    invoice?.parent?.subscription_details?.subscription ??
    invoice?.subscription;

  const customerId = invoice?.customer;

  if (!subscriptionId || !customerId) {
    console.log("Missing subscription/customer in invoice");
    return;
  }

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) {
    console.log("Profile not found for invoice");
    return;
  }

  const line =
    invoice?.lines?.data?.find((l: any) => l?.pricing?.price_details) ??
    invoice?.lines?.data?.[0];

  const priceId =
    line?.pricing?.price_details?.price ?? line?.price?.id ?? null;

  const productId =
    line?.pricing?.price_details?.product ?? line?.price?.product ?? null;

  const tier = await getPlanIdFromProduct(productId);

  const currentPeriodEnd = invoice?.period_end
    ? new Date(invoice.period_end * 1000).toISOString()
    : null;

  const res = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: profile.user_id,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        stripe_product_id: productId,
        status: "active",
        current_period_end: currentPeriodEnd,
        description: line?.description ?? null,
        amount: line?.amount ?? null,
      },
      {
        onConflict: "stripe_subscription_id",
      },
    )
    .select("id")
    .maybeSingle();

  if (res.error) {
    console.error("subscriptions upsert failed:", res.error);
    return;
  }

  await supabase
    .from("profiles")
    .update({
      tier,
      subscription_id: res?.data?.id ?? null,
    })
    .eq("id", profile.id);

  console.log("Subscription activated");
}

async function handleSubscriptionUpdated(subscription: any) {
  console.log("customer.subscription.updated");

  const subscriptionId = subscription?.id;
  const customerId = subscription?.customer;

  if (!subscriptionId || !customerId) return;

  let userId = subscription?.metadata?.user_id;

  if (!userId) {
    const { data: profile } = await supabase
      .from("profiles")
      .select("user_id")
      .eq("stripe_customer_id", customerId)
      .maybeSingle();

    userId = profile?.user_id;
  }

  if (!userId) return;

  const item = subscription?.items?.data?.[0];

  const priceId = item?.plan?.id ?? null;

  const productId = item?.plan?.product ?? null;

  const tier = await getPlanIdFromProduct(productId);

  const periodEnd = item?.current_period_end
    ? new Date(item.current_period_end * 1000).toISOString()
    : null;

  const res = await supabase
    .from("subscriptions")
    .upsert(
      {
        user_id: userId,
        stripe_subscription_id: subscriptionId,
        stripe_price_id: priceId,
        stripe_product_id: productId,
        status: subscription.status,
        current_period_end: periodEnd,
        description: item?.plan?.nickname ?? null,
        amount: item?.plan?.amount ?? null,
      },
      {
        onConflict: "stripe_subscription_id",
      },
    )
    .select("id")
    .maybeSingle();

  if (res.error) {
    console.error(res.error);
    return;
  }

  await supabase
    .from("profiles")
    .update({
      tier,
      subscription_id: res?.data?.id ?? null,
    })
    .eq("user_id", userId);

  console.log("Subscription updated");
}

async function handleSubscriptionDeleted(subscription: any) {
  console.log("customer.subscription.deleted");

  const customerId = subscription?.customer;

  if (!customerId) return;

  const freeTier = await getFreePlanId();

  await supabase
    .from("subscriptions")
    .update({
      status: "canceled",
    })
    .eq("stripe_subscription_id", subscription.id);

  await supabase
    .from("profiles")
    .update({
      tier: freeTier,
      subscription_id: null,
    })
    .eq("stripe_customer_id", customerId);

  console.log("Downgraded to free");
}

async function handlePaymentRefund(charge: any) {
  console.log("charge.refunded");

  const customerId = charge?.customer;

  if (!customerId) return;

  const { data: profile } = await supabase
    .from("profiles")
    .select("*")
    .eq("stripe_customer_id", customerId)
    .maybeSingle();

  if (!profile) return;

  const freeTier = await getFreePlanId();

  await supabase
    .from("subscriptions")
    .update({
      status: "refunded",
    })
    .eq("user_id", profile.user_id);

  await supabase
    .from("profiles")
    .update({
      tier: freeTier,
      subscription_id: null,
    })
    .eq("id", profile.id);

  console.log("Refund processed");
}

/* ---------------- HANDLER MAP ---------------- */

const handlers: Record<string, (data: any) => Promise<any>> = {
  "checkout.session.completed": handleCheckoutCompleted,
  "invoice.payment_succeeded": handleInvoicePaid,
  "customer.subscription.updated": handleSubscriptionUpdated,
  "customer.subscription.deleted": handleSubscriptionDeleted,
  // "charge.refunded": handlePaymentRefund,
};

/* ---------------- SERVER ---------------- */

//@ts-ignore
Deno.serve(async (req) => {
  try {
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
      await handler(event?.data?.object);
    } else {
      console.log("UNHANDLED EVENT:", event.type);
    }

    return new Response(
      JSON.stringify({
        received: true,
      }),
      {
        status: 200,
      },
    );
  } catch (error) {
    console.error("Webhook server crash:", error);

    return new Response(
      JSON.stringify({
        error: "Internal webhook error",
      }),
      { status: 500 },
    );
  }
});
