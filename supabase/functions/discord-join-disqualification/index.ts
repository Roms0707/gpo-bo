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
    const supabaseClient = createClient(
      Deno.env.get("SUPABASE_URL") ?? "",
      Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? ""
    );

    const now = new Date();
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log("[discord-join-disqualification] Starting disqualification check");
    console.log("[discord-join-disqualification] Looking for registrations with discord_join_shown_at before:", twentyFourHoursAgo.toISOString());

    const { data: registrations, error: regError } = await supabaseClient
      .from("tournament_registrations")
      .select(`
        id,
        user_id,
        tournament_id,
        discord_join_shown_at,
        status,
        tournaments (
          id,
          title,
          discord_server_id
        )
      `)
      .not("discord_join_shown_at", "is", null)
      .lte("discord_join_shown_at", twentyFourHoursAgo.toISOString())
      .neq("status", "disqualified");

    if (regError) {
      console.error("[discord-join-disqualification] Error fetching registrations:", regError);
      return new Response(
        JSON.stringify({ success: false, error: regError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!registrations || registrations.length === 0) {
      console.log("[discord-join-disqualification] No registrations to check for disqualification");
      return new Response(
        JSON.stringify({ success: true, message: "No registrations to check", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[discord-join-disqualification] Found ${registrations.length} registrations to check`);

    let disqualified = 0;
    let skipped = 0;
    const errors: string[] = [];

    for (const registration of registrations) {
      try {
        const tournament = registration.tournaments as { id: string; title: string; discord_server_id: string | null };

        if (!tournament?.discord_server_id) {
          console.log(`[discord-join-disqualification] Tournament ${registration.tournament_id} has no Discord server, skipping`);
          skipped++;
          continue;
        }

        const { data: userData } = await supabaseClient
          .from("users")
          .select("discord_user_id")
          .eq("id", registration.user_id)
          .single();

        let isVerified = false;

        if (userData?.discord_user_id) {
          const { data: apiIntegrationData } = await supabaseClient
            .from("platform_api_integrations")
            .select("api_key")
            .eq("api_name", "Discord API")
            .eq("is_active", true)
            .maybeSingle();

          if (apiIntegrationData?.api_key) {
            const apiKey = apiIntegrationData.api_key;
            const parsedApiKey = typeof apiKey === "string" ? JSON.parse(apiKey) : apiKey;
            const botToken = parsedApiKey?.bot_token;

            if (botToken) {
              const discordApiUrl = `https://discord.com/api/v10/guilds/${tournament.discord_server_id}/members/${userData.discord_user_id}`;
              const discordResponse = await fetch(discordApiUrl, {
                method: "GET",
                headers: {
                  Authorization: `Bot ${botToken}`,
                  "Content-Type": "application/json",
                },
              });

              if (discordResponse.ok) {
                isVerified = true;
                console.log(`[discord-join-disqualification] User ${registration.user_id} is verified in Discord server`);

                await supabaseClient
                  .from("tournament_discord_verification")
                  .upsert({
                    user_id: registration.user_id,
                    tournament_id: registration.tournament_id,
                    discord_user_id: userData.discord_user_id,
                    discord_server_id: tournament.discord_server_id,
                    is_verified: true,
                    status: "verified",
                    verified_at: now.toISOString(),
                    last_checked_at: now.toISOString(),
                    updated_at: now.toISOString()
                  }, {
                    onConflict: "user_id,tournament_id"
                  });
              }
            }
          }
        }

        if (isVerified) {
          console.log(`[discord-join-disqualification] User ${registration.user_id} is verified, skipping`);
          skipped++;
          continue;
        }

        const disqualificationReason = "Did not join Discord server within 24 hours";

        const { error: updateError } = await supabaseClient
          .from("tournament_registrations")
          .update({
            status: "disqualified",
            disqualification_reason: disqualificationReason
          })
          .eq("id", registration.id);

        if (updateError) {
          console.error(`[discord-join-disqualification] Error disqualifying registration ${registration.id}:`, updateError);
          errors.push(`Failed to disqualify registration ${registration.id}: ${updateError.message}`);
          continue;
        }

        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: registration.user_id,
            type: "discord_disqualification",
            title: "Tournament Disqualification",
            message: `You have been disqualified from ${tournament.title} for not joining the Discord server within 24 hours.`,
            metadata: {
              tournament_id: registration.tournament_id,
              tournament_title: tournament.title,
              reason: disqualificationReason
            },
            is_read: false
          });

        if (notifError) {
          console.error(`[discord-join-disqualification] Error creating notification for user ${registration.user_id}:`, notifError);
        }

        disqualified++;
        console.log(`[discord-join-disqualification] Disqualified user ${registration.user_id} from tournament ${registration.tournament_id}`);

      } catch (err) {
        console.error(`[discord-join-disqualification] Error processing registration ${registration.id}:`, err);
        errors.push(`Error processing registration ${registration.id}: ${(err as Error).message}`);
      }
    }

    console.log(`[discord-join-disqualification] Completed. Disqualified: ${disqualified}, Skipped: ${skipped}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: registrations.length,
        disqualified,
        skipped,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[discord-join-disqualification] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});
