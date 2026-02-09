import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface TransactionVerifyRequest {
  billing_transaction_id: string;
  project_config_id: string;
}

interface TransactionVerifyResponse {
  success: boolean;
  user_id?: string;
  error?: string;
  status?: string;
}

interface KlientoAccountGetResponse {
  success: boolean;
  auth_token?: boolean;
  data?: Array<{
    id: number;
  }>;
}

const KLIENTO_ACCOUNT_GET_URL = "https://kliento.dv-content.io/123/account/get";

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

    const { billing_transaction_id, project_config_id }: TransactionVerifyRequest = await req.json();

    if (!billing_transaction_id || !project_config_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: billing_transaction_id or project_config_id",
        } as TransactionVerifyResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select("service_id")
      .eq("config_id", project_config_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !projectConfig) {
      console.error("[kliento-verify-transaction] Failed to fetch project config:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Project configuration not found",
        } as TransactionVerifyResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!projectConfig.service_id) {
      console.error("[kliento-verify-transaction] service_id not configured for project:", project_config_id);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Kliento service_id is not configured for this project",
        } as TransactionVerifyResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const transactionUrl = `${KLIENTO_ACCOUNT_GET_URL}?service_id=${encodeURIComponent(projectConfig.service_id)}&i_subscription_id=${encodeURIComponent(billing_transaction_id)}`;

    console.log(`[kliento-verify-transaction] Verifying transaction: ${billing_transaction_id} with service_id: ${projectConfig.service_id}`);

    const response = await fetch(transactionUrl, {
      method: "GET",
      headers: {
        "Content-Type": "application/json",
      },
    });

    if (!response.ok) {
      if (response.status === 404) {
        console.log("[kliento-verify-transaction] Transaction not found (pending)");
        return new Response(
          JSON.stringify({
            success: false,
            status: "pending",
            error: "pending",
          } as TransactionVerifyResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.error(`[kliento-verify-transaction] API error: ${response.status}`);
      return new Response(
        JSON.stringify({
          success: false,
          error: `API error: ${response.status}`,
        } as TransactionVerifyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const data: KlientoAccountGetResponse = await response.json();

    if (!data.success || !data.data || data.data.length === 0 || !data.data[0].id) {
      console.log("[kliento-verify-transaction] Invalid response or transaction pending:", data);
      return new Response(
        JSON.stringify({
          success: false,
          status: "pending",
          error: "pending",
        } as TransactionVerifyResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const userId = String(data.data[0].id);

    console.log(`[kliento-verify-transaction] Transaction verified for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
      } as TransactionVerifyResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-verify-transaction] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      } as TransactionVerifyResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
