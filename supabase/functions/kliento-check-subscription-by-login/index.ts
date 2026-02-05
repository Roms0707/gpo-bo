import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const TEST_MODE = false;
const FORCE_UNSUBSCRIBED_TEST = false;

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CheckSubscriptionRequest {
  login: string;
  project_config_id: string;
}

interface KlientoOfferClientInfo {
  atom_pack?: string;
  offer_price?: string;
  lastCycleDate?: string;
  nextCycleDate?: string;
  billingchannel?: string;
  expirationDate?: string;
  suspensionDate?: string;
  lastInvoiceDate?: string;
  nextInvoiceDate?: string;
  subscription_id?: string;
  cancellationDate?: string;
  premiumStartDate?: string;
  subscription_date?: string;
  offer_billingchannel?: string;
  evt_subscription_status?: string;
  offer_mccmnc?: string;
}

interface KlientoOffer {
  type?: string;
  account_offer_id: string | number;
  bizoffer_id: string;
  billing_type?: string;
  status?: string;
  ins_date?: string;
  upd_date?: string;
  expire_date?: string;
  client_offer_infos?: KlientoOfferClientInfo;
  product_id?: string;
  atom_product_id?: string;
  billingchannel?: string;
  billingchannel_label?: string;
}

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

interface CheckSubscriptionResponse {
  success: boolean;
  isSubscribed?: boolean;
  phoneNumber?: string;
  userId?: string;
  redirectUrl?: string;
  billingInfo?: BillingInfo;
  error?: string;
}

interface KlientoMsisdnExistsResponse {
  code: number;
  error: number;
  data?: {
    success?: string;
  };
}

interface KlientoLoginExistsResponse {
  code: number;
  error: number;
  data?: {
    success?: string;
  };
}

interface KlientoAccountInfoResponse {
  code: number;
  error: number;
  data?: Array<{
    user_id: string;
    msisdn?: string;
    subscribed: boolean;
    suspended?: boolean;
    status?: string;
    offer?: KlientoOffer[];
  }>;
}

interface SmartpagesResponse {
  code: string;
  result?: {
    url_redirect: string;
  };
}

interface SmartpagesApiConfig {
  api_url: string;
  api_key: string;
}

const KLIENTO_BASE_URL = "https://userv1.dv-content.io";

function extractBillingInfo(offer: KlientoOffer): BillingInfo {
  return {
    bizoffer_id: offer.bizoffer_id || "",
    billing_type: offer.billing_type || "",
    billingchannel: offer.billingchannel || "",
    billingchannel_label: offer.billingchannel_label || "",
    product_id: offer.product_id || "",
    atom_product_id: offer.atom_product_id || "",
    subscription_id: offer.client_offer_infos?.subscription_id || "",
    offer_price: offer.client_offer_infos?.offer_price || "",
    offer_mccmnc: offer.client_offer_infos?.offer_mccmnc || "",
    evt_subscription_status: offer.client_offer_infos?.evt_subscription_status || "",
  };
}

