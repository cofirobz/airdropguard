import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PRICE_ID_BY_PLAN: Record<string, string> = {
  pro: Deno.env.get("STRIPE_API_PRO_PRICE_ID") ?? "",
  business: Deno.env.get("STRIPE_API_BUSINESS_PRICE_ID") ?? "",
  featured_listing: Deno.env.get("STRIPE_AD_FEATURED_PRICE_ID") ?? "",
  banner_ad: Deno.env.get("STRIPE_AD_BANNER_PRICE_ID") ?? "",
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
    const normalizedPlan = typeof plan === "string" ? plan.toLowerCase() : "";
    const priceId = PRICE_ID_BY_PLAN[normalizedPlan];

    if (!normalizedPlan || !priceId) {
      throw new Error("Invalid plan. Must be 'pro', 'business', 'featured_listing', or 'banner_ad'.");
    }

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

    const origin = req.headers.get("origin") || "https://airdropguard.com";
    const purchaseType = normalizedPlan === "pro" || normalizedPlan === "business" ? "api" : "advertising";
    const mode = purchaseType === "advertising" ? "payment" : "subscription";

    const session = await stripe.checkout.sessions.create({
      customer: customerId,
      mode,
      line_items: [{ price: priceId, quantity: 1 }],
      success_url: successUrl || `${origin}/dashboard?success=1`,
      cancel_url: cancelUrl || `${origin}/pricing`,
      metadata: { user_id: user.id, plan: normalizedPlan, purchase_type: purchaseType },
      ...(mode === "subscription" ? {
        subscription_data: { metadata: { user_id: user.id, plan: normalizedPlan, purchase_type: purchaseType } },
      } : {}),
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
