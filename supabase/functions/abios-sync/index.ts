import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from 'https://esm.sh/@supabase/supabase-js@2';
const corsHeaders = {
  'Access-Control-Allow-Origin': '*',
  'Access-Control-Allow-Headers': 'authorization, x-client-info, apikey, content-type'
};
serve(async (req)=>{
  try {
    if (req.method === 'OPTIONS') {
      return new Response('ok', {
        headers: corsHeaders
      });
    }
    const supabase = createClient(Deno.env.get('SUPABASE_URL') ?? '', Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') ?? '');
    console.log('Starting ABIOS sync...');
    // Get ABIOS configuration
    const { data: config, error: configError } = await supabase.from('platform_api_integrations').select('api_url, api_key').eq('api_name', 'abios').eq('is_active', true).single();
    if (configError || !config) {
      throw new Error('ABIOS configuration not found or inactive');
    }
    const { api_url, api_key } = config;
    // Sync games
    await syncGames(api_url, api_key, supabase);
    // Sync series (tournaments)
    await syncSeries(api_url, api_key, supabase);
    // Sync teams
    await syncTeams(api_url, api_key, supabase);
    // Sync matches
    await syncMatches(api_url, api_key, supabase);
    console.log('ABIOS sync completed successfully');
    return new Response(JSON.stringify({
      success: true,
      message: 'Sync completed'
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('ABIOS sync error:', error);
    return new Response(JSON.stringify({
      success: false,
      error: error.message
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 500
    });
  }
});
async function syncGames(apiUrl, apiKey, supabase) {
  console.log('Syncing games...');
  const response = await fetch(`${apiUrl}/games`, {
    headers: {
      'Abios-Secret': apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch games: ${response.status}`);
  }
  const games = await response.json();
  for (const game of games){
    await supabase.from('pro_games').upsert({
      abios_id: game.id,
      name: game.title,
      slug: game.slug,
      image_url: game.images?.square || game.images?.default,
      updated_at: new Date().toISOString()
    }).onConflict('abios_id');
  }
  console.log(`Synced ${games.length} games`);
}
async function syncSeries(apiUrl, apiKey, supabase) {
  console.log('Syncing series (tournaments)...');
  const response = await fetch(`${apiUrl}/series?per_page=100`, {
    headers: {
      'Abios-Secret': apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch series: ${response.status}`);
  }
  const series = await response.json();
  for (const serie of series){
    // Get game_id from our database
    const { data: game } = await supabase.from('pro_games').select('id').eq('abios_id', serie.game?.id).single();
    await supabase.from('pro_tournaments').upsert({
      abios_id: serie.id,
      name: serie.title,
      slug: serie.slug,
      game_id: game?.id,
      start_date: serie.start ? new Date(serie.start).toISOString() : null,
      end_date: serie.end ? new Date(serie.end).toISOString() : null,
      prize_pool: serie.prizepool?.amount,
      currency: serie.prizepool?.currency,
      region: serie.region,
      tier: serie.tier?.toString(),
      status: serie.deleted_at ? 'finished' : 'ongoing',
      logo_url: serie.images?.square || serie.images?.default,
      updated_at: new Date().toISOString()
    }).onConflict('abios_id');
    // Sync stages and substages
    if (serie.stages) {
      for (const stage of serie.stages){
        const { data: stageData } = await supabase.from('pro_stages').upsert({
          abios_id: stage.id,
          tournament_id: (await supabase.from('pro_tournaments').select('id').eq('abios_id', serie.id).single()).data?.id,
          name: stage.title,
          order_index: stage.order,
          updated_at: new Date().toISOString()
        }).onConflict('abios_id').select().single();
        if (stage.substages) {
          for (const substage of stage.substages){
            await supabase.from('pro_substages').upsert({
              abios_id: substage.id,
              stage_id: stageData?.id,
              name: substage.title,
              order_index: substage.order,
              updated_at: new Date().toISOString()
            }).onConflict('abios_id');
          }
        }
      }
    }
  }
  console.log(`Synced ${series.length} series`);
}
async function syncTeams(apiUrl, apiKey, supabase) {
  console.log('Syncing teams...');
  const response = await fetch(`${apiUrl}/teams?per_page=100`, {
    headers: {
      'Abios-Secret': apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch teams: ${response.status}`);
  }
  const teams = await response.json();
  for (const team of teams){
    await supabase.from('pro_teams').upsert({
      abios_id: team.id,
      name: team.name,
      short_name: team.abbreviation,
      slug: team.slug,
      logo_url: team.images?.square || team.images?.default,
      country: team.country,
      region: team.region,
      updated_at: new Date().toISOString()
    }).onConflict('abios_id');
  }
  console.log(`Synced ${teams.length} teams`);
}
async function syncMatches(apiUrl, apiKey, supabase) {
  console.log('Syncing matches...');
  const now = new Date();
  const fromDate = new Date(now.getTime() - 7 * 24 * 60 * 60 * 1000) // 7 days ago
  ;
  const toDate = new Date(now.getTime() + 30 * 24 * 60 * 60 * 1000) // 30 days from now
  ;
  const response = await fetch(`${apiUrl}/matches?per_page=100&starts_after=${fromDate.toISOString()}&starts_before=${toDate.toISOString()}`, {
    headers: {
      'Abios-Secret': apiKey
    }
  });
  if (!response.ok) {
    throw new Error(`Failed to fetch matches: ${response.status}`);
  }
  const matches = await response.json();
  for (const match of matches){
    // Get related IDs from our database
    const { data: tournament } = await supabase.from('pro_tournaments').select('id').eq('abios_id', match.series?.id).single();
    const { data: substage } = await supabase.from('pro_substages').select('id').eq('abios_id', match.substage?.id).single();
    const team1 = match.teams?.[0];
    const team2 = match.teams?.[1];
    const { data: team1Data } = team1 ? await supabase.from('pro_teams').select('id').eq('abios_id', team1.id).single() : {
      data: null
    };
    const { data: team2Data } = team2 ? await supabase.from('pro_teams').select('id').eq('abios_id', team2.id).single() : {
      data: null
    };
    // Determine winner
    let winnerId = null;
    if (match.results?.length > 0) {
      const winnerResult = match.results.find((r)=>r.standing === 1);
      if (winnerResult) {
        const { data: winnerData } = await supabase.from('pro_teams').select('id').eq('abios_id', winnerResult.roster.team.id).single();
        winnerId = winnerData?.id;
      }
    }
    await supabase.from('pro_matches').upsert({
      abios_id: match.id,
      tournament_id: tournament?.id,
      substage_id: substage?.id,
      team1_id: team1Data?.id,
      team2_id: team2Data?.id,
      scheduled_at: match.start ? new Date(match.start).toISOString() : null,
      started_at: match.actualStart ? new Date(match.actualStart).toISOString() : null,
      finished_at: match.end ? new Date(match.end).toISOString() : null,
      status: match.deleted_at ? 'finished' : match.actualStart ? 'live' : 'scheduled',
      best_of: match.bestOf,
      team1_score: match.results?.find((r)=>r.roster.team.id === team1?.id)?.score || 0,
      team2_score: match.results?.find((r)=>r.roster.team.id === team2?.id)?.score || 0,
      winner_id: winnerId,
      stream_urls: JSON.stringify(match.streams || []),
      updated_at: new Date().toISOString()
    }).onConflict('abios_id');
  }
  console.log(`Synced ${matches.length} matches`);
}
