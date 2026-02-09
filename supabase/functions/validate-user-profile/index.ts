import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

interface UserProfileRequest {
  user_id: string;
  username?: string;
  bio?: string;
  discord_handle?: string;
  twitter_handle?: string;
  country?: string;
  msisdn?: string;
}

interface ValidationResponse {
  success: boolean;
  error?: string;
  details?: any;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, apikey, x-client-info",
};

// Offensive words list (basic example - in production, use a more comprehensive list)
const OFFENSIVE_WORDS = [
  'spam', 'scam', 'hack', 'cheat', 'bot', 'fake',
  // Add more words as needed
];

// Helper function to check for offensive content
const containsOffensiveContent = (text: string): boolean => {
  const lowerText = text.toLowerCase();
  return OFFENSIVE_WORDS.some(word => lowerText.includes(word));
};

// Helper function to validate username format
const validateUsername = (username: string): { valid: boolean; error?: string } => {
  // Check length
  if (username.length < 3) {
    return { valid: false, error: "Username must be at least 3 characters long" };
  }

  if (username.length > 20) {
    return { valid: false, error: "Username must be no more than 20 characters long" };
  }

  // Check format (alphanumeric, underscores, hyphens only)
  const usernameRegex = /^[a-zA-Z0-9_-]+$/;
  if (!usernameRegex.test(username)) {
    return { valid: false, error: "Username can only contain letters, numbers, underscores, and hyphens" };
  }

  // Check for offensive content
  if (containsOffensiveContent(username)) {
    return { valid: false, error: "Username contains inappropriate content" };
  }

  return { valid: true };
};

// Helper function to validate bio
const validateBio = (bio: string): { valid: boolean; error?: string } => {
  // Check length
  if (bio.length > 500) {
    return { valid: false, error: "Bio must be no more than 500 characters long" };
  }

  // Check for offensive content
  if (containsOffensiveContent(bio)) {
    return { valid: false, error: "Bio contains inappropriate content" };
  }

  return { valid: true };
};

