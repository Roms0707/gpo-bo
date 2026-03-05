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
  rubric_id: string;
  rubric_name?: string;
  game_id?: string;
  language?: string;
}

const LANGUAGE_NAMES: Record<string, string> = {
  en: "English",
  fr: "French",
  es: "Spanish",
};

const TRUE_FALSE_LABELS: Record<string, [string, string]> = {
  en: ["True", "False"],
  fr: ["Vrai", "Faux"],
  es: ["Verdadero", "Falso"],
};

interface VideoContent {
  content_id: string;
  title: string;
  description: string;
  theme_label: string | null;
  duration: number | null;
}

interface QuizQuestion {
  question_text: string;
  question_type: "multiple_choice" | "true_false" | "open_ended";
  options: string[] | null;
  correct_answer_index: number | null;
  correct_answer_text: string | null;
  explanation: string;
}

function extractThumbnailUrl(
  content: Record<string, unknown>
): string {
  const assets = content.assets as
    | { cover?: Array<{ url: string; ratio_tech_label?: string }> }
    | undefined;
  if (!assets?.cover || assets.cover.length === 0) return "";
  const landscape = assets.cover.find(
    (c) => c.ratio_tech_label === "landscape-16-9"
  );
  return landscape?.url || assets.cover[0].url;
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
      return new Response(
        JSON.stringify({
          error: openaiError?.message || "OpenAI API key not configured in platform_api_integrations",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const openaiApiKey = openaiConfig.api_key;

    const authHeader = req.headers.get("Authorization");
    if (!authHeader) {
      return new Response(
        JSON.stringify({ error: "Missing Authorization header" }),
        {
          status: 401,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const {
      data: { user },
      error: authError,
    } = await supabase.auth.getUser(authHeader.replace("Bearer ", ""));

    if (authError || !user) {
      return new Response(JSON.stringify({ error: "Unauthorized" }), {
        status: 401,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      });
    }

    const payload: RequestPayload = await req.json();
    const { config_id, rubric_id, rubric_name, game_id, language: rawLang } = payload;
    const language = rawLang && ["en", "fr", "es"].includes(rawLang) ? rawLang : "en";

    if (!config_id || !rubric_id) {
      return new Response(
        JSON.stringify({ error: "config_id and rubric_id are required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: projectConfig, error: configError } = await supabase
      .from("project_configurations")
      .select(
        "id, config_id, brand_name, campaign_id, country_code, language_code, service_id"
      )
      .eq("config_id", config_id)
      .eq("is_active", true)
      .maybeSingle();

    if (configError || !projectConfig) {
      return new Response(
        JSON.stringify({
          error:
            configError?.message ||
            `No active project configuration found for config_id: ${config_id}`,
        }),
        {
          status: 404,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: galaxyApi, error: apiError } = await supabase
      .from("platform_api_integrations")
      .select("api_key, api_url")
      .eq("api_name", "Galaxy API")
      .eq("is_active", true)
      .maybeSingle();

    if (apiError || !galaxyApi) {
      return new Response(
        JSON.stringify({
          error: apiError?.message || "Galaxy API configuration not found",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    let galaxyCreds: Record<string, string>;
    try {
      galaxyCreds = JSON.parse(galaxyApi.api_key);
    } catch {
      return new Response(
        JSON.stringify({ error: "Invalid Galaxy API credentials format" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const baseUrl = galaxyApi.api_url;
    const apiKey = galaxyCreds.api_key;
    const apiSecretKey = galaxyCreds.api_secret_key;
    const campaignId = projectConfig.campaign_id || galaxyCreds.campaign_id;
    const countryCode =
      projectConfig.country_code || galaxyCreds.country_code;
    const languageCode =
      projectConfig.language_code || galaxyCreds.language_code;

    if (!campaignId || !apiKey || !apiSecretKey || !baseUrl) {
      return new Response(
        JSON.stringify({
          error: "Incomplete Galaxy API or project configuration",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const params = new URLSearchParams();
    params.set("api_key", apiKey);
    params.set("api_secret_key", apiSecretKey);
    params.set("campaign_id", campaignId);
    params.set("country_code", countryCode);
    params.set("language_code", languageCode);
    params.set("asset", "true");
    params.set("rubric_id", rubric_id);
    params.set("itemsPerPage", "50");

    if (projectConfig.service_id) {
      params.set("service_id", projectConfig.service_id);
    }

    const galaxyUrl = `${baseUrl}/publishing-content-list?${params.toString()}`;
    const galaxyResponse = await fetch(galaxyUrl, {
      method: "GET",
      headers: { Accept: "application/json" },
    });

    if (!galaxyResponse.ok) {
      const errorText = await galaxyResponse.text();
      return new Response(
        JSON.stringify({
          error: `Galaxy API error: ${galaxyResponse.status}`,
          details: errorText,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const galaxyData = await galaxyResponse.json();

    if (galaxyData.code !== 200) {
      return new Response(
        JSON.stringify({
          error: `Galaxy API returned code ${galaxyData.code}`,
          message: galaxyData.message,
        }),
        {
          status: 502,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const rawContents = galaxyData.data?.data || [];

    const videos: VideoContent[] = rawContents.map(
      (item: Record<string, unknown>) => ({
        content_id: String(item.content_id || ""),
        title: (item.title as string) || "",
        description: (item.description as string) || "",
        theme_label: (item.theme_label as string) || null,
        duration:
          (item.duration as number) ||
          (
            item.deliveries as
              | { mainDelivery?: { duration?: number } }
              | undefined
          )?.mainDelivery?.duration ||
          null,
      })
    );

    if (videos.length === 0) {
      return new Response(
        JSON.stringify({
          error: "No video content found in this rubric to generate a quiz from",
        }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const videoSummaries = videos
      .map(
        (v, i) =>
          `${i + 1}. Title: "${v.title}"${v.description ? ` | Description: "${v.description}"` : ""}${v.theme_label ? ` | Theme: ${v.theme_label}` : ""}`
      )
      .join("\n");

    const langName = LANGUAGE_NAMES[language] || "English";
    const [tfTrue, tfFalse] = TRUE_FALSE_LABELS[language] || TRUE_FALSE_LABELS.en;

    const systemPrompt = `You are a quiz generator for a gaming education platform. You create engaging quiz questions based on video content from a "Grind Zone" rubric -- a section dedicated to helping gamers improve their skills.

Given a list of video titles and descriptions, generate exactly 4 quiz questions that test knowledge of the topics covered in these videos.

CRITICAL LANGUAGE REQUIREMENT: You MUST write ALL content (title, questions, options, explanations) in ${langName}. Every single string in your response must be in ${langName}.

RULES:
- Question 1: multiple_choice (4 options, exactly one correct)
- Question 2: multiple_choice (4 options, exactly one correct)
- Question 3: true_false (2 options: "${tfTrue}" and "${tfFalse}", exactly one correct)
- Question 4: open_ended (no options, provide an expected answer text instead)
- All questions must relate directly to the video content provided
- Questions should be educational, clear, and test actual understanding
- Provide a brief explanation for each correct answer
- Make distractors (wrong options) plausible but clearly wrong to someone who watched the videos

Return ONLY valid JSON in this exact format:
{
  "title": "A short, catchy quiz title related to the content",
  "questions": [
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer_index": 0,
      "correct_answer_text": null,
      "explanation": "..."
    },
    {
      "question_text": "...",
      "question_type": "multiple_choice",
      "options": ["A", "B", "C", "D"],
      "correct_answer_index": 2,
      "correct_answer_text": null,
      "explanation": "..."
    },
    {
      "question_text": "...",
      "question_type": "true_false",
      "options": ["${tfTrue}", "${tfFalse}"],
      "correct_answer_index": 0,
      "correct_answer_text": null,
      "explanation": "..."
    },
    {
      "question_text": "...",
      "question_type": "open_ended",
      "options": null,
      "correct_answer_index": null,
      "correct_answer_text": "expected answer summary",
      "explanation": "..."
    }
  ]
}`;

    const userPrompt = `Generate a quiz based on these ${videos.length} videos from the "${rubric_name || rubric_id}" grind zone rubric:\n\n${videoSummaries}`;

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
            { role: "user", content: userPrompt },
          ],
          temperature: 0.7,
          max_tokens: 2000,
          response_format: { type: "json_object" },
        }),
      }
    );

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to generate quiz from AI" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await openaiResponse.json();
    const aiContent =
      aiData.choices?.[0]?.message?.content || "{}";

    let quizData: { title?: string; questions?: QuizQuestion[] };
    try {
      quizData = JSON.parse(aiContent);
    } catch {
      return new Response(
        JSON.stringify({ error: "AI returned invalid JSON" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    if (
      !quizData.questions ||
      !Array.isArray(quizData.questions) ||
      quizData.questions.length !== 4
    ) {
      return new Response(
        JSON.stringify({
          error: "AI did not generate exactly 4 questions",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const quizTitle =
      quizData.title || `Quiz: ${rubric_name || rubric_id}`;

    const { data: quiz, error: quizError } = await supabase
      .from("grind_zone_quizzes")
      .insert({
        rubric_id,
        rubric_name: rubric_name || null,
        project_config_id: projectConfig.id,
        game_id: game_id || null,
        title: quizTitle,
        status: "draft",
        language,
        video_count: videos.length,
        created_by: user.id,
      })
      .select()
      .single();

    if (quizError || !quiz) {
      return new Response(
        JSON.stringify({
          error: quizError?.message || "Failed to create quiz record",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const questionRows = quizData.questions.map(
      (q: QuizQuestion, index: number) => ({
        quiz_id: quiz.id,
        question_text: q.question_text,
        question_type: q.question_type,
        options: q.options || null,
        correct_answer_index:
          q.correct_answer_index !== null &&
          q.correct_answer_index !== undefined
            ? q.correct_answer_index
            : null,
        correct_answer_text: q.correct_answer_text || null,
        explanation: q.explanation || null,
        display_order: index + 1,
      })
    );

    const { data: questions, error: questionsError } = await supabase
      .from("grind_zone_quiz_questions")
      .insert(questionRows)
      .select();

    if (questionsError) {
      return new Response(
        JSON.stringify({
          error:
            questionsError.message || "Failed to create quiz questions",
        }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    return new Response(
      JSON.stringify({
        quiz: { ...quiz, questions: questions || [] },
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in generate-grind-zone-quiz:", error);
    return new Response(
      JSON.stringify({
        error:
          error instanceof Error ? error.message : "Internal server error",
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
