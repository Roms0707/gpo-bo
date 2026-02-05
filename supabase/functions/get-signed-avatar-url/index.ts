import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "jsr:@supabase/supabase-js@2";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
serve(async (req)=>{
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  // Initialize Supabase client with service role for storage access
  const supabase = createClient(Deno.env.get("SUPABASE_URL"), Deno.env.get("SUPABASE_SERVICE_ROLE_KEY"));
  try {
    const { avatarPath, expiresIn = 3600 } = await req.json();
    console.log(`[Signed Avatar URL] Request for avatar: ${avatarPath}, expires in: ${expiresIn}s`);
    // Validate input
    if (!avatarPath) {
      return new Response(JSON.stringify({
        success: false,
        error: "Avatar path is required"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Validate that the path is for the avatars bucket
    if (!avatarPath.startsWith('avatars/')) {
      return new Response(JSON.stringify({
        success: false,
        error: "Invalid avatar path"
      }), {
        status: 400,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    // Optional: Add authorization logic here
    // For example, check if the requesting user has permission to view this avatar
    // You could extract user_id from the path and compare with auth.uid()
    // Get the current user from the request (if authenticated)
    const authHeader = req.headers.get('Authorization');
    let currentUser = null;
    if (authHeader) {
      try {
        const { data: { user }, error: authError } = await supabase.auth.getUser(authHeader.replace('Bearer ', ''));
        if (!authError && user) {
          currentUser = user;
        }
      } catch (error) {
        console.warn("[Signed Avatar URL] Error getting user from auth header:", error);
      }
    }
    // For avatars, we'll allow access to all authenticated users
    // You can add more restrictive logic here if needed
    console.log(`[Signed Avatar URL] Current user: ${currentUser?.id || 'anonymous'}`);
    // Generate signed URL
    const { data, error } = await supabase.storage.from('avatars').createSignedUrl(avatarPath.replace('avatars/', ''), expiresIn);
    if (error) {
      console.error("[Signed Avatar URL] Error creating signed URL:", error);
      return new Response(JSON.stringify({
        success: false,
        error: "Failed to create signed URL"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    if (!data?.signedUrl) {
      return new Response(JSON.stringify({
        success: false,
        error: "No signed URL returned"
      }), {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders
        }
      });
    }
    console.log(`[Signed Avatar URL] Successfully created signed URL for: ${avatarPath}`);
    return new Response(JSON.stringify({
      success: true,
      signedUrl: data.signedUrl
    }), {
      status: 200,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  } catch (error) {
    console.error("[Signed Avatar URL] Error in get-signed-avatar-url function:", error);
    return new Response(JSON.stringify({
      success: false,
      error: "Internal server error"
    }), {
      status: 500,
      headers: {
        "Content-Type": "application/json",
        ...corsHeaders
      }
    });
  }
});
