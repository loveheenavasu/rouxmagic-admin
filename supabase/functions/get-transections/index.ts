//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { serve } from "https://deno.land/std@0.168.0/http/server.ts";

const stripe = new Stripe(
  "Deno.env.get("STRIPE_SECRET_KEY")",
  {
    apiVersion: "2024-06-20",
  }
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers":
    "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "GET, OPTIONS",
};

//@ts-ignore
serve(async (req: any) => {

  // Handle preflight request
  if (req.method === "OPTIONS") {
    return new Response("ok", { headers: corsHeaders });
  }

  try {
    const { customerId } = await req.json();

    if (!customerId) {
      return new Response(
        JSON.stringify({ error: "Customer ID is required" }),
        {
          status: 400,
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Fetch recent invoices
    const invoices = await stripe.invoices.list({
      customer: customerId,
      limit: 10,
      expand: ["data.payment_intent"],
    });

    const transactions = invoices.data.map((invoice: any) => ({
      id: invoice.id,
      amount: invoice.amount_paid,
      currency: invoice.currency,
      status: invoice.status,
      date: invoice.created,
      description: invoice.description,
      paymentIntent: invoice.payment_intent,
    }));

    return new Response(
      JSON.stringify({
        success: true,
        transactions,
      }),
      {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  } catch (error) {
    return new Response(
      JSON.stringify({
        //@ts-ignore
        error: error.message,
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