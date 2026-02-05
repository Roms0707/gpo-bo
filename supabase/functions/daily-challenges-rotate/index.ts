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
    console.log('Starting daily challenges rotation...');
    const today = new Date();
    const todayStr = today.toISOString().split('T')[0];
    // Deactivate expired challenges
    await supabase.from('pp_daily_challenges').update({
      is_active: false
    }).lt('valid_until', todayStr);
    // Check if today's challenges already exist
    const { data: existingChallenges } = await supabase.from('pp_daily_challenges').select('id').eq('valid_from', todayStr).eq('is_active', true);
    if (existingChallenges?.length > 0) {
      console.log('Today\'s challenges already exist');
      return new Response(JSON.stringify({
        success: true,
        message: 'Challenges already exist for today'
      }), {
        headers: {
          ...corsHeaders,
          'Content-Type': 'application/json'
        }
      });
    }
    // Generate new daily challenges
    const newChallenges = generateDailyChallenges(today);
    for (const challenge of newChallenges){
      const { data: insertedChallenge } = await supabase.from('pp_daily_challenges').insert({
        ...challenge,
        valid_from: todayStr,
        valid_until: todayStr,
        is_active: true
      }).select().single();
      // Initialize progress for all users
      const { data: users } = await supabase.from('pp_user_points').select('user_id');
      if (users?.length && insertedChallenge) {
        const progressRecords = users.map((user)=>({
            user_id: user.user_id,
            challenge_id: insertedChallenge.id,
            current_value: 0,
            target_value: challenge.target_value,
            is_completed: false
          }));
        await supabase.from('pp_challenge_progress').insert(progressRecords);
      }
    }
    // Process challenge progress for active challenges
    await processChallengeProgress(supabase);
    console.log(`Generated ${newChallenges.length} new daily challenges`);
    return new Response(JSON.stringify({
      success: true,
      message: `Generated ${newChallenges.length} challenges`
    }), {
      headers: {
        ...corsHeaders,
        'Content-Type': 'application/json'
      },
      status: 200
    });
  } catch (error) {
    console.error('Daily challenges rotation error:', error);
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
function generateDailyChallenges(date) {
  const dayOfWeek = date.getDay();
  const dayOfMonth = date.getDate();
  const challenges = [];
  // Always include a prediction challenge
  challenges.push({
    code: `daily_predictions_${date.toISOString().split('T')[0]}`,
    name: {
      en: 'Daily Predictor',
      fr: 'Pronostiqueur Quotidien',
      ar: 'متوقع يومي'
    },
    description: {
      en: 'Make 3 predictions today',
      fr: 'Faites 3 pronostics aujourd\'hui',
      ar: 'قم بعمل 3 توقعات اليوم'
    },
    challenge_type: 'daily_predictions',
    target_value: 3,
    reward_points: 15
  });
  // Accuracy challenge (weekends)
  if (dayOfWeek === 0 || dayOfWeek === 6) {
    challenges.push({
      code: `accuracy_weekend_${date.toISOString().split('T')[0]}`,
      name: {
        en: 'Weekend Accuracy',
        fr: 'Précision Week-end',
        ar: 'دقة نهاية الأسبوع'
      },
      description: {
        en: 'Get 2 predictions correct',
        fr: 'Réussissez 2 pronostics',
        ar: 'احصل على توقعين صحيحين'
      },
      challenge_type: 'correct_predictions',
      target_value: 2,
      reward_points: 25
    });
  }
  // Special monthly challenges
  if (dayOfMonth === 1) {
    challenges.push({
      code: `monthly_start_${date.toISOString().split('T')[0]}`,
      name: {
        en: 'Month Starter',
        fr: 'Début de Mois',
        ar: 'بداية الشهر'
      },
      description: {
        en: 'Make 5 predictions to start the month strong',
        fr: 'Faites 5 pronostics pour bien commencer le mois',
        ar: 'قم بعمل 5 توقعات لبدء الشهر بقوة'
      },
      challenge_type: 'daily_predictions',
      target_value: 5,
      reward_points: 50
    });
  }
  // Streak challenge (mid-week)
  if (dayOfWeek >= 2 && dayOfWeek <= 4) {
    challenges.push({
      code: `streak_builder_${date.toISOString().split('T')[0]}`,
      name: {
        en: 'Streak Builder',
        fr: 'Constructeur de Série',
        ar: 'بناء السلسلة'
      },
      description: {
        en: 'Maintain or build your prediction streak',
        fr: 'Maintenez ou construisez votre série',
        ar: 'حافظ على سلسلة التوقعات أو قم ببنائها'
      },
      challenge_type: 'maintain_streak',
      target_value: 1,
      reward_points: 20
    });
  }
  return challenges;
}
async function processChallengeProgress(supabase) {
  const today = new Date().toISOString().split('T')[0];
  // Get active challenges
  const { data: activeChallenges } = await supabase.from('pp_daily_challenges').select('*').eq('is_active', true).eq('valid_from', today);
  if (!activeChallenges?.length) return;
  // Process each challenge type
  for (const challenge of activeChallenges){
    await processChallengeType(supabase, challenge);
  }
  // Award completed challenge rewards
  await awardChallengeRewards(supabase);
}
async function processChallengeType(supabase, challenge) {
  const today = new Date().toISOString().split('T')[0];
  switch(challenge.challenge_type){
    case 'daily_predictions':
      {
        // Count predictions made today
        const { data: userPredictions } = await supabase.from('pp_predictions').select('user_id').gte('created_at', today + 'T00:00:00Z').lt('created_at', today + 'T23:59:59Z');
        const predictionCounts = userPredictions?.reduce((acc, pred)=>{
          acc[pred.user_id] = (acc[pred.user_id] || 0) + 1;
          return acc;
        }, {}) || {};
        for (const [userId, count] of Object.entries(predictionCounts)){
          await supabase.from('pp_challenge_progress').update({
            current_value: Math.min(count, challenge.target_value),
            is_completed: count >= challenge.target_value,
            completed_at: count >= challenge.target_value ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }).eq('user_id', userId).eq('challenge_id', challenge.id);
        }
        break;
      }
    case 'correct_predictions':
      {
        // Count correct predictions today
        const { data: correctPredictions } = await supabase.from('pp_predictions').select(`
          user_id,
          pp_prediction_results!inner(is_correct)
        `).gte('created_at', today + 'T00:00:00Z').lt('created_at', today + 'T23:59:59Z').eq('pp_prediction_results.is_correct', true);
        const correctCounts = correctPredictions?.reduce((acc, pred)=>{
          acc[pred.user_id] = (acc[pred.user_id] || 0) + 1;
          return acc;
        }, {}) || {};
        for (const [userId, count] of Object.entries(correctCounts)){
          await supabase.from('pp_challenge_progress').update({
            current_value: Math.min(count, challenge.target_value),
            is_completed: count >= challenge.target_value,
            completed_at: count >= challenge.target_value ? new Date().toISOString() : null,
            updated_at: new Date().toISOString()
          }).eq('user_id', userId).eq('challenge_id', challenge.id);
        }
        break;
      }
    case 'maintain_streak':
      {
        // Check current streaks
        const { data: userPoints } = await supabase.from('pp_user_points').select('user_id, current_streak').gte('current_streak', challenge.target_value);
        for (const user of userPoints || []){
          await supabase.from('pp_challenge_progress').update({
            current_value: challenge.target_value,
            is_completed: true,
            completed_at: new Date().toISOString(),
            updated_at: new Date().toISOString()
          }).eq('user_id', user.user_id).eq('challenge_id', challenge.id);
        }
        break;
      }
  }
}
async function awardChallengeRewards(supabase) {
  // Get completed challenges that haven't been rewarded
  const { data: completedChallenges } = await supabase.from('pp_challenge_progress').select(`
      user_id,
      challenge_id,
      pp_daily_challenges(reward_points, reward_badge_id, name)
    `).eq('is_completed', true).eq('reward_claimed', false);
  for (const progress of completedChallenges || []){
    const challenge = progress.pp_daily_challenges;
    // Award points
    if (challenge.reward_points > 0) {
      await supabase.from('pp_reward_history').insert({
        user_id: progress.user_id,
        reward_type: 'challenge_points',
        reward_source: 'daily_challenge',
        source_id: progress.challenge_id,
        points_awarded: challenge.reward_points,
        description: `Daily challenge completed: ${challenge.reward_points} points`
      });
    }
    // Award badge if specified
    if (challenge.reward_badge_id) {
      await supabase.from('pp_user_badges').insert({
        user_id: progress.user_id,
        badge_id: challenge.reward_badge_id
      }).onConflict('user_id,badge_id').ignore();
      await supabase.from('pp_reward_history').insert({
        user_id: progress.user_id,
        reward_type: 'badge',
        reward_source: 'daily_challenge',
        source_id: progress.challenge_id,
        badge_id: challenge.reward_badge_id,
        description: 'Badge earned from daily challenge'
      });
    }
    // Mark reward as claimed
    await supabase.from('pp_challenge_progress').update({
      reward_claimed: true,
      reward_claimed_at: new Date().toISOString()
    }).eq('user_id', progress.user_id).eq('challenge_id', progress.challenge_id);
  }
}
