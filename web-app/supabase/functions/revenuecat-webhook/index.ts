import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.3";

const REVENUECAT_WEBHOOK_AUTH_TOKEN = Deno.env.get("REVENUECAT_WEBHOOK_AUTH_TOKEN");
const SUPABASE_URL = Deno.env.get("SUPABASE_URL") || "";
const SUPABASE_SERVICE_ROLE_KEY = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") || "";

const supabase = createClient(SUPABASE_URL, SUPABASE_SERVICE_ROLE_KEY);

const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type',
  'Access-Control-Allow-Methods': 'POST, OPTIONS',
  'Strict-Transport-Security': 'max-age=31536000; includeSubDomains',
  'X-Content-Type-Options': 'nosniff',
  'X-Frame-Options': 'DENY',
  'Content-Security-Policy': "default-src 'none'",
};

serve(async (req: Request) => {
  // 0. Handle CORS Preflight
  if (req.method === 'OPTIONS') {
    return new Response('ok', { headers: corsHeaders });
  }

  try {
    // 1. Verify Request Method
    if (req.method !== "POST") {
      return new Response("Method not allowed", { status: 405, headers: corsHeaders });
    }

    // 2. Verify Authorization Header (Security)
    const authHeader = req.headers.get("authorization");
    if (authHeader !== `Bearer ${REVENUECAT_WEBHOOK_AUTH_TOKEN}`) {
      console.error("Unauthorized webhook attempt");
      return new Response("Unauthorized", { status: 401, headers: corsHeaders });
    }

    // 3. Parse Webhook Payload
    const body = await req.json();
    const event = body.event;

    if (!event) {
      return new Response("No event found", { status: 400, headers: corsHeaders });
    }

    const { type, app_user_id } = event;
    console.log(`Processing RevenueCat Event: ${type} for User: ${app_user_id}`);

    if (!app_user_id) {
      return new Response("No app_user_id found", { status: 400, headers: corsHeaders });
    }

    // 4. Handle Event Types
    let es_pro = false;
    let plan = 'FREE';

    switch (type) {
      case "INITIAL_PURCHASE":
      case "RENEWAL":
      case "NON_RENEWING_PURCHASE":
        es_pro = true;
        plan = 'PRO';
        break;

      case "CANCELLATION":
      case "EXPIRATION":
      case "BILLING_ISSUE":
        es_pro = false;
        plan = 'FREE';
        break;

      default:
        console.log(`Unhandled event type: ${type}. Ignoring.`);
        return new Response("Event ignored", { status: 200, headers: corsHeaders });
    }

    // 5. Update Supabase Database
    const { error } = await supabase
      .from('users') // perfiles/users table
      .update({ es_pro, plan, planExpiryDate: plan === 'PRO' ? null : undefined })
      .eq('id', app_user_id); // Since app_user_id is exactly the Supabase UUID

    if (error) {
      console.error("Error updating Supabase:", error);
      return new Response("Database error", { status: 500, headers: corsHeaders });
    }

    console.log(`Successfully updated user ${app_user_id} to PRO: ${es_pro}`);
    return new Response(JSON.stringify({ success: true }), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });

  } catch (error) {
    console.error("Webhook error:", error);
    return new Response("Internal Server Error", { status: 500, headers: corsHeaders });
  }
});
