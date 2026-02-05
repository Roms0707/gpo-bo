import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";
import { crypto } from "jsr:@std/crypto";
import { encodeHex } from "jsr:@std/encoding/hex";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KlientoLoginRequest {
  login: string;
  password: string;
  product_id: string;
}

interface KlientoLoginResponse {
  success: boolean;
  user_id?: string;
  error?: string;
  message?: string;
}

interface KlientoApiResponse {
  code: number;
  error: number;
  data?: KlientoUserData[];
}

interface KlientoUserData {
  user_id: string;
  msisdn?: string;
  email?: string;
  firstname?: string;
  lastname?: string;
  nickname?: string;
  country?: string;
  subscribed?: boolean;
  total_credit?: number;
  offer?: KlientoOffer[];
}

interface KlientoOffer {
  account_offer_id: number;
  bizoffer_id: string;
  status: string;
  expire_date?: string;
}

interface KlientoAccountInfo {
  user_id: string;
  email?: string;
  country?: string;
  subscribed?: boolean;
  total_credit?: number;
}

async function hashPassword(password: string): Promise<string> {
  const prefix = "f5c028c81f";
  const suffix = "560e6cd05c8513b96062b0";
  const toHash = `${prefix}${password}${suffix}`;

  const encoder = new TextEncoder();
  const data = encoder.encode(toHash);
  const hashBuffer = await crypto.subtle.digest("SHA-1", data);

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

    const { login, password, product_id }: KlientoLoginRequest = await req.json();

    if (!login || !password || !product_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: login, password, or product_id",
        } as KlientoLoginResponse),
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
          error: "Kliento authentication service is not configured",
        } as KlientoLoginResponse),
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
          error: "Kliento authentication service is currently disabled",
        } as KlientoLoginResponse),
        {
          status: 503,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const klientoBaseUrl = klientoConfig.api_url;
    const loginUrl = `${klientoBaseUrl}/login/dve`;

    const isPhoneNumber = /^\+?\d{9,15}$/.test(login.replace(/\s/g, ''));
    console.log(`[kliento-auth] Login type: ${isPhoneNumber ? 'phone' : 'username'}`);
    console.log(`[kliento-auth] Attempting login for: ${login.substring(0, 4)}***`);

    const hashedPassword = await hashPassword(password);
    console.log(`[kliento-auth] Password hashed successfully`);

    const formData = new URLSearchParams();
    formData.append("login", login);
    formData.append("password_dve", hashedPassword);
    formData.append("service_id", product_id);

    console.log(`[kliento-auth] Request URL: ${loginUrl}`);
    console.log(`[kliento-auth] Request body: login=${login.substring(0, 4)}***, service_id=${product_id}`);

    const loginResponse = await fetch(loginUrl, {
      method: "POST",
      headers: {
        "Content-Type": "application/x-www-form-urlencoded",
        ...(klientoConfig.api_key ? { "Authorization": `Bearer ${klientoConfig.api_key}` } : {}),
      },
      body: formData.toString(),
    });

    const responseText = await loginResponse.text();
    console.log(`[kliento-auth] Response status: ${loginResponse.status}`);
    console.log(`[kliento-auth] Raw response: ${responseText}`);

    let loginData: Record<string, unknown>;
    try {
      loginData = JSON.parse(responseText);
    } catch {
      console.error("[kliento-auth] Failed to parse response as JSON");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from authentication service",
        } as KlientoLoginResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[kliento-auth] Parsed response: ${JSON.stringify(loginData)}`);

    if (!loginResponse.ok) {
      console.error("[kliento-auth] Login failed with status:", loginResponse.status);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed (HTTP ${loginResponse.status})`,
          message: "Invalid credentials or user not found",
        } as KlientoLoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const code = loginData.code as number | undefined;
    const errorCode = loginData.error as number | undefined;

    if (code !== undefined && code !== 200) {
      console.error("[kliento-auth] Login failed with code:", code);
      return new Response(
        JSON.stringify({
          success: false,
          error: `Authentication failed (code: ${code}, error: ${errorCode})`,
          message: "Invalid credentials or user not found",
        } as KlientoLoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let userData: Record<string, unknown> | undefined;

    if (loginData.data) {
      if (Array.isArray(loginData.data) && loginData.data.length > 0) {
        userData = loginData.data[0] as Record<string, unknown>;
      } else if (typeof loginData.data === "object" && !Array.isArray(loginData.data)) {
        userData = loginData.data as Record<string, unknown>;
      }
    } else {
      userData = loginData;
    }

    if (!userData) {
      console.error("[kliento-auth] No user data found in response");
      return new Response(
        JSON.stringify({
          success: false,
          error: "No user data returned from authentication service",
        } as KlientoLoginResponse),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[kliento-auth] Extracted user data: ${JSON.stringify(userData)}`);

    const rawUserId = userData.user_id || userData.userId || userData.id;
    const userId = rawUserId !== undefined && rawUserId !== null ? String(rawUserId) : undefined;

    if (!userId) {
      console.error("[kliento-auth] No user_id in response:", loginData);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid response from authentication service",
        } as KlientoLoginResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountInfo: KlientoAccountInfo = {
      user_id: userId,
      email: userData.email as string | undefined,
      country: userData.country as string | undefined,
      subscribed: userData.subscribed as boolean | undefined,
      total_credit: userData.total_credit as number | undefined,
    };

    console.log(`[kliento-auth] Login successful for user: ${userId}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: userId,
        account_info: accountInfo,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-auth] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred during authentication",
      } as KlientoLoginResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});