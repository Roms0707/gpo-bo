import "jsr:@supabase/functions-js/edge-runtime.d.ts";
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey"
};
function generateRandomDate(startAge, endAge) {
  const today = new Date();
  const birthYear = today.getFullYear() - Math.floor(Math.random() * (endAge - startAge + 1)) - startAge;
  const birthMonth = Math.floor(Math.random() * 12) + 1;
  const birthDay = Math.floor(Math.random() * 28) + 1;
  return `${birthYear}-${birthMonth.toString().padStart(2, '0')}-${birthDay.toString().padStart(2, '0')}`;
}
function generateTunisianUsername(index) {
  const tunisianNames = [
    'Ahmed',
    'Mohamed',
    'Ali',
    'Youssef',
    'Hamza',
    'Karim',
    'Mehdi',
    'Rami',
    'Samir',
    'Nabil',
    'Fares',
    'Sofiane',
    'Bilel',
    'Walid',
    'Tarek',
    'Omar'
  ];
  const baseName = tunisianNames[index % tunisianNames.length];
  return `${baseName}TN${index.toString().padStart(3, '0')}`;
}
Deno.serve(async (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  try {
    const supabaseUrl = Deno.env.get('SUPABASE_URL');
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY');
    const { createClient } = await import('npm:@supabase/supabase-js@2');
    const supabaseAdmin = createClient(supabaseUrl, supabaseServiceKey);
    const { tournamentId, count = 128, country = 'Tunisia', status = 'approved' } = await req.json();
    if (!tournamentId) {
      return new Response(JSON.stringify({
        error: 'tournamentId is required'
      }), {
        status: 400,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const { data: tournament, error: tournamentError } = await supabaseAdmin.from('tournaments').select('id, title, type, tournament_format, max_nb_players, status').eq('id', tournamentId).single();
    if (tournamentError || !tournament) {
      return new Response(JSON.stringify({
        error: 'Tournament not found'
      }), {
        status: 404,
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    const userIds = [];
    const batchSize = 50;
    for(let batch = 0; batch < Math.ceil(count / batchSize); batch++){
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, count);
      const users = [];
      for(let i = start; i < end; i++){
        const paddedIndex = (i + 1).toString().padStart(3, '0');
        users.push({
          email: `fake-player-${paddedIndex}@test.tn`,
          username: generateTunisianUsername(i + 1),
          type: 'gamer',
          country: country,
          date_of_birth: generateRandomDate(18, 35),
          has_parental_consent: true
        });
      }
      const { data: createdUsers, error: userError } = await supabaseAdmin.from('users').insert(users).select('id');
      if (userError) {
        return new Response(JSON.stringify({
          error: `Failed to create users: ${userError.message}`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
      if (createdUsers) {
        userIds.push(...createdUsers.map((u)=>u.id));
      }
    }
    for(let batch = 0; batch < Math.ceil(userIds.length / batchSize); batch++){
      const start = batch * batchSize;
      const end = Math.min(start + batchSize, userIds.length);
      const registrations = [];
      for(let i = start; i < end; i++){
        const baseTime = new Date();
        baseTime.setHours(baseTime.getHours() - userIds.length + i);
        registrations.push({
          tournament_id: tournamentId,
          user_id: userIds[i],
          team_id: null,
          status: status,
          created_at: baseTime.toISOString()
        });
      }
      const { error: regError } = await supabaseAdmin.from('tournament_registrations').insert(registrations);
      if (regError) {
        return new Response(JSON.stringify({
          error: `Failed to create registrations: ${regError.message}`
        }), {
          status: 400,
          headers: {
            ...corsHeaders,
            'Content-Type': 'application/json'
          }
        });
      }
    }
    const { count: finalCount } = await supabaseAdmin.from('tournament_registrations').select('*', {
      count: 'exact',
      head: true
    }).eq('tournament_id', tournamentId);
    return new Response(JSON.stringify({
      success: true,
      message: 'Fake registrations created successfully',
      tournament: {
        id: tournament.id,
        title: tournament.title
      },
      created: {
        users: userIds.length,
        registrations: userIds.length
      },
      totalRegistrations: finalCount || 0,
      country: country,
      status: status
    }), {
      status: 200,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  } catch (error) {
    console.error('Error in generate-fake-registrations function:', error);
    return new Response(JSON.stringify({
      error: 'Internal server error',
      details: error.message
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      }
    });
  }
});
