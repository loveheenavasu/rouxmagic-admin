//@ts-ignore
import Stripe from "npm:stripe";
//@ts-ignore
import { createClient } from "npm:@supabase/supabase-js";

//@ts-ignore
const stripe = new Stripe("Deno.env.get("STRIPE_SECRET_KEY")"!, {
  apiVersion: "2025-03-31.basil",
});

const supabase = createClient(
  //@ts-ignore
  Deno.env.get("SUPABASE_URL"),
  //@ts-ignore
  Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")
);

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
  "Access-Control-Allow-Methods": "POST, OPTIONS",
};

//@ts-ignore
Deno.serve(async (req) => {
  const corsHeaders = {
    "Access-Control-Allow-Origin": "*",
    "Access-Control-Allow-Headers": "authorization, x-client-info, apikey, content-type",
    "Access-Control-Allow-Methods": "POST, OPTIONS",
  };

  // Handle preflight OPTIONS request
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Only allow POST for actual detach
  if (req.method !== "POST") {
    return new Response(JSON.stringify({ error: "Method not allowed" }), {
      status: 405,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }

  try {
    // Your authentication + detach logic here...
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing Authorization");

    const token = authHeader.replace("Bearer ", "");
    const { data: { user }, error: authError } = await supabase.auth.getUser(token);
    if (!user || authError) throw new Error("Unauthorized");

    const { paymentMethodId } = await req.json();
    if (!paymentMethodId) throw new Error("Missing paymentMethodId");

    await stripe.paymentMethods.detach(paymentMethodId);

    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    console.error(err);
    //@ts-ignore
    return new Response(JSON.stringify({ error: err.message || "Internal server error" }), {
      status: 500,
      headers: { "Content-Type": "application/json", ...corsHeaders },
    });
  }
});