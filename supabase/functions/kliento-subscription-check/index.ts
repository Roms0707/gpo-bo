import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface SubscriptionCheckRequest {
  user_id: string;
  product_id: string;
  service_id?: string;
}

interface SubscriptionCheckResponse {
  success: boolean;
  isSubscribed?: boolean;
  isSuspended?: boolean;
  error?: string;
}

interface KlientoAccountInfoResponse {
  code: number;
  error: number;
  data?: Array<{
    user_id: string;
    msisdn?: string;
    subscribed: boolean;
    suspended: boolean;
    status?: string;
  }>;
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { user_id, product_id, service_id }: SubscriptionCheckRequest = await req.json();

    if (!user_id || !product_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: user_id or product_id",
        } as SubscriptionCheckResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: klientoConfig, error: configError } = await supabase
      .from("platform_api_integrations")
      .select("api_url, api_key, is_active")
      .eq("api_name", "kliento")
      .maybeSingle();

    if (configError || !klientoConfig) {
      console.error("Failed to fetch Kliento config:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: true,
          isSuspended: false,
          error: "Kliento service is not configured",
        } as SubscriptionCheckResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!klientoConfig.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: true,
          isSuspended: false,
          error: "Kliento service is currently disabled",
        } as SubscriptionCheckResponse),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const klientoBaseUrl = klientoConfig.api_url;
    const accountInfoUrl = `${klientoBaseUrl}/accountinfo/all`;

    console.log(`[kliento-subscription-check] Checking subscription for user: ${user_id}`);

    const formData = new URLSearchParams();
    formData.append("user_id", user_id);
    formData.append("product_id", product_id);
    formData.append("service_id", service_id || product_id);

    const response = await fetch(accountInfoUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(klientoConfig.api_key ? { "Authorization": `Bearer ${klientoConfig.api_key}` } : {}),
      },
      body: formData.toString(),
    });

    if (!response.ok) {
      console.error(`[kliento-subscription-check] API error: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: true,
          isSuspended: false,
          error: `API error: ${response.status}`,
        } as SubscriptionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: KlientoAccountInfoResponse = await response.json();

    if (data.code !== 200 || data.error !== 0 || !data.data || data.data.length === 0) {
      console.error("[kliento-subscription-check] Invalid response:", data);
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: true,
          isSuspended: false,
          error: "Invalid response from subscription service",
        } as SubscriptionCheckResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountInfo = data.data[0];
    const isSubscribed = accountInfo.subscribed === true;
    const isSuspended = accountInfo.suspended === true;

    console.log(`[kliento-subscription-check] User ${user_id}: subscribed=${isSubscribed}, suspended=${isSuspended}`);

    return new Response(
      JSON.stringify({
        success: true,
        isSubscribed,
        isSuspended,
      } as SubscriptionCheckResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-subscription-check] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        isSubscribed: true,
        isSuspended: false,
        error: "An unexpected error occurred",
      } as SubscriptionCheckResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
