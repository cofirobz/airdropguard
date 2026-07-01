import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import Stripe from "npm:stripe@14";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

const PLAN_BY_AMOUNT: Record<number, string> = {
  1900: "pro",
  9900: "business",
};

const PLAN_REQUEST_LIMITS: Record<string, number> = {
  free: 100,
  pro: 50000,
  business: 250000,
};

function generateApiKey(): string {
  const bytes = new Uint8Array(24);
  crypto.getRandomValues(bytes);
  const hex = Array.from(bytes).map((byte) => byte.toString(16).padStart(2, "0")).join("");
  return `ag_live_${hex}`;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  const stripe = new Stripe(Deno.env.get("STRIPE_SECRET_KEY")!, {
    apiVersion: "2024-06-20",
  });

  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  const signature = req.headers.get("stripe-signature");
  const webhookSecret = Deno.env.get("STRIPE_WEBHOOK_SECRET")!;
  const body = await req.text();

  let event: Stripe.Event;
  try {
    event = await stripe.webhooks.constructEventAsync(body, signature!, webhookSecret);
  } catch (err) {
    console.error("Webhook signature verification failed:", err);
    return new Response(`Webhook Error: ${(err as Error).message}`, { status: 400 });
  }

  try {
    switch (event.type) {
      case "checkout.session.completed": {
        const session = event.data.object as Stripe.Checkout.Session;
        const userId = session.metadata?.user_id;
        if (!userId) break;

        const plan = session.metadata?.plan || "pro";
        const purchaseType = session.metadata?.purchase_type;
        if (purchaseType === "advertising") {
          console.log(`Advertising checkout completed for user ${userId}, plan: ${plan}`);
          break;
        }
        const subscriptionId = session.subscription as string;
        const customerId = session.customer as string;

        const stripeSub = await stripe.subscriptions.retrieve(subscriptionId);
        const normalizedPlan = plan in PLAN_REQUEST_LIMITS ? plan : "free";
        const { data: existingSub } = await supabase
          .from("api_subscriptions")
          .select("key_value")
          .eq("user_id", userId)
          .maybeSingle();

        await supabase.from("api_subscriptions").upsert({
          user_id: userId,
          stripe_customer_id: customerId,
          stripe_subscription_id: subscriptionId,
          plan: normalizedPlan,
          status: "active",
          key_value: existingSub?.key_value || generateApiKey(),
          requests_used: 0,
          requests_limit: PLAN_REQUEST_LIMITS[normalizedPlan] ?? 100,
          current_period_start: new Date(stripeSub.current_period_start * 1000).toISOString(),
          current_period_end: new Date(stripeSub.current_period_end * 1000).toISOString(),
          updated_at: new Date().toISOString(),
        }, { onConflict: "user_id" });

        console.log(`Subscription activated for user ${userId}, plan: ${plan}`);
        break;
      }

      case "customer.subscription.updated": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        if (sub.metadata?.purchase_type === "advertising") {
          console.log(`Advertising subscription updated for user ${userId}`);
          break;
        }

        const amount = sub.items.data[0]?.price?.unit_amount ?? 0;
        const plan = PLAN_BY_AMOUNT[amount] || "free";

        await supabase.from("api_subscriptions")
          .update({
            plan,
            status: sub.status,
            requests_limit: PLAN_REQUEST_LIMITS[plan] ?? 100,
            current_period_start: new Date(sub.current_period_start * 1000).toISOString(),
            current_period_end: new Date(sub.current_period_end * 1000).toISOString(),
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        console.log(`Subscription updated for user ${userId}: plan=${plan}, status=${sub.status}`);
        break;
      }

      case "customer.subscription.deleted": {
        const sub = event.data.object as Stripe.Subscription;
        const userId = sub.metadata?.user_id;
        if (!userId) break;

        if (sub.metadata?.purchase_type === "advertising") {
          console.log(`Advertising subscription deleted for user ${userId}`);
          break;
        }

        await supabase.from("api_subscriptions")
          .update({
            plan: "free",
            status: "canceled",
            stripe_subscription_id: null,
            updated_at: new Date().toISOString(),
          })
          .eq("user_id", userId);

        console.log(`Subscription canceled for user ${userId}`);
        break;
      }

      case "invoice.payment_failed": {
        const invoice = event.data.object as Stripe.Invoice;
        const subId = invoice.subscription as string;
        if (!subId) break;

        await supabase.from("api_subscriptions")
          .update({ status: "past_due", updated_at: new Date().toISOString() })
          .eq("stripe_subscription_id", subId);
        break;
      }
    }
  } catch (err) {
    console.error("Webhook handler error:", err);
  }

  return new Response(JSON.stringify({ received: true }), {
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
});
