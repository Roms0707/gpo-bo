import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GeoIPResponse {
  country?: string;
  country_code?: string;
  ip?: string;
  success?: boolean;
  error?: string;
  is_whitelisted?: boolean;
}

// Helper function to check if a country is whitelisted
async function isCountryWhitelisted(countryCode: string, supabase: any): Promise<boolean> {
  try {
    console.log(`[GeoIP] Checking if country ${countryCode} is whitelisted...`);

    const { data, error } = await supabase
      .from('country_whitelist')
      .select('is_active')
      .eq('country_code', countryCode)
      .eq('is_active', true)
      .maybeSingle();

    if (error) {
      console.warn(`[GeoIP] Error checking whitelist:`, error);
      return false;
    }

    const isWhitelisted = !!data;
    console.log(`[GeoIP] Country ${countryCode} whitelist status: ${isWhitelisted}`);
    return isWhitelisted;
  } catch (error) {
    console.error(`[GeoIP] Exception checking whitelist:`, error);
    return false;
  }
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  const supabaseUrl = Deno.env.get("SUPABASE_URL");
  const supabaseKey = Deno.env.get("SUPABASE_ANON_KEY");

  if (!supabaseUrl || !supabaseKey) {
    console.error("[GeoIP] Missing Supabase environment variables");
    return new Response(
      JSON.stringify({ success: false, error: "Server configuration error" }),
      { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
    );
  }

  const supabase = createClient(supabaseUrl, supabaseKey, {
    auth: {
      autoRefreshToken: false,
      persistSession: false
    }
  });

  try {
    // Get client IP from request headers
    let clientIP = req.headers.get("x-forwarded-for") ||
                   req.headers.get("x-real-ip") ||
                   req.headers.get("cf-connecting-ip") ||
                   "";

    // Handle comma-separated IPs (x-forwarded-for can contain multiple IPs)
    if (clientIP.includes(",")) {
      clientIP = clientIP.split(",")[0].trim();
    }

    console.log(`[GeoIP] Processing request for IP: ${clientIP}`);

    // For development/testing, use France as default for localhost/private IPs
    if (!clientIP || clientIP === "127.0.0.1" || clientIP.startsWith("192.168.") || clientIP.startsWith("10.")) {
      console.log("[GeoIP] Using fallback for localhost/private IP - defaulting to France (whitelisted)");
      return new Response(
        JSON.stringify({
          success: true,
          country: "France",
          country_code: "FR",
          ip: clientIP || "localhost",
          is_whitelisted: true
        }),
        {
          headers: {
            ...corsHeaders,
            "Content-Type": "application/json",
          },
        }
      );
    }

    // Try multiple GeoIP services in order of preference
    const geoipServices = [
      {
        name: "ipapi.co",
        url: `https://ipapi.co/${clientIP}/json/`,
        parseResponse: (data: any) => ({
          country: data.country_name || "Unknown",
          country_code: data.country_code || data.country || "XX"
        })
      },
      {
        name: "ip-api.com",
        url: `http://ip-api.com/json/${clientIP}?fields=status,country,countryCode`,
        parseResponse: (data: any) => ({
          country: data.country || "Unknown",
          country_code: data.countryCode || "XX"
        })
      },
      {
        name: "ipinfo.io",
        url: `https://ipinfo.io/${clientIP}/json`,
        parseResponse: (data: any) => ({
          country: data.country_name || "Unknown",
          country_code: data.country || "XX"
        })
      }
    ];

    let lastError = null;

    // Try each service until one works
    for (const service of geoipServices) {
      try {
        console.log(`[GeoIP] Trying ${service.name} for IP: ${clientIP}`);

        const geoResponse = await fetch(service.url, {
          headers: {
            'User-Agent': 'Mozilla/5.0 (compatible; EsportZone/1.0)',
            'Accept': 'application/json'
          }
        });

        if (!geoResponse.ok) {
          console.warn(`[GeoIP] ${service.name} returned status: ${geoResponse.status}`);
          lastError = `${service.name} returned status ${geoResponse.status}`;
          continue;
        }

        const geoData = await geoResponse.json();
        console.log(`[GeoIP] ${service.name} response:`, JSON.stringify(geoData));

        // Handle potential error responses
        if (geoData.error || geoData.status === 'fail') {
          console.warn(`[GeoIP] ${service.name} returned error:`, geoData.error || geoData.message);
          lastError = geoData.error || geoData.message || `${service.name} returned error`;
          continue;
        }

        // Parse the response using the service-specific parser
        const parsedData = service.parseResponse(geoData);

        // Validate that we got useful data
        if (!parsedData.country_code || parsedData.country_code === "XX") {
          console.warn(`[GeoIP] ${service.name} returned invalid country code`);
          lastError = `${service.name} returned invalid country code`;
          continue;
        }

        console.log(`[GeoIP] Successfully got location from ${service.name}:`, parsedData);

        // Check if the detected country is whitelisted
        const isWhitelisted = await isCountryWhitelisted(parsedData.country_code, supabase);

        const response: GeoIPResponse = {
          success: true,
          country: parsedData.country,
          country_code: parsedData.country_code,
          ip: clientIP,
          is_whitelisted: isWhitelisted
        };

        console.log(`[GeoIP] Final response:`, response);

        return new Response(
          JSON.stringify(response),
          {
            headers: {
              ...corsHeaders,
              "Content-Type": "application/json",
            },
          }
        );

      } catch (error) {
        console.warn(`[GeoIP] Error with ${service.name}:`, error.message);
        lastError = `${service.name}: ${error.message}`;
        continue;
      }
    }

    // If all services failed, return fallback
    console.warn(`[GeoIP] All services failed, using fallback. Last error: ${lastError}`);

    // Check if fallback country is whitelisted
    const isFallbackWhitelisted = await isCountryWhitelisted("TN", supabase);

    return new Response(
      JSON.stringify({
        success: true,
        country: "Tunisia",
        country_code: "TN",
        ip: clientIP,
        is_whitelisted: isFallbackWhitelisted,
        fallback: true,
        last_error: lastError
      }),
      {
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );

  } catch (error) {
    console.error("[GeoIP] Unexpected error:", error);

    // Return a fallback response with error info
    const errorResponse: GeoIPResponse = {
      success: false,
      error: error.message || "Unknown error occurred",
      country: "Tunisia",
      country_code: "TN"
    };

    return new Response(
      JSON.stringify(errorResponse),
      {
        status: 500,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json",
        },
      }
    );
  }
});