// Helper function to validate Discord handle
const validateDiscordHandle = (handle: string): { valid: boolean; error?: string } => {
  // Check length
  if (handle.length > 37) { // Discord username max length is 32, plus #1234 = 37
    return { valid: false, error: "Discord handle is too long" };
  }

  // Check format - can be either "username#1234" or just "username" (new Discord format)
  const discordRegex = /^[a-zA-Z0-9._-]+(?:#[0-9]{4})?$/;
  if (!discordRegex.test(handle)) {
    return { valid: false, error: "Invalid Discord handle format. Use 'username' or 'username#1234'" };
  }

  // Check for offensive content
  if (containsOffensiveContent(handle)) {
    return { valid: false, error: "Discord handle contains inappropriate content" };
  }

  return { valid: true };
};

// Helper function to validate Twitter/Twitch handle
const validateTwitterHandle = (handle: string): { valid: boolean; error?: string } => {
  // Remove @ if present
  const cleanHandle = handle.startsWith('@') ? handle.slice(1) : handle;

  // Check length
  if (cleanHandle.length < 1) {
    return { valid: false, error: "Twitter/Twitch handle cannot be empty" };
  }

  if (cleanHandle.length > 15) { // Twitter username max length
    return { valid: false, error: "Twitter/Twitch handle must be no more than 15 characters long" };
  }

  // Check format (alphanumeric and underscores only)
  const twitterRegex = /^[a-zA-Z0-9_]+$/;
  if (!twitterRegex.test(cleanHandle)) {
    return { valid: false, error: "Twitter/Twitch handle can only contain letters, numbers, and underscores" };
  }

  // Check for offensive content
  if (containsOffensiveContent(cleanHandle)) {
    return { valid: false, error: "Twitter/Twitch handle contains inappropriate content" };
  }

  return { valid: true };
};

// Helper function to validate phone number (MSISDN)
const validatePhoneNumber = (phone: string): { valid: boolean; error?: string } => {
  // Remove all non-digit characters except +
  const cleanPhone = phone.replace(/[^\d+]/g, '');

  // Check if it starts with + (international format)
  if (!cleanPhone.startsWith('+')) {
    return { valid: false, error: "Phone number must be in international format (starting with +)" };
  }

  // Check length (international phone numbers are typically 7-15 digits after country code)
  const digitsOnly = cleanPhone.substring(1); // Remove the +
  if (digitsOnly.length < 7 || digitsOnly.length > 15) {
    return { valid: false, error: "Phone number must be between 7 and 15 digits" };
  }

  // Check if all characters after + are digits
  if (!/^\d+$/.test(digitsOnly)) {
    return { valid: false, error: "Phone number can only contain digits after the country code" };
  }

  return { valid: true };
};

// Helper function to validate country code
const validateCountryCode = (countryCode: string): { valid: boolean; error?: string } => {
  // Check if it's a valid 2-letter country code format
  if (!/^[A-Z]{2}$/.test(countryCode)) {
    return { valid: false, error: "Country code must be a valid 2-letter ISO code" };
  }

  // List of valid country codes from your countries.ts file
  const validCountryCodes = [
    'BF', 'BJ', 'BW', 'CD', 'CF', 'CI', 'CM', 'EG', 'GA', 'GH',
    'GN', 'GW', 'JO', 'LR', 'MA', 'MG', 'ML', 'SL', 'SN', 'TG', 'TN'
  ];

  if (!validCountryCodes.includes(countryCode)) {
    return { valid: false, error: "Invalid country code" };
  }

  return { valid: true };
};

serve(async (req) => {
  console.log("[User Profile Validation] Function started");

  // Handle CORS
  if (req.method === "OPTIONS") {
    console.log("[User Profile Validation] CORS preflight request");
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  console.log("[User Profile Validation] Initializing Supabase client");
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL") ?? "",
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
  );

  try {
    console.log("[User Profile Validation] Parsing request body");
    const requestBody = await req.json() as UserProfileRequest;
    console.log("[User Profile Validation] Request body parsed:", JSON.stringify(requestBody, null, 2));

    const { user_id, username, bio, discord_handle, twitter_handle, country, msisdn } = requestBody;
    console.log("[User Profile Validation] Extracted fields:", {
      user_id,
      username: username ? `"${username}"` : undefined,
      bio: bio ? `"${bio.substring(0, 50)}..."` : undefined,
      discord_handle: discord_handle ? `"${discord_handle}"` : undefined,
      twitter_handle: twitter_handle ? `"${twitter_handle}"` : undefined,
      country: country ? `"${country}"` : undefined,
      msisdn: msisdn ? `"${msisdn}"` : undefined
    });

    // Validate input
    if (!user_id) {
      console.error("[User Profile Validation] Missing user_id in request");
      return new Response(
        JSON.stringify({ success: false, error: "User ID is required" }),
        { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 1. Verify user exists
    console.log("[User Profile Validation] Verifying user exists for ID:", user_id);
    const { data: user, error: userError } = await supabase
      .from('users')
      .select('id, username')
      .eq('id', user_id)
      .single();

    console.log("[User Profile Validation] User query result:", { user, userError });

    if (userError || !user) {
      console.error("[User Profile Validation] User not found:", userError?.message);
      return new Response(
        JSON.stringify({ success: false, error: "User not found" }),
        { status: 404, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[User Profile Validation] User found:", user.username);

    // 2. Validate username if provided
    if (username !== undefined && username !== null) {
      console.log("[User Profile Validation] Validating username:", username);
      const trimmedUsername = username.trim();

      if (trimmedUsername === '') {
        console.error("[User Profile Validation] Empty username provided");
        return new Response(
          JSON.stringify({ success: false, error: "Username cannot be empty" }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      console.log("[User Profile Validation] Calling validateUsername for:", trimmedUsername);
      const usernameValidation = validateUsername(trimmedUsername);
      console.log("[User Profile Validation] Username validation result:", usernameValidation);
      if (!usernameValidation.valid) {
        console.error("[User Profile Validation] Username validation failed:", usernameValidation.error);
        return new Response(
          JSON.stringify({ success: false, error: usernameValidation.error }),
          { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }

      // Check if username is already taken by another user
      if (trimmedUsername !== user.username) {
        console.log("[User Profile Validation] Checking username availability for:", trimmedUsername);
        const { data: existingUser, error: existingUserError } = await supabase
          .from('users')
          .select('id')
          .eq('username', trimmedUsername)
          .neq('id', user_id)
          .maybeSingle();

        console.log("[User Profile Validation] Username availability check result:", { existingUser, existingUserError });

        if (existingUserError) {
          console.error("[User Profile Validation] Error checking username availability:", existingUserError.message);
          return new Response(
            JSON.stringify({ success: false, error: "Error checking username availability" }),
            { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }

        if (existingUser) {
          console.error("[User Profile Validation] Username already taken:", trimmedUsername);
          return new Response(
            JSON.stringify({ success: false, error: "Username is already taken" }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      console.log("[User Profile Validation] Username validation passed");
    }

    // 3. Validate bio if provided
    if (bio !== undefined && bio !== null) {
      console.log("[User Profile Validation] Validating bio, length:", bio.length);
      const trimmedBio = bio.trim();

      if (trimmedBio.length > 0) {
        console.log("[User Profile Validation] Calling validateBio");
        const bioValidation = validateBio(trimmedBio);
        console.log("[User Profile Validation] Bio validation result:", bioValidation);
        if (!bioValidation.valid) {
          console.error("[User Profile Validation] Bio validation failed:", bioValidation.error);
          return new Response(
            JSON.stringify({ success: false, error: bioValidation.error }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      console.log("[User Profile Validation] Bio validation passed");
    }

    // 4. Validate Discord handle if provided
    if (discord_handle !== undefined && discord_handle !== null) {
      console.log("[User Profile Validation] Validating Discord handle:", discord_handle);
      const trimmedDiscordHandle = discord_handle.trim();

      if (trimmedDiscordHandle.length > 0) {
        console.log("[User Profile Validation] Calling validateDiscordHandle");
        const discordValidation = validateDiscordHandle(trimmedDiscordHandle);
        console.log("[User Profile Validation] Discord validation result:", discordValidation);
        if (!discordValidation.valid) {
          console.error("[User Profile Validation] Discord validation failed:", discordValidation.error);
          return new Response(
            JSON.stringify({ success: false, error: discordValidation.error }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      console.log("[User Profile Validation] Discord handle validation passed");
    }

    // 5. Validate Twitter/Twitch handle if provided
    if (twitter_handle !== undefined && twitter_handle !== null) {
      console.log("[User Profile Validation] Validating Twitter handle:", twitter_handle);
      const trimmedTwitterHandle = twitter_handle.trim();

      if (trimmedTwitterHandle.length > 0) {
        console.log("[User Profile Validation] Calling validateTwitterHandle");
        const twitterValidation = validateTwitterHandle(trimmedTwitterHandle);
        console.log("[User Profile Validation] Twitter validation result:", twitterValidation);
        if (!twitterValidation.valid) {
          console.error("[User Profile Validation] Twitter validation failed:", twitterValidation.error);
          return new Response(
            JSON.stringify({ success: false, error: twitterValidation.error }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      console.log("[User Profile Validation] Twitter handle validation passed");
    }

    // 6. Prevent country modification - country is set via GeoIP and cannot be changed
    if (country !== undefined && country !== null) {
      console.log("[User Profile Validation] Country modification attempted - this is not allowed");
      console.error("[User Profile Validation] User attempted to modify country, which is forbidden");
      return new Response(
        JSON.stringify({
          success: false,
          error: "Country cannot be modified. It is set automatically via GeoIP during registration and cannot be changed."
        }),
        { status: 403, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    // 7. Validate phone number if provided
    if (msisdn !== undefined && msisdn !== null) {
      console.log("[User Profile Validation] Validating phone number:", msisdn);
      const trimmedPhone = msisdn.trim();

      if (trimmedPhone.length > 0) {
        console.log("[User Profile Validation] Calling validatePhoneNumber");
        const phoneValidation = validatePhoneNumber(trimmedPhone);
        console.log("[User Profile Validation] Phone validation result:", phoneValidation);
        if (!phoneValidation.valid) {
          console.error("[User Profile Validation] Phone validation failed:", phoneValidation.error);
          return new Response(
            JSON.stringify({ success: false, error: phoneValidation.error }),
            { status: 400, headers: { "Content-Type": "application/json", ...corsHeaders } }
          );
        }
      }

      console.log("[User Profile Validation] Phone number validation passed");
    }

    // All validations passed
    console.log("[User Profile Validation] All validations passed successfully");
    return new Response(
      JSON.stringify({
        success: true,
        details: {
          user_id: user_id,
          validations_passed: {
            username: username !== undefined,
            bio: bio !== undefined,
            discord_handle: discord_handle !== undefined,
            twitter_handle: twitter_handle !== undefined,
            country: country !== undefined,
            msisdn: msisdn !== undefined
          }
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[User Profile Validation] Uncaught error in function:", error);
    console.error("[User Profile Validation] Error message:", error.message);
    console.error("[User Profile Validation] Error stack:", error.stack);
    console.error("[User Profile Validation] Error name:", error.name);

    return new Response(
      JSON.stringify({ success: false, error: "Internal server error during validation" }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});
