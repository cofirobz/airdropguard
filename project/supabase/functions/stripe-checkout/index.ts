import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLANS: Record<string, { name: string; description: string; unit_amount: number; currency: string }> = {
  pro: {
    name: "Airdrop Guard API – Pro",
    description: "10,000 API requests/month · Score, risk, summary & category breakdown",
    unit_amount: 1900,
    currency: "gbp",
  },
  business: {
    name: "Airdrop Guard API – Business",
    description: "100,000 API requests/month · Full API access including review history",
    unit_amount: 9900,
    currency: "gbp",
  },
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const authHeader = req.headers.get("Authorization");
    if (!authHeader) throw new Error("Missing authorization header");

    const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
      apiVersion: "2024-06-20",
    });

    const supabase = createClient(
      Deno.env.get("SUPABASE_URL")!,
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
    );

    const { data: { user }, error: authError } = await supabase.auth.getUser(
      authHeader.replace("Bearer ", "")
    );
    if (authError || !user) throw new Error("Invalid or expired token");

    const { plan, successUrl, cancelUrl } = await req.json();
    if (!plan || !PLANS[plan]) throw new Error("Invalid plan. Must be 'pro' or 'business'");

    const { data: sub } = await supabase
      .from("api_subscriptions")
      .select("stripe_customer_id")
      .eq("user_id", user.id)
      .maybeSingle();

    let customerId = sub?.stripe_customer_id;
    if (!customerId) {
      const customer = await stripe.customers.create({
        email: user.email,
        metadata: { user_id: user.id },
      });
      customerId = customer.id;
    }

    const planData = PLANS[plan];
    const origin = req.headers.get("origin") || "https://airdropguard.com";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode: "subscription",
      line_items: [{
        price_data: {
          currency: planData.currency,
          product_data: {
            name: planData.name,
            description: planData.description,
          },
          unit_amount: planData.unit_amount,
          recurring: { interval: "month" },
        },
        quantity: 1,
      }],
      success_url: successUrl || `${origin}/dashboard?success=1`,
      cancel_url: cancelUrl || `${origin}/pricing`,
      metadata: { user_id: user.id, plan },
      subscription_data: { metadata: { user_id: user.id, plan } },
      allow_promotion_codes: true,
    });

    return new Response(JSON.stringify({ url: session.url }), {
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (err) {
    return new Response(JSON.stringify({ error: (err as Error).message }), {
      status: 400,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  }
});
