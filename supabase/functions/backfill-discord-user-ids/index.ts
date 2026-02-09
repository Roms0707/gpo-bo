import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.38.4";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseAdmin = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "",
      {
        auth: {
          autoRefreshToken: false,
          persistSession: false,
        },
      }
    );

    console.log("[backfill-discord-user-ids] Starting backfill process...");

    const { data: authUsers, error: authError } = await supabaseAdmin.auth.admin.listUsers({
      perPage: 1000,
    });

    if (authError) {
      console.error("[backfill-discord-user-ids] Error fetching auth users:", authError);
      return new Response(
        JSON.stringify({ success: false, error: authError.message }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[backfill-discord-user-ids] Found ${authUsers.users.length} auth users`);

    let processed = 0;
    let updated = 0;
    let skipped = 0;
    let errors = 0;
    const errorDetails: Array<{ userId: string; error: string }> = [];

    for (const authUser of authUsers.users) {
      processed++;

      const discordIdentity = authUser.identities?.find(
        (identity) => identity.provider === "discord"
      );

      if (!discordIdentity) {
        skipped++;
        continue;
      }

      const discordUserId = discordIdentity.identity_data?.provider_id || discordIdentity.id;

      if (!discordUserId) {
        console.log(`[backfill-discord-user-ids] User ${authUser.id} has Discord identity but no user ID`);
        skipped++;
        continue;
      }

      const { data: existingUser, error: fetchError } = await supabaseAdmin
        .from("users")
        .select("id, discord_user_id")
        .eq("id", authUser.id)
        .maybeSingle();

      if (fetchError) {
        console.error(`[backfill-discord-user-ids] Error fetching user ${authUser.id}:`, fetchError);
        errors++;
        errorDetails.push({ userId: authUser.id, error: fetchError.message });
        continue;
      }

      if (!existingUser) {
        console.log(`[backfill-discord-user-ids] User ${authUser.id} not found in public.users table`);
        skipped++;
        continue;
      }

      if (existingUser.discord_user_id === discordUserId) {
        skipped++;
        continue;
      }

      const { error: updateError } = await supabaseAdmin
        .from("users")
        .update({ discord_user_id: discordUserId })
        .eq("id", authUser.id);

      if (updateError) {
        console.error(`[backfill-discord-user-ids] Error updating user ${authUser.id}:`, updateError);
        errors++;
        errorDetails.push({ userId: authUser.id, error: updateError.message });
        continue;
      }

      console.log(`[backfill-discord-user-ids] Updated user ${authUser.id} with Discord ID ${discordUserId}`);
      updated++;
    }

    const summary = {
      success: true,
      processed,
      updated,
      skipped,
      errors,
      errorDetails: errors > 0 ? errorDetails : undefined,
    };

    console.log("[backfill-discord-user-ids] Backfill complete:", summary);

    return new Response(JSON.stringify(summary), {
      status: 200,
      headers: { ...corsHeaders, "Content-Type": "application/json" },
    });
  } catch (error) {
    console.error("[backfill-discord-user-ids] Unexpected error:", error);
    return new Response(
      JSON.stringify({
        success: false,
        error: (error as Error).message || "An unexpected error occurred",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
