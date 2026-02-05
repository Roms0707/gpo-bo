import { serve } from "https://deno.land/std@0.177.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2";
// ==================================
// Init Supabase client
// ==================================
const supabaseUrl = Deno.env.get("SUPABASE_URL") ?? "";
const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY") ?? "";
const supabase = createClient(supabaseUrl, supabaseServiceKey);
// ==================================
// Helpers
// ==================================
// Récup config ABIOS depuis ta table
async function getAbiosConfig() {
  const { data, error } = await supabase.from("platform_api_integrations").select("api_url, api_key").eq("api_name", "abios").eq("is_active", true).limit(1).maybeSingle();
  if (error || !data) {
    throw new Error("❌ Impossible de récupérer les credentials ABIOS : " + (error?.message || "no data"));
  }
  return data;
}
// Fetch générique avec clé API
async function abiosFetch(base_url, api_key, path) {
  const url = `${base_url}${path}${path.includes("?") ? "&" : "?"}secret=${api_key}`;
  console.log(`➡️ Fetching: ${url}`);
  const res = await fetch(url);
  if (!res.ok) throw new Error(`ABIOS error ${res.status} on ${url}`);
  return res.json();
}
// Upsert générique
async function upsert(table, rows) {
  if (!rows || rows.length === 0) return;
  const { error } = await supabase.from(table).upsert(rows, {
    onConflict: "id"
  });
  if (error) {
    console.error(`❌ Error upserting into ${table}`, error);
    throw error;
  }
  console.log(`✅ Upserted ${rows.length} rows into ${table}`);
}
// ==================================
// Main Sync Function
// ==================================
serve(async ()=>{
  try {
    console.log("🚀 Starting ABIOS sync...");
    // 1. Charger config depuis Supabase
    const { api_url, api_key } = await getAbiosConfig();
    // 2. Jeux
    const games = await abiosFetch(api_url, api_key, "/game?all=true");
    await upsert("pro_games", games.map((g)=>({
        id: g.id,
        name: g.name,
        raw_data: g,
        updated_at: new Date().toISOString()
      })));
    // 3. Pour chaque jeu → tournois + équipes
    for (const game of games){
      const gameId = game.id;
      // Tournois
      const tournaments = await abiosFetch(api_url, api_key, `/game/${gameId}/tournament?status=STARTED&order=tournament_start&order_dir=asc`);
      await upsert("pro_tournaments", tournaments.map((t)=>({
          id: t.id,
          game_id: gameId,
          name: t.name,
          start_date: t.start_date ? new Date(t.start_date).toISOString() : null,
          end_date: t.end_date ? new Date(t.end_date).toISOString() : null,
          status: t.status,
          raw_data: t,
          updated_at: new Date().toISOString()
        })));
      // Équipes
      const teams = await abiosFetch(api_url, api_key, `/game/${gameId}/team?order=team_name&order_dir=asc`);
      await upsert("pro_teams", teams.map((team)=>({
          id: team.id,
          game_id: gameId,
          name: team.name,
          region: team.region || null,
          raw_data: team,
          updated_at: new Date().toISOString()
        })));
    }
    console.log("✅ ABIOS sync finished successfully!");
    return new Response(JSON.stringify({
      success: true
    }), {
      status: 200
    });
  } catch (e) {
    console.error("❌ Sync failed", e);
    return new Response(JSON.stringify({
      error: e.message
    }), {
      status: 500
    });
  }
});