async function getSmartpagesRedirectUrl(
  apiConfig: SmartpagesApiConfig,
  packageId: string,
  spTemplate: string,
  klientoUserId: string,
  domain: string
): Promise<string | null> {
  try {
    const callbackOk = `https://${domain}/callback?espok=1`;
    const callbackKo = `https://${domain}/callback?espok=0`;

    const requestBody = {
      package_id: packageId,
      page: spTemplate,
      kliento_user_id: klientoUserId,
      transaction_id: "auto",
      callback_ok: callbackOk,
      callback_ko: callbackKo,
    };

    console.log(`[kliento-check-subscription-by-login] ========== SMARTPAGES API CALL ==========`);
    console.log(`[kliento-check-subscription-by-login] URL: ${apiConfig.api_url}`);
    console.log(`[kliento-check-subscription-by-login] Method: POST`);
    console.log(`[kliento-check-subscription-by-login] Headers: { "Content-Type": "application/json", "x-api-key": "${apiConfig.api_key.substring(0, 8)}..." }`);
    console.log(`[kliento-check-subscription-by-login] Request Body: ${JSON.stringify(requestBody)}`);
    console.log(`[kliento-check-subscription-by-login] =========================================`);

    const response = await fetch(apiConfig.api_url, {
      method: "POST",
      headers: {
        "Content-Type": "application/json",
        "Accept": "application/json",
        "x-api-key": apiConfig.api_key,
      },
      body: JSON.stringify(requestBody),
    });

    const responseText = await response.text();
    console.log(`[kliento-check-subscription-by-login] ========== SMARTPAGES RESPONSE ==========`);
    console.log(`[kliento-check-subscription-by-login] Status: ${response.status}`);
    console.log(`[kliento-check-subscription-by-login] Response Body: ${responseText}`);
    console.log(`[kliento-check-subscription-by-login] =========================================`);

    if (!response.ok) {
      console.error(`[kliento-check-subscription-by-login] Smartpages API error: ${response.status}`);
      return null;
    }

    if (responseText.trim().startsWith("<")) {
      console.error(`[kliento-check-subscription-by-login] Smartpages returned HTML instead of JSON. Full response:`);
      console.error(responseText);
      return null;
    }

    let data: SmartpagesResponse;
    try {
      data = JSON.parse(responseText);
    } catch (parseError) {
      console.error(`[kliento-check-subscription-by-login] Failed to parse Smartpages response as JSON: ${parseError}`);
      return null;
    }

    if (data.code === "ok" && data.result?.url_redirect) {
      console.log(`[kliento-check-subscription-by-login] Got Smartpages redirect URL`);
      return data.result.url_redirect;
    }

    console.log(`[kliento-check-subscription-by-login] Smartpages response code: ${data.code}`);
    return null;
  } catch (error) {
    console.error(`[kliento-check-subscription-by-login] Smartpages API call failed:`, error);
    return null;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  if (TEST_MODE) {
    const { login }: CheckSubscriptionRequest = await req.json();
    const testPhoneNumber = login?.startsWith("+") ? login : `+${login}`;
    console.log("[kliento-check-subscription-by-login] TEST MODE ENABLED - Bypassing subscription check");
    console.log(`[kliento-check-subscription-by-login] TEST MODE - Using phone: ${testPhoneNumber.substring(0, 4)}***`);
    return new Response(
      JSON.stringify({
        success: true,
        isSubscribed: true,
        phoneNumber: testPhoneNumber,
        userId: "test-user-12345",
        billingInfo: {
          bizoffer_id: "4691",
          billing_type: "bod",
          billingchannel: "3",
          billingchannel_label: "MNO",
          product_id: "1894",
          atom_product_id: "1894",
          subscription_id: "test-subscription-id",
          offer_price: "10",
          offer_mccmnc: "60400",
          evt_subscription_status: "ACTIVE",
        },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey, {
      auth: {
        autoRefreshToken: false,
        persistSession: false
      }
    });

    const { login, project_config_id }: CheckSubscriptionRequest = await req.json();

    if (!login || !project_config_id) {
      return new Response(
        JSON.stringify({
          success: false,
          error: "Missing required fields: login or project_config_id",
        } as CheckSubscriptionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: projectConfig, error: projectConfigError } = await supabase
      .from("project_configurations")
      .select("id, product_id, kliento_auth_type, package_id, sp_template, domain, lp_redirect_no_account")
      .eq("id", project_config_id)
      .eq("is_active", true)
      .maybeSingle();

    if (projectConfigError || !projectConfig) {
      console.error("[kliento-check-subscription-by-login] Project config not found:", projectConfigError);
      return new Response(
        JSON.stringify({
          success: false,
          error: "Invalid project configuration",
        } as CheckSubscriptionResponse),
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
        } as CheckSubscriptionResponse),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let smartpagesApiConfig: SmartpagesApiConfig | null = null;
    if (projectConfig.package_id && projectConfig.sp_template && projectConfig.domain) {
      const { data: apiIntegration } = await supabase
        .from("platform_api_integrations")
        .select("api_url, api_key")
        .eq("api_name", "smartpages")
        .eq("is_active", true)
        .maybeSingle();

      if (apiIntegration) {
        smartpagesApiConfig = {
          api_url: apiIntegration.api_url,
          api_key: apiIntegration.api_key,
        };
      }
    }

    const productId = projectConfig.product_id || "";
    const encodedLogin = encodeURIComponent(login.startsWith("+") ? login : `+${login}`);

    console.log(`[kliento-check-subscription-by-login] Checking subscription for login: ${login.substring(0, 4)}***`);
    console.log(`[kliento-check-subscription-by-login] Product ID: ${productId}`);

    let klientoUserId: string | null = null;

    console.log("[kliento-check-subscription-by-login] Step 1: Calling ismsisdnexists...");
    const msisdnExistsUrl = `${KLIENTO_BASE_URL}/accountinfo/ismsisdnexists?msisdn=${encodedLogin}`;
    console.log(`[kliento-check-subscription-by-login] URL: ${msisdnExistsUrl}`);

    try {
      const msisdnResponse = await fetch(msisdnExistsUrl, {
        method: "GET",
        headers: { "Content-Type": "application/json" },
      });

      const msisdnText = await msisdnResponse.text();
      console.log(`[kliento-check-subscription-by-login] ismsisdnexists response: ${msisdnText}`);

      if (msisdnResponse.ok) {
        try {
          const msisdnData: KlientoMsisdnExistsResponse = JSON.parse(msisdnText);
          if (msisdnData.code === 200 && msisdnData.error === 0 && msisdnData.data?.success) {
            klientoUserId = msisdnData.data.success;
            console.log(`[kliento-check-subscription-by-login] Found user_id from ismsisdnexists: ${klientoUserId}`);
          }
        } catch {
          console.log("[kliento-check-subscription-by-login] Failed to parse ismsisdnexists response");
        }
      }
    } catch (err) {
      console.log("[kliento-check-subscription-by-login] ismsisdnexists request failed:", err);
    }

    if (!klientoUserId) {
      console.log("[kliento-check-subscription-by-login] Step 2: Calling isloginexists (fallback)...");
      const loginExistsUrl = `${KLIENTO_BASE_URL}/accountinfo/isloginexists?msisdn=${encodedLogin}&product_id=${productId}&service_id=${productId}`;
      console.log(`[kliento-check-subscription-by-login] URL: ${loginExistsUrl}`);

      try {
        const loginResponse = await fetch(loginExistsUrl, {
          method: "GET",
          headers: { "Content-Type": "application/json" },
        });

        const loginText = await loginResponse.text();
        console.log(`[kliento-check-subscription-by-login] isloginexists response: ${loginText}`);

        if (loginResponse.ok) {
          try {
            const loginData: KlientoLoginExistsResponse = JSON.parse(loginText);
            if (loginData.code === 200 && loginData.error === 0 && loginData.data?.success) {
              klientoUserId = loginData.data.success;
              console.log(`[kliento-check-subscription-by-login] Found user_id from isloginexists: ${klientoUserId}`);
            }
          } catch {
            console.log("[kliento-check-subscription-by-login] Failed to parse isloginexists response");
          }
        }
      } catch (err) {
        console.log("[kliento-check-subscription-by-login] isloginexists request failed:", err);
      }
    }

    async function getRedirectUrl(userId: string | null): Promise<string | undefined> {
      if (smartpagesApiConfig && userId && projectConfig.package_id && projectConfig.sp_template && projectConfig.domain) {
        const dynamicUrl = await getSmartpagesRedirectUrl(
          smartpagesApiConfig,
          projectConfig.package_id,
          projectConfig.sp_template,
          userId,
          projectConfig.domain
        );
        if (dynamicUrl) {
          return dynamicUrl;
        }
      }
      return undefined;
    }

    if (!klientoUserId) {
      console.log("[kliento-check-subscription-by-login] User not found in Kliento");
      const redirectUrl = projectConfig.lp_redirect_no_account || undefined;
      if (redirectUrl) {
        console.log(`[kliento-check-subscription-by-login] Using lp_redirect_no_account: ${redirectUrl}`);
      }
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: false,
          redirectUrl,
          error: "User not found",
        } as CheckSubscriptionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log("[kliento-check-subscription-by-login] Step 3: Calling accountinfo/all...");
    const accountInfoUrl = `${KLIENTO_BASE_URL}/accountinfo/all?user_id=${klientoUserId}&service_id=${productId}&product_id=${productId}`;
    console.log(`[kliento-check-subscription-by-login] URL: ${accountInfoUrl}`);

    const accountResponse = await fetch(accountInfoUrl, {
      method: "GET",
      headers: { "Content-Type": "application/json" },
    });

    const accountText = await accountResponse.text();
    console.log(`[kliento-check-subscription-by-login] accountinfo/all response status: ${accountResponse.status}`);
    console.log(`[kliento-check-subscription-by-login] accountinfo/all raw response: ${accountText}`);

    if (!accountResponse.ok) {
      console.error(`[kliento-check-subscription-by-login] accountinfo/all API error: ${accountResponse.status}`);
      const redirectUrl = await getRedirectUrl(klientoUserId);
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: false,
          redirectUrl,
          error: "Failed to retrieve account information",
        } as CheckSubscriptionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let accountData: KlientoAccountInfoResponse;
    try {
      accountData = JSON.parse(accountText);
    } catch {
      console.error("[kliento-check-subscription-by-login] Failed to parse accountinfo/all response");
      const redirectUrl = await getRedirectUrl(klientoUserId);
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: false,
          redirectUrl,
          error: "Invalid response from authentication service",
        } as CheckSubscriptionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (accountData.code !== 200 || accountData.error !== 0 || !accountData.data || accountData.data.length === 0) {
      console.log("[kliento-check-subscription-by-login] No account data found:", accountData);
      const redirectUrl = projectConfig.lp_redirect_no_account || undefined;
      if (redirectUrl) {
        console.log(`[kliento-check-subscription-by-login] Using lp_redirect_no_account: ${redirectUrl}`);
      }
      return new Response(
        JSON.stringify({
          success: false,
          isSubscribed: false,
          redirectUrl,
          error: "Account information not found",
        } as CheckSubscriptionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const accountInfo = accountData.data[0];
    const realSubscriptionStatus = accountInfo.subscribed === true;
    const isSubscribed = FORCE_UNSUBSCRIBED_TEST ? false : realSubscriptionStatus;
    console.log(`[kliento-check-subscription-by-login] REAL subscription status: ${realSubscriptionStatus}, FORCED to: ${isSubscribed}`);
    const isSuspended = accountInfo.suspended === true;
    const hasValidOffer = Array.isArray(accountInfo.offer) && accountInfo.offer.length > 0;
    const firstOffer = hasValidOffer ? accountInfo.offer![0] : null;

    console.log(`[kliento-check-subscription-by-login] User ${accountInfo.user_id}: subscribed=${isSubscribed}, suspended=${isSuspended}, hasValidOffer=${hasValidOffer}`);
    if (firstOffer) {
      console.log(`[kliento-check-subscription-by-login] First offer - bizoffer_id: ${firstOffer.bizoffer_id}, status: ${firstOffer.status || 'N/A'}`);
    }

    if (!isSubscribed || isSuspended || !hasValidOffer) {
      let errorMessage = "Subscription required";
      if (isSuspended) {
        errorMessage = "Account is suspended";
      } else if (isSubscribed && !hasValidOffer) {
        errorMessage = "No active offer found";
      }

      const redirectUrl = await getRedirectUrl(klientoUserId);
      return new Response(
        JSON.stringify({
          success: true,
          isSubscribed: false,
          redirectUrl,
          error: errorMessage,
        } as CheckSubscriptionResponse),
        {
          status: 200,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const billingInfo = firstOffer ? extractBillingInfo(firstOffer) : undefined;

    const redirectUrl = await getRedirectUrl(klientoUserId);

    return new Response(
      JSON.stringify({
        success: true,
        isSubscribed: true,
        phoneNumber: accountInfo.msisdn || login,
        userId: accountInfo.user_id,
        billingInfo,
        redirectUrl,
      } as CheckSubscriptionResponse),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[kliento-check-subscription-by-login] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: "An unexpected error occurred",
      } as CheckSubscriptionResponse),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});