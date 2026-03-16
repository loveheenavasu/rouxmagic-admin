//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
const stripe = new Stripe(
  //@ts-ignore
  Deno.env.get("STRIPE_SECRET_KEY")!,
  {
    apiVersion: "2025-03-31.basil",
  },
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};
//@ts-ignore
Deno.serve(async (req) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { headers: corsHeaders });
  }

  try {
    const prices = await stripe.prices.list({
      active: true,
      expand: ["data.product"],
    });
    //@ts-ignore
    const formatted = prices.data.map((price) => ({
      priceId: price.id,
      unit_amout: price.unit_amount,
      currency: price.currency,
      interval: price.recurring?.interval,
      productId: price.product.id,
      productName: price.product.name,
      description: price.product.description,
      product_metadata: price.product,
    }));

    return new Response(JSON.stringify(formatted), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 200,
    });
  } catch (err) {
    //@ts-ignore
    return new Response(JSON.stringify({ error: err.message }), {
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json",
      },
      status: 500,
    });
  }
});
