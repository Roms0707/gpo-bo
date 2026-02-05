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
    const twentyHoursAgo = new Date(now.getTime() - 20 * 60 * 60 * 1000);
    const twentyFourHoursAgo = new Date(now.getTime() - 24 * 60 * 60 * 1000);

    console.log("[discord-join-warning] Starting warning check");
    console.log("[discord-join-warning] Looking for registrations with discord_join_shown_at before:", twentyHoursAgo.toISOString());

    const { data: registrations, error: regError } = await supabaseClient
      .from("tournament_registrations")
      .select(`
        id,
        user_id,
        tournament_id,
        discord_join_shown_at,
        discord_warning_sent_at,
        status,
        tournaments (
          id,
          title,
          discord_server_id
        )
      `)
      .not("discord_join_shown_at", "is", null)
      .is("discord_warning_sent_at", null)
      .lte("discord_join_shown_at", twentyHoursAgo.toISOString())
      .gt("discord_join_shown_at", twentyFourHoursAgo.toISOString())
      .neq("status", "disqualified");

    if (regError) {
      console.error("[discord-join-warning] Error fetching registrations:", regError);
      return new Response(
        JSON.stringify({ success: false, error: regError.message }),
        { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    if (!registrations || registrations.length === 0) {
      console.log("[discord-join-warning] No registrations need warning");
      return new Response(
        JSON.stringify({ success: true, message: "No registrations need warning", processed: 0 }),
        { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
      );
    }

    console.log(`[discord-join-warning] Found ${registrations.length} registrations to check`);

    let warningsSent = 0;
    const errors: string[] = [];

    for (const registration of registrations) {
      try {
        const tournament = registration.tournaments as { id: string; title: string; discord_server_id: string | null };
        
        if (!tournament?.discord_server_id) {
          console.log(`[discord-join-warning] Tournament ${registration.tournament_id} has no Discord server, skipping`);
          continue;
        }

        const { data: userData } = await supabaseClient
          .from("users")
          .select("discord_user_id")
          .eq("id", registration.user_id)
          .single();

        if (!userData?.discord_user_id) {
          console.log(`[discord-join-warning] User ${registration.user_id} has no Discord ID, sending warning`);
        } else {
          const { data: verification } = await supabaseClient
            .from("tournament_discord_verification")
            .select("is_verified")
            .eq("user_id", registration.user_id)
            .eq("tournament_id", registration.tournament_id)
            .maybeSingle();

          if (verification?.is_verified) {
            console.log(`[discord-join-warning] User ${registration.user_id} already verified for tournament ${registration.tournament_id}, skipping`);
            continue;
          }
        }

        const deadlineAt = new Date(new Date(registration.discord_join_shown_at).getTime() + 24 * 60 * 60 * 1000);
        const hoursRemaining = Math.max(0, Math.floor((deadlineAt.getTime() - now.getTime()) / (1000 * 60 * 60)));

        const { error: notifError } = await supabaseClient
          .from("notifications")
          .insert({
            user_id: registration.user_id,
            type: "discord_join_warning",
            title: "Discord Server Warning",
            message: `You have ${hoursRemaining} hours left to join the Discord server for ${tournament.title} or you will be disqualified.`,
            metadata: {
              tournament_id: registration.tournament_id,
              tournament_title: tournament.title,
              deadline_at: deadlineAt.toISOString(),
              hours_remaining: hoursRemaining
            },
            is_read: false
          });

        if (notifError) {
          console.error(`[discord-join-warning] Error creating notification for user ${registration.user_id}:`, notifError);
          errors.push(`Failed to create notification for user ${registration.user_id}: ${notifError.message}`);
          continue;
        }

        const { error: updateError } = await supabaseClient
          .from("tournament_registrations")
          .update({ discord_warning_sent_at: now.toISOString() })
          .eq("id", registration.id);

        if (updateError) {
          console.error(`[discord-join-warning] Error updating registration ${registration.id}:`, updateError);
          errors.push(`Failed to update registration ${registration.id}: ${updateError.message}`);
          continue;
        }

        warningsSent++;
        console.log(`[discord-join-warning] Warning sent for user ${registration.user_id} in tournament ${registration.tournament_id}`);

      } catch (err) {
        console.error(`[discord-join-warning] Error processing registration ${registration.id}:`, err);
        errors.push(`Error processing registration ${registration.id}: ${(err as Error).message}`);
      }
    }

    console.log(`[discord-join-warning] Completed. Warnings sent: ${warningsSent}, Errors: ${errors.length}`);

    return new Response(
      JSON.stringify({
        success: true,
        processed: registrations.length,
        warnings_sent: warningsSent,
        errors: errors.length > 0 ? errors : undefined
      }),
      { status: 200, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );

  } catch (error) {
    console.error("[discord-join-warning] Unexpected error:", error);
    return new Response(
      JSON.stringify({ success: false, error: (error as Error).message }),
      { status: 500, headers: { ...corsHeaders, "Content-Type": "application/json" } }
    );
  }
});