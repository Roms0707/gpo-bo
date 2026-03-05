import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers":
    "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface RequestPayload {
  config_id: string;
  game_id: string;
  language?: string;
}

interface VideoProgress {
  rubric_id: string;
  video_id: string;
  video_title: string | null;
  is_completed: boolean;
  watch_time_seconds: number;
  duration_seconds: number | null;
}

interface QuizResult {
  quiz_id: string;
  rubric_id: string;
  rubric_name: string | null;
  score: number;
  total_questions: number;
  is_completed: boolean;
}

interface RubricMapping {
  rubric_id: string;
  rubric_name: string | null;
}

interface UserProfile {
  rank_label: string | null;
  main_characters: string[] | null;
  playstyle_notes: string | null;
}

interface TrainingActivity {
  activity_type: "watch_video" | "take_quiz" | "practice_focus";
  rubric_id: string | null;
  rubric_name: string | null;
  video_id: string | null;
  quiz_id: string | null;
  title: string;
  description: string;
  estimated_minutes: number;
}

interface TrainingDay {
  day: number;
  theme: string;
  activities: TrainingActivity[];
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

function jsonResponse(data: unknown, status = 200) {
  return new Response(JSON.stringify(data), {
    status,
    headers: { ...corsHeaders, "Content-Type": "application/json" },
  });
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, { status: 200, headers: corsHeaders });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const { data: openaiConfig, error: openaiError } = await supabase
      .from("platform_api_integrations")
      .select("api_key")
      .eq("api_name", "OpenAI API")
      .eq("is_active", true)
      .maybeSingle();

    if (openaiError || !openaiConfig?.api_key) {
      return jsonResponse(
        { error: openaiError?.message || "OpenAI API key not configured" },
        500
      );
    }

