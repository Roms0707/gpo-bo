import { createClient } from 'npm:@supabase/supabase-js';
// Define CORS headers
const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization"
};
// Handle OPTIONS request for CORS
const handleCors = (req)=>{
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders
    });
  }
  return null;
};
// The main function handler
Deno.serve(async (req)=>{
  // Handle CORS preflight request
  const corsResponse = handleCors(req);
  if (corsResponse) return corsResponse;
  try {
    // Get tournament ID from URL params
    const url = new URL(req.url);
    const id = url.searchParams.get('id');
    // Create Supabase client using service role for admin access
    const supabaseUrl = Deno.env.get('SUPABASE_URL') || '';
    const supabaseServiceKey = Deno.env.get('SUPABASE_SERVICE_ROLE_KEY') || '';
    const supabase = createClient(supabaseUrl, supabaseServiceKey);
    // If ID is provided, fetch specific tournament
    if (id) {
      // Fetch tournament data with a single query to get:
      // 1. Tournament details
      // 2. Tournament field values with field details
      // 3. Teams associated with the tournament
      const { data: tournament, error: tournamentError } = await supabase.from('tournaments').select(`
          *,
          field_values:tournament_field_values(
            id,
            field_id,
            value,
            field:field_id(
              id,
              name,
              field_type,
              required
            )
          ),
          teams:teams(
            id,
            name
          )
        `).eq('id', id).single();
      if (tournamentError) {
        throw tournamentError;
      }
      // Also fetch tournament registrations count
      const { data: registrationsData, error: registrationsError } = await supabase.from('tournament_registrations').select('status').eq('tournament_id', id);
      if (registrationsError) {
        throw registrationsError;
      }
      // Calculate registration statistics
      const registrations = {
        total: registrationsData.length,
        pending: registrationsData.filter((r)=>r.status === 'pending').length,
        approved: registrationsData.filter((r)=>r.status === 'approved').length,
        rejected: registrationsData.filter((r)=>r.status === 'rejected').length
      };
      // Combine all data
      const response = {
        ...tournament,
        registrations
      };
      // Return the data
      return new Response(JSON.stringify(response), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    } else {
      // Fetch all tournaments with basic details
      const { data: tournaments, error: tournamentsError } = await supabase.from('tournaments').select(`
          *,
          field_values:tournament_field_values(
            id,
            field_id,
            value,
            field:field_id(
              id,
              name,
              field_type,
              required
            )
          ),
          teams:teams(
            id,
            name
          )
        `).order('created_at', {
        ascending: false
      });
      if (tournamentsError) {
        throw tournamentsError;
      }
      // Fetch registration statistics for all tournaments
      const { data: allRegistrations, error: registrationsError } = await supabase.from('tournament_registrations').select('tournament_id, status');
      if (registrationsError) {
        throw registrationsError;
      }
      // Group registrations by tournament_id
      const registrationsByTournament = allRegistrations.reduce((acc, reg)=>{
        if (!acc[reg.tournament_id]) {
          acc[reg.tournament_id] = {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0
          };
        }
        acc[reg.tournament_id].total++;
        acc[reg.tournament_id][reg.status]++;
        return acc;
      }, {});
      // Add registration statistics to each tournament
      const tournamentsWithStats = tournaments.map((tournament)=>({
          ...tournament,
          registrations: registrationsByTournament[tournament.id] || {
            total: 0,
            pending: 0,
            approved: 0,
            rejected: 0
          }
        }));
      // Return all tournaments with their data
      return new Response(JSON.stringify(tournamentsWithStats), {
        status: 200,
        headers: {
          ...corsHeaders,
          "Content-Type": "application/json"
        }
      });
    }
  } catch (error) {
    console.error("Error fetching tournament info:", error);
    return new Response(JSON.stringify({
      error: error.message || "Failed to retrieve tournament information"
    }), {
      status: 500,
      headers: {
        ...corsHeaders,
        "Content-Type": "application/json"
      }
    });
  }
});
