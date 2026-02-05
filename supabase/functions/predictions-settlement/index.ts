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
    console.log('Starting predictions settlement...');
    // Get finished matches that haven't been settled
    const { data: finishedMatches, error: matchesError } = await supabase.from('pro_matches').select(`
        id,
        winner_id,
        team1_id,
        team2_id,
        team1_score,
        team2_score,
        finished_at
      `).eq('status', 'finished').not('winner_id', 'is', null).gte('finished_at', new Date(Date.now() - 24 * 60 * 60 * 1000).toISOString()) // Last 24h
    ;
    if (matchesError) {
      throw new Error(`Error fetching matches: ${matchesError.message}`);
    }
    let settledCount = 0;
    for (const match of finishedMatches || []){
      // Get unsettled predictions for this match
      const { data: predictions } = await supabase.from('pp_predictions').select(`
          id,
          user_id,
          predicted_winner_id,
          predicted_score_team1,
          predicted_score_team2,
          confidence_level,
          prediction_type
        `).eq('match_id', match.id).not('id', 'in', `(SELECT prediction_id FROM pp_prediction_results)`);
      if (!predictions?.length) continue;
      for (const prediction of predictions){
        await settlePrediction(supabase, prediction, match);
        settledCount++;
      }
    }
    // Update user point totals
    await updateUserPoints(supabase);
    // Check for new badges earned
    await checkBadges(supabase);
    console.log(`Settled ${settledCount} predictions`);
    return new Response(JSON.stringify({
      success: true,
      message: `Settled ${settledCount} predictions`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Predictions settlement error:', error);
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
async function settlePrediction(supabase, prediction, match) {
  let isCorrect = false;
  let pointsEarned = 0;
  let bonusPoints = 0;
  let bonusReason = null;
  // Get prediction rules
  const { data: rules } = await supabase.from('pp_prediction_rules').select('*').eq('rule_type', prediction.prediction_type).eq('is_active', true).single();
  if (!rules) return;
  // Check if prediction is correct
  if (prediction.prediction_type === 'winner') {
    isCorrect = prediction.predicted_winner_id === match.winner_id;
    pointsEarned = isCorrect ? rules.points_correct : 0;
    // Bonus for underdog victory (team with lower ID wins - simplified)
    if (isCorrect && match.winner_id === Math.min(match.team1_id, match.team2_id)) {
      bonusPoints = rules.points_bonus;
      bonusReason = 'underdog_victory';
    }
  } else if (prediction.prediction_type === 'exact_score') {
    isCorrect = prediction.predicted_score_team1 === match.team1_score && prediction.predicted_score_team2 === match.team2_score;
    pointsEarned = isCorrect ? rules.points_correct : 0;
    // Bonus for high confidence
    if (isCorrect && prediction.confidence_level >= 4) {
      bonusPoints = rules.points_bonus;
      bonusReason = 'high_confidence';
    }
  }
  // Confidence multiplier
  const confidenceMultiplier = 1 + (prediction.confidence_level - 1) * 0.1;
  pointsEarned = Math.floor(pointsEarned * confidenceMultiplier);
  // Save result
  await supabase.from('pp_prediction_results').insert({
    prediction_id: prediction.id,
    is_correct: isCorrect,
    points_earned: pointsEarned,
    bonus_points: bonusPoints,
    bonus_reason: bonusReason
  });
  // Log reward
  if (pointsEarned > 0 || bonusPoints > 0) {
    await supabase.from('pp_reward_history').insert({
      user_id: prediction.user_id,
      reward_type: 'prediction_points',
      reward_source: 'match_result',
      source_id: match.id,
      points_awarded: pointsEarned + bonusPoints,
      description: `Prediction ${isCorrect ? 'correct' : 'incorrect'} - ${pointsEarned + bonusPoints} points`
    });
  }
}
async function updateUserPoints(supabase) {
  // Update total points from prediction results
  await supabase.rpc('update_user_points_from_predictions');
  // Update streaks
  const { data: users } = await supabase.from('pp_user_points').select('user_id');
  for (const user of users || []){
    await updateUserStreak(supabase, user.user_id);
  }
}
async function updateUserStreak(supabase, userId) {
  // Get recent predictions in chronological order
  const { data: recentPredictions } = await supabase.from('pp_predictions').select(`
      id,
      created_at,
      pp_prediction_results(is_correct)
    `).eq('user_id', userId).not('pp_prediction_results.id', 'is', null).order('created_at', {
    ascending: false
  }).limit(50);
  if (!recentPredictions?.length) return;
  let currentStreak = 0;
  let bestStreak = 0;
  let tempStreak = 0;
  // Calculate current streak (from most recent)
  for (const prediction of recentPredictions){
    if (prediction.pp_prediction_results?.[0]?.is_correct) {
      if (currentStreak === 0) currentStreak = tempStreak + 1;
      tempStreak++;
      bestStreak = Math.max(bestStreak, tempStreak);
    } else {
      if (currentStreak === 0) currentStreak = 0;
      tempStreak = 0;
    }
  }
  // Update user points with streak info
  await supabase.from('pp_user_points').update({
    current_streak: currentStreak,
    best_streak: Math.max(bestStreak, currentStreak),
    updated_at: new Date().toISOString()
  }).eq('user_id', userId);
}
async function checkBadges(supabase) {
  const { data: badges } = await supabase.from('pp_badges').select('*').eq('is_active', true);
  const { data: users } = await supabase.from('pp_user_points').select('*');
  for (const user of users || []){
    for (const badge of badges || []){
      // Check if user already has this badge
      const { data: existingBadge } = await supabase.from('pp_user_badges').select('id').eq('user_id', user.user_id).eq('badge_id', badge.id).single();
      if (existingBadge) continue;
      let earned = false;
      // Check badge conditions
      switch(badge.condition_type){
        case 'predictions_made':
          earned = user.predictions_made >= badge.condition_value;
          break;
        case 'predictions_correct':
          earned = user.predictions_correct >= badge.condition_value;
          break;
        case 'total_points':
          earned = user.total_points >= badge.condition_value;
          break;
        case 'current_streak':
          earned = user.current_streak >= badge.condition_value;
          break;
        case 'best_streak':
          earned = user.best_streak >= badge.condition_value;
          break;
      }
      if (earned) {
        // Award badge
        await supabase.from('pp_user_badges').insert({
          user_id: user.user_id,
          badge_id: badge.id
        });
        // Log reward
        await supabase.from('pp_reward_history').insert({
          user_id: user.user_id,
          reward_type: 'badge',
          reward_source: 'achievement',
          badge_id: badge.id,
          description: `Earned badge: ${badge.name.en || badge.name.fr || 'Unknown'}`
        });
      }
    }
  }
}