    const openaiApiKey = openaiConfig.api_key;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return jsonResponse({ error: "Missing Authorization header" }, 401);
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return jsonResponse({ error: "Unauthorized" }, 401);
    }

    const payload: RequestPayload = await req.json();
    const { config_id, game_id, language: rawLang } = payload;
    const language =
      rawLang && ["en", "fr", "es"].includes(rawLang) ? rawLang : "en";

    if (!config_id || !game_id) {
      return jsonResponse(
        { error: "config_id and game_id are required" },
        400
      );
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select("id, config_id, brand_name")
      .eq("config_id", config_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !projectConfig) {
      return jsonResponse(
        {
          error:
            configError?.message ||
            `No active project configuration found for config_id: ${config_id}`,
        },
        404
      );
    }

    const projectConfigId = projectConfig.id;

    const [videoProgressRes, quizResultsRes, rubricMappingsRes, userProfileRes] =
      await Promise.all([
        supabase
          .from("grind_zone_video_progress")
          .select(
            "rubric_id, video_id, video_title, is_completed, watch_time_seconds, duration_seconds"
          )
          .eq("user_id", user.id)
          .eq("project_config_id", projectConfigId)
          .eq("game_id", game_id),

        supabase
          .from("grind_zone_quiz_submissions")
          .select(
            "quiz_id, score, total_questions, is_completed, grind_zone_quizzes!inner(rubric_id, rubric_name)"
          )
          .eq("user_id", user.id)
          .eq("is_completed", true)
          .eq("grind_zone_quizzes.project_config_id", projectConfigId)
          .eq("grind_zone_quizzes.game_id", game_id),

        supabase
          .from("galaxy_rubric_mappings")
          .select("rubric_id, rubric_name")
          .eq("project_config_id", projectConfigId)
          .eq("game_id", game_id)
          .eq("content_category", "grind_zone")
          .eq("display_on_frontend", true),

        supabase
          .from("user_game_manual_profiles")
          .select("rank_label, main_characters, playstyle_notes")
          .eq("user_id", user.id)
          .eq("game_id", game_id)
          .maybeSingle(),
      ]);

    const videoProgress: VideoProgress[] = videoProgressRes.data || [];
    const rubricMappings: RubricMapping[] = rubricMappingsRes.data || [];
    const userProfile: UserProfile | null = userProfileRes.data || null;

    const quizResults: QuizResult[] = (quizResultsRes.data || []).map(
      (row: Record<string, unknown>) => {
        const quiz = row.grind_zone_quizzes as Record<string, unknown>;
        return {
          quiz_id: row.quiz_id as string,
          rubric_id: quiz.rubric_id as string,
          rubric_name: quiz.rubric_name as string | null,
          score: row.score as number,
          total_questions: row.total_questions as number,
          is_completed: row.is_completed as boolean,
        };
      }
    );

    const completedVideoIds = new Set(
      videoProgress.filter((v) => v.is_completed).map((v) => v.video_id)
    );

    const completedVideoCount = completedVideoIds.size;
    const totalVideoCount = videoProgress.length;

    const rubricProgress = new Map<
      string,
      { total: number; completed: number; name: string | null }
    >();
    for (const v of videoProgress) {
      const entry = rubricProgress.get(v.rubric_id) || {
        total: 0,
        completed: 0,
        name: null,
      };
      entry.total++;
      if (v.is_completed) entry.completed++;
      rubricProgress.set(v.rubric_id, entry);
    }

    const quizScoresByRubric = new Map<
      string,
      { bestScore: number; totalQ: number; name: string | null }
    >();
    for (const q of quizResults) {
      const existing = quizScoresByRubric.get(q.rubric_id);
      if (
        !existing ||
        q.score / q.total_questions > existing.bestScore / existing.totalQ
      ) {
        quizScoresByRubric.set(q.rubric_id, {
          bestScore: q.score,
          totalQ: q.total_questions,
          name: q.rubric_name,
        });
      }
    }

    const unwatchedRubrics = rubricMappings.filter(
      (r) => !rubricProgress.has(r.rubric_id)
    );
    const inProgressRubrics = [...rubricProgress.entries()]
      .filter(([, v]) => v.completed < v.total)
      .map(([id, v]) => ({ rubric_id: id, ...v }));
    const lowScoreRubrics = [...quizScoresByRubric.entries()]
      .filter(([, v]) => v.totalQ > 0 && v.bestScore / v.totalQ < 0.75)
      .map(([id, v]) => ({ rubric_id: id, ...v }));
    const noQuizRubrics = rubricMappings.filter(
      (r) =>
        rubricProgress.has(r.rubric_id) && !quizScoresByRubric.has(r.rubric_id)
    );

    const langName = LANGUAGE_NAMES[language] || "English";

    const contextLines: string[] = [];
    contextLines.push(`## User Training Context`);
    contextLines.push(
      `- Videos watched: ${completedVideoCount}/${totalVideoCount}`
    );
    contextLines.push(`- Quizzes completed: ${quizResults.length}`);

    if (userProfile) {
      if (userProfile.rank_label)
        contextLines.push(`- Current rank: ${userProfile.rank_label}`);
      if (userProfile.main_characters?.length)
        contextLines.push(
          `- Main characters/agents: ${userProfile.main_characters.join(", ")}`
        );
      if (userProfile.playstyle_notes)
        contextLines.push(
          `- Playstyle notes: ${userProfile.playstyle_notes}`
        );
    }

    if (unwatchedRubrics.length > 0) {
      contextLines.push(`\n## Unwatched Topics (highest priority)`);
      for (const r of unwatchedRubrics.slice(0, 10)) {
        contextLines.push(
          `- "${r.rubric_name || r.rubric_id}" (rubric_id: ${r.rubric_id})`
        );
      }
    }

    if (inProgressRubrics.length > 0) {
      contextLines.push(`\n## In-Progress Topics (partially watched)`);
      for (const r of inProgressRubrics.slice(0, 10)) {
        contextLines.push(
          `- rubric_id: ${r.rubric_id} — ${r.completed}/${r.total} videos completed`
        );
      }
    }

    if (lowScoreRubrics.length > 0) {
      contextLines.push(`\n## Weak Areas (quiz score < 75%)`);
      for (const r of lowScoreRubrics.slice(0, 10)) {
        contextLines.push(
          `- "${r.name || r.rubric_id}" (rubric_id: ${r.rubric_id}) — best score: ${r.bestScore}/${r.totalQ}`
        );
      }
    }

    if (noQuizRubrics.length > 0) {
      contextLines.push(
        `\n## Topics with videos but no quiz attempted`
      );
      for (const r of noQuizRubrics.slice(0, 10)) {
        contextLines.push(
          `- "${r.rubric_name || r.rubric_id}" (rubric_id: ${r.rubric_id})`
        );
      }
    }

    const availableRubricIds = rubricMappings
      .map((r) => `"${r.rubric_name || r.rubric_id}" (${r.rubric_id})`)
      .join(", ");

    const systemPrompt = `You are a personalized training plan generator for a competitive gaming improvement platform called "Grind Zone".

Your job is to create a 7-day training plan tailored to the user's current progress, strengths, and weaknesses.

CRITICAL LANGUAGE REQUIREMENT: Generate ALL content in ${langName}.

RULES:
- Create exactly 7 days of training
- Each day should have 2-3 activities maximum
- Activity types: "watch_video" (watch content from a rubric), "take_quiz" (test knowledge on a rubric), "practice_focus" (in-game practice session with specific focus)
- Prioritize content the user has NOT yet completed
- For weak areas (low quiz scores), suggest re-watching videos and re-taking quizzes
- For in-progress topics, suggest completing remaining videos
- Include at least 2 practice_focus activities across the week
- Each activity should have a clear, motivating title and actionable description
- estimated_minutes should be realistic (videos: 10-20min, quizzes: 5-10min, practice: 15-30min)
- Only reference rubric_ids from the available rubrics list
- For watch_video and take_quiz activities, always include the rubric_id
- For practice_focus activities, rubric_id is optional (set null if general practice)
- video_id and quiz_id should always be null (the frontend will resolve specific content)
- Each day should have a short theme (e.g., "Fundamentals Day", "Map Knowledge", "Aim Training")

Available rubrics: ${availableRubricIds || "None available"}

Return ONLY valid JSON in this exact format:
{
  "plan": [
    {
      "day": 1,
      "theme": "...",
      "activities": [
        {
          "activity_type": "watch_video",
          "rubric_id": "...",
          "rubric_name": "...",
          "video_id": null,
          "quiz_id": null,
          "title": "...",
          "description": "...",
          "estimated_minutes": 15
        }
      ]
    }
  ]
}`;

    const userMessage = contextLines.join("\n");

    const openaiResponse = await fetch(
      "https://api.openai.com/v1/chat/completions",
      {
        method: "POST",
        headers: {
          Authorization: `Bearer ${openaiApiKey}`,
          "Content-Type": "application/json",
        },
        body: JSON.stringify({
          model: "gpt-4o-mini",
          messages: [
            { role: "system", content: systemPrompt },
            { role: "user", content: userMessage },
          ],
          temperature: 0.7,
          max_tokens: 4000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorText = await openaiResponse.text();
      return jsonResponse(
        {
          error: `OpenAI API error: ${openaiResponse.status}`,
          details: errorText,
        },
        502
      );
    }

    const openaiData = await openaiResponse.json();
    const rawContent = openaiData.choices?.[0]?.message?.content;

    if (!rawContent) {
      return jsonResponse(
        { error: "OpenAI returned empty response" },
        502
      );
    }

    let parsedPlan: { plan: TrainingDay[] };
    try {
      parsedPlan = JSON.parse(rawContent);
    } catch {
      return jsonResponse(
        { error: "Failed to parse training plan from AI", raw: rawContent },
        502
      );
    }

    if (!parsedPlan.plan || !Array.isArray(parsedPlan.plan)) {
      return jsonResponse(
        { error: "AI response missing 'plan' array", raw: rawContent },
        502
      );
    }

    return jsonResponse({
      plan: parsedPlan.plan,
      context: {
        user_id: user.id,
        game_id,
        config_id,
        videos_watched: completedVideoCount,
        videos_total: totalVideoCount,
        quizzes_completed: quizResults.length,
        rubrics_available: rubricMappings.length,
        generated_at: new Date().toISOString(),
      },
    });
  } catch (err) {
    const message = err instanceof Error ? err.message : "Internal server error";
    return jsonResponse({ error: message }, 500);
  }
});
