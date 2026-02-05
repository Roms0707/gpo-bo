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

interface VerifyOtpRequest {
  phone_number: string;
  otp_code: string;
  project_config_id: string;
  kliento_user_id?: string;
}

interface VerifyOtpResponse {
  success: boolean;
  user_id?: string;
  error?: string;
  remaining_attempts?: number;
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

    const { phone_number, otp_code, project_config_id, kliento_user_id }: VerifyOtpRequest = await req.json();

    if (!phone_number || !otp_code || !project_config_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields",
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!/^\d{4}$/.test(otp_code)) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid OTP format. Must be 4 digits.",
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (TEST_MODE) {
      console.log("[kliento-verify-otp] TEST MODE ENABLED - Accepting any OTP code");

      const { data: existingUser } = await supabase
        .from("users")
        .select("*")
        .eq("phone_number", phone_number)
        .eq("auth_provider", "kliento")
        .maybeSingle();

      if (existingUser) {
        console.log(`[kliento-verify-otp] TEST MODE - Existing user found: ${existingUser.id}`);
        await supabase
          .from("users")
          .update({ updated_at: new Date().toISOString() })
          .eq("id", existingUser.id);

        return new Response(
          JSON.stringify({
            success: true,
            user_id: existingUser.id,
          } as VerifyOtpResponse),
          {
            status: 200,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      const cleanPhone = phone_number.replace(/\D/g, "");
      const username = `user_${cleanPhone.substring(cleanPhone.length - 8)}`;
      const email = `${cleanPhone}@kliento-otp.local`;

      const { data: newUser, error: createError } = await supabase
        .from("users")
        .insert({
          username,
          email,
          type: "gamer",
          phone_number,
          auth_provider: "kliento",
          is_profile_public: true,
          is_profile_completed: false,
        })
        .select()
        .single();

      if (createError) {
        if (createError.code === "23505") {
          const { data: retryUser } = await supabase
            .from("users")
            .select("*")
            .eq("phone_number", phone_number)
            .maybeSingle();

          if (retryUser) {
            return new Response(
              JSON.stringify({
                success: true,
                user_id: retryUser.id,
              } as VerifyOtpResponse),
              {
                status: 200,
                headers: { ...corsHeaders, "Content-Type": "application/json" },
              }
            );
          }
        }

        console.error("[kliento-verify-otp] TEST MODE - Error creating user:", createError);
        return new Response(
          JSON.stringify({
            success: false,
            error: "Failed to create user account",
          } as VerifyOtpResponse),
          {
            status: 500,
            headers: { ...corsHeaders, "Content-Type": "application/json" },
          }
        );
      }

      console.log(`[kliento-verify-otp] TEST MODE - New user created: ${newUser.id}`);
      return new Response(
        JSON.stringify({
          success: true,
          user_id: newUser.id,
        } as VerifyOtpResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: otpRecord, error: otpError } = await supabase
      .from("kliento_otp_codes")
      .select("*")
      .eq("phone_number", phone_number)
      .eq("project_config_id", project_config_id)
      .eq("status", "valid")
      .order("created_at", { ascending: false })
      .limit(1)
      .maybeSingle();

    if (otpError) {
      console.error("[kliento-verify-otp] Error fetching OTP:", otpError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to verify OTP",
        } as VerifyOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (!otpRecord) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "No valid OTP found. Please request a new code.",
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const now = new Date();
    const expiresAt = new Date(otpRecord.expires_at);

    if (now > expiresAt) {
      await supabase
        .from("kliento_otp_codes")
        .update({ status: "expired" })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "OTP has expired. Please request a new code.",
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (otpRecord.attempt_count >= 3) {
      await supabase
        .from("kliento_otp_codes")
        .update({ status: "invalidated" })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: "Too many failed attempts. Please request a new code.",
          remaining_attempts: 0,
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const providedHash = await hashOtp(otp_code);

    if (providedHash !== otpRecord.otp_code_hash) {
      const newAttemptCount = otpRecord.attempt_count + 1;
      const remainingAttempts = 3 - newAttemptCount;

      await supabase
        .from("kliento_otp_codes")
        .update({
          attempt_count: newAttemptCount,
          ...(newAttemptCount >= 3 ? { status: "invalidated" } : {}),
        })
        .eq("id", otpRecord.id);

      return new Response(
        JSON.stringify({
          success: false,
          error: remainingAttempts > 0
            ? `Invalid OTP. ${remainingAttempts} attempt${remainingAttempts > 1 ? "s" : ""} remaining.`
            : "Too many failed attempts. Please request a new code.",
          remaining_attempts: remainingAttempts,
        } as VerifyOtpResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    await supabase
      .from("kliento_otp_codes")
      .update({ status: "used" })
      .eq("id", otpRecord.id);

    console.log(`[kliento-verify-otp] OTP verified for ${phone_number.substring(0, 4)}***`);
    console.log(`[kliento-verify-otp] Kliento user ID provided: ${kliento_user_id || 'none'}`);

    let existingUser = null;
    let findError = null;

    if (kliento_user_id) {
      const result = await supabase
        .from("users")
        .select("*")
        .eq("kliento_user_id", kliento_user_id)
        .maybeSingle();

      existingUser = result.data;
      findError = result.error;

      if (!existingUser && !findError) {
        const phoneResult = await supabase
          .from("users")
          .select("*")
          .eq("phone_number", phone_number)
          .eq("auth_provider", "kliento")
          .maybeSingle();

        existingUser = phoneResult.data;
        findError = phoneResult.error;
      }
    } else {
      const result = await supabase
        .from("users")
        .select("*")
        .eq("phone_number", phone_number)
        .eq("auth_provider", "kliento")
        .maybeSingle();

      existingUser = result.data;
      findError = result.error;
    }

    if (findError) {
      console.error("[kliento-verify-otp] Error finding user:", findError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to authenticate user",
        } as VerifyOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (existingUser) {
      console.log(`[kliento-verify-otp] Existing user found: ${existingUser.id}`);

      const updateData: Record<string, unknown> = {
        updated_at: new Date().toISOString(),
        phone_number: phone_number,
      };

      if (kliento_user_id && !existingUser.kliento_user_id) {
        updateData.kliento_user_id = kliento_user_id;
        console.log(`[kliento-verify-otp] Setting kliento_user_id on existing user: ${kliento_user_id}`);
      }

      await supabase
        .from("users")
        .update(updateData)
        .eq("id", existingUser.id);

      return new Response(
        JSON.stringify({
          success: true,
          user_id: existingUser.id,
        } as VerifyOtpResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const cleanPhone = phone_number.replace(/\D/g, "");
    const username = kliento_user_id
      ? `user_${kliento_user_id.substring(0, 8)}`
      : `user_${cleanPhone.substring(cleanPhone.length - 8)}`;
    const email = kliento_user_id
      ? `${kliento_user_id}@kliento-otp.local`
      : `${cleanPhone}@kliento-otp.local`;

    const insertData: Record<string, unknown> = {
      username,
      email,
      type: "gamer",
      phone_number,
      auth_provider: "kliento",
      is_profile_public: true,
      is_profile_completed: false,
    };

    if (kliento_user_id) {
      insertData.kliento_user_id = kliento_user_id;
      console.log(`[kliento-verify-otp] Creating new user with kliento_user_id: ${kliento_user_id}`);
    }

    const { data: newUser, error: createError } = await supabase
      .from("users")
      .insert(insertData)
      .select()
      .single();

    if (createError) {
      console.error("[kliento-verify-otp] Error creating user:", createError);

      if (createError.code === "23505") {
        const { data: retryUser } = await supabase
          .from("users")
          .select("*")
          .eq("phone_number", phone_number)
          .maybeSingle();

        if (retryUser) {
          return new Response(
            JSON.stringify({
              success: true,
              user_id: retryUser.id,
            } as VerifyOtpResponse),
            {
              status: 200,
              headers: { ...corsHeaders, "Content-Type": "application/json" },
            }
          );
        }
      }

      return new Response(
        JSON.stringify({
          success: false,
          error: "Failed to create user account",
        } as VerifyOtpResponse),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[kliento-verify-otp] New user created: ${newUser.id}`);

    return new Response(
      JSON.stringify({
        success: true,
        user_id: newUser.id,
      } as VerifyOtpResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-verify-otp] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      } as VerifyOtpResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});