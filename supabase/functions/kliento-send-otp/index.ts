import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";

const TEST_MODE = false;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface BillingInfo {
  bizoffer_id: string;
  billing_type: string;
  billingchannel: string;
  billingchannel_label: string;
  product_id: string;
  atom_product_id: string;
  subscription_id: string;
  offer_price: string;
  offer_mccmnc: string;
  evt_subscription_status: string;
}

interface SendOtpRequest {
  phone_number: string;
  project_config_id: string;
  billing_info?: BillingInfo;
}

interface SendOtpResponse {
  success: boolean;
  message?: string;
  error?: string;
  expires_in_seconds?: number;
}

interface SenditoApiResponse {
  code: number;
  error: number;
  data?: {
    message: string;
  };
}

function generateOtp(): string {
  const array = new Uint32Array(1);
  crypto.getRandomValues(array);
  const otp = (array[0] % 10000).toString().padStart(4, "0");
  return otp;
}

async function hashOtp(otp: string): Promise<string> {
  const encoder = new TextEncoder();
  const data = encoder.encode(otp);
  const hashBuffer = await crypto.subtle.digest("SHA-256", data);
  return encodeHex(new Uint8Array(hashBuffer));
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

    const { phone_number, project_config_id, billing_info }: SendOtpRequest = await req.json();

    if (!phone_number || !project_config_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: phone_number or project_config_id",
        } as SendOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[kliento-send-otp] Billing info received: ${billing_info ? JSON.stringify(billing_info) : 'none'}`);

    if (!TEST_MODE) {
      if (!billing_info) {
        console.error("[kliento-send-otp] Missing billing_info for production SMS");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Billing information is required for SMS delivery",
          } as SendOtpResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!billing_info.subscription_id) {
        console.error("[kliento-send-otp] Missing subscription_id in billing_info");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing subscription_id in billing information",
          } as SendOtpResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      if (!billing_info.bizoffer_id) {
        console.error("[kliento-send-otp] Missing bizoffer_id in billing_info");
        return new Response(
          JSON.stringify({
            success: false,
            error: "Missing bizoffer_id in billing information",
          } as SendOtpResponse),
          {
            status: 400,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }
    }

    if (TEST_MODE) {
      console.log("[kliento-send-otp] TEST MODE ENABLED - Skipping SMS send");
      console.log(`[kliento-send-otp] TEST MODE - OTP for ${phone_number.substring(0, 4)}***: 1234`);

      const testOtpHash = await hashOtp("1234");
      const testExpiresAt = new Date(Date.now() + 5 * 60 * 1000);

      await supabase
        .from("kliento_otp_codes")
        .update({ status: "invalidated" })
        .eq("phone_number", phone_number)
        .eq("project_config_id", project_config_id)
        .eq("status", "valid");

      await supabase
        .from("kliento_otp_codes")
        .insert({
          phone_number,
          otp_code_hash: testOtpHash,
          status: "valid",
          expires_at: testExpiresAt.toISOString(),
          attempt_count: 0,
          project_config_id,
        });

      return new Response(
        JSON.stringify({
          success: true,
          message: "OTP sent successfully (TEST MODE - use code: 1234)",
          expires_in_seconds: 300,
        } as SendOtpResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select("id, kliento_auth_type, kliento_otp_sms_template, default_phone_country_code, default_phone_country_iso")
      .eq("id", project_config_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !projectConfig) {
      console.error("[kliento-send-otp] Project config not found:", configError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid project configuration",
        } as SendOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (projectConfig.kliento_auth_type !== "otp") {
      return new Response(
        JSON.stringify({
          success: false,
          error: "OTP authentication is not enabled for this project",
        } as SendOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!projectConfig.default_phone_country_code) {
      console.error("[kliento-send-otp] Missing default_phone_country_code in project configuration");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Phone country code is not configured for this project",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!projectConfig.default_phone_country_iso) {
      console.error("[kliento-send-otp] Missing default_phone_country_iso in project configuration");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Phone country ISO code is not configured for this project",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: senditoConfig, error: senditoError } = await supabase
      .from("platform_api_integrations")
      .select("api_url, api_key, is_active, extra_config")
      .eq("api_name", "sendito")
      .maybeSingle();

    if (senditoError || !senditoConfig) {
      console.error("[kliento-send-otp] Sendito config not found:", senditoError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service is not configured",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!senditoConfig.is_active) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service is currently disabled",
        } as SendOtpResponse),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { error: invalidateError } = await supabase
      .from("kliento_otp_codes")
      .update({ status: "invalidated" })
      .eq("phone_number", phone_number)
      .eq("project_config_id", project_config_id)
      .eq("status", "valid");

    if (invalidateError) {
      console.warn("[kliento-send-otp] Failed to invalidate previous OTPs:", invalidateError);
    }

    const otpCode = generateOtp();
    const otpHash = await hashOtp(otpCode);
    const expiresAt = new Date(Date.now() + 60 * 1000);

    console.log(`[kliento-send-otp] Generated OTP for ${phone_number.substring(0, 4)}***: ${otpCode}`);

    const { error: insertError } = await supabase
      .from("kliento_otp_codes")
      .insert({
        phone_number,
        otp_code_hash: otpHash,
        status: "valid",
        expires_at: expiresAt.toISOString(),
        attempt_count: 0,
        project_config_id,
      });

    if (insertError) {
      console.error("[kliento-send-otp] Failed to insert OTP:", insertError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to generate OTP",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const smsTemplate = projectConfig.kliento_otp_sms_template || "Your OTP is {{OTP_CODE}}";
    const message = smsTemplate.replace("{{OTP_CODE}}", otpCode);

    const sesameLogin = senditoConfig.api_key;
    const sesamePasswordBase64 = senditoConfig.extra_config?.api_secret_key;

    if (!sesameLogin || !sesamePasswordBase64) {
      console.error("[kliento-send-otp] Missing Sendito credentials: api_key or extra_config.api_secret_key");
      return new Response(
        JSON.stringify({
          success: false,
          error: "SMS service configuration error",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const sesamePassword = atob(sesamePasswordBase64);

    const senditoUrl = new URL(senditoConfig.api_url);
    senditoUrl.searchParams.set("sesame_login", sesameLogin);
    senditoUrl.searchParams.set("sesame_password", sesamePassword);

    console.log(`[kliento-send-otp] Sending SMS to ${phone_number.substring(0, 4)}*** via Sendito`);
    console.log(`[kliento-send-otp] Sendito URL: ${senditoConfig.api_url} (with auth params)`);
    console.log(`[kliento-send-otp] operation_id: ${billing_info!.subscription_id}, offer_id: ${billing_info!.bizoffer_id}`);

    const formData = new FormData();
    formData.append("destination", phone_number);
    formData.append("message", message);
    formData.append("type", "push");
    formData.append("country", projectConfig.default_phone_country_iso);
    formData.append("operation_id", billing_info!.subscription_id);
    formData.append("offer_id", billing_info!.bizoffer_id);

    const smsResponse = await fetch(senditoUrl.toString(), {
      method: "POST",
      body: formData,
    });

    const smsResponseText = await smsResponse.text();
    console.log(`[kliento-send-otp] Sendito response status: ${smsResponse.status}`);
    console.log(`[kliento-send-otp] Sendito raw response: ${smsResponseText}`);

    let smsResult: SenditoApiResponse;
    try {
      smsResult = JSON.parse(smsResponseText);
    } catch {
      console.error("[kliento-send-otp] Failed to parse Sendito response as JSON");
      await supabase
        .from("kliento_otp_codes")
        .update({ status: "invalidated" })
        .eq("phone_number", phone_number)
        .eq("otp_code_hash", otpHash);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send SMS. Please try again.",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (smsResult.code !== 202 || smsResult.error !== 0) {
      console.error("[kliento-send-otp] SMS send failed:", smsResult);

      await supabase
        .from("kliento_otp_codes")
        .update({ status: "invalidated" })
        .eq("phone_number", phone_number)
        .eq("otp_code_hash", otpHash);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to send SMS. Please try again.",
        } as SendOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[kliento-send-otp] SMS sent successfully to ${phone_number.substring(0, 4)}***, message_id: ${smsResult.data?.message}`);

    return new Response(
      JSON.stringify({
        success: true,
        message: "OTP sent successfully",
        expires_in_seconds: 60,
      } as SendOtpResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-send-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      } as SendOtpResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
