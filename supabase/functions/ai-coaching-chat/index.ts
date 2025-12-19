import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface CoachingConfig {
  id: string;
  game_id: string;
  config_key: string;
  config_value: string;
  is_active: boolean;
  display_order: number;
}

interface ChatMessage {
  role: "user" | "assistant" | "system";
  content: string;
}

interface RequestPayload {
  message: string;
  game_id: string;
  session_id?: string;
  user_id?: string;
  conversation_history?: ChatMessage[];
}

const LOL_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Farming / CS": ["cs", "farm", "farming", "minion", "minions", "last hit", "last-hit", "gold", "creep", "creeps"],
  "Wave Management": ["wave", "freeze", "freezing", "slow push", "fast push", "crash", "bounce", "shove"],
  "Trading and Lane Pressure": ["trade", "trading", "poke", "harass", "lane pressure", "all-in", "short trade"],
  "Vision Control and Warding": ["ward", "warding", "vision", "control ward", "pink ward", "sweeper", "oracle"],
  "Map Awareness and Roaming": ["roam", "roaming", "map", "rotation", "rotate", "gank", "ganking", "river"],
  "Teamfighting": ["teamfight", "team fight", "5v5", "engage", "disengage", "peel", "frontline", "backline"],
  "Objective Control": ["dragon", "baron", "herald", "rift herald", "objective", "tower", "turret", "inhibitor", "nexus"],
  "Champion Matchups": ["matchup", "counter", "counterpick", "vs", "against", "lane opponent"],
  "Itemization and Builds": ["item", "items", "build", "mythic", "legendary", "boots", "rune", "runes"],
  "Macro Decision Making": ["macro", "split push", "splitpush", "side lane", "pressure", "win condition"],
  "Mental Game and Tilt Management": ["tilt", "tilted", "mental", "focus", "losing streak", "frustrated", "toxic"],
};

function detectTopics(message: string, topicPriorities: string[]): string[] {
  const lowerMessage = message.toLowerCase();
  const detectedTopics: string[] = [];

  for (const topic of topicPriorities) {
    const keywords = LOL_TOPIC_KEYWORDS[topic];
    if (keywords) {
      for (const keyword of keywords) {
        if (lowerMessage.includes(keyword)) {
          detectedTopics.push(topic);
          break;
        }
      }
    }
  }

  return detectedTopics;
}

function assembleSystemPrompt(configs: CoachingConfig[]): string {
  const activeConfigs = configs.filter((c) => c.is_active);

  const promptSections = activeConfigs
    .filter((c) => c.config_key === "custom_prompt_section")
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => c.config_value);

  const emphasisAreas = activeConfigs
    .filter((c) => c.config_key === "emphasis_areas")
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => c.config_value);

  const topicPriorities = activeConfigs
    .filter((c) => c.config_key === "topic_priority")
    .sort((a, b) => a.display_order - b.display_order)
    .map((c) => c.config_value);

  const behaviorToggles = activeConfigs
    .filter((c) => c.config_key === "behavior_toggle")
    .map((c) => c.config_value);

  let systemPrompt = "";

  if (promptSections.length > 0) {
    systemPrompt += promptSections.join("\n\n") + "\n\n";
  }

  if (emphasisAreas.length > 0) {
    systemPrompt += "## Key Emphasis Areas\n";
    systemPrompt += "When coaching, focus on these areas:\n";
    emphasisAreas.forEach((area) => {
      systemPrompt += `- ${area}\n`;
    });
    systemPrompt += "\n";
  }

  if (topicPriorities.length > 0) {
    systemPrompt += "## Topic Priorities\n";
    systemPrompt += "These are the priority topics for coaching (in order of importance):\n";
    topicPriorities.forEach((topic, index) => {
      systemPrompt += `${index + 1}. ${topic}\n`;
    });
    systemPrompt += "\n";
  }

  if (behaviorToggles.length > 0) {
    systemPrompt += "## Behavior Guidelines\n";
    behaviorToggles.forEach((behavior) => {
      systemPrompt += `- ${behavior}\n`;
    });
    systemPrompt += "\n";
  }

  return systemPrompt || "You are a helpful gaming coach. Provide clear, actionable advice to help players improve.";
}

Deno.serve(async (req: Request) => {
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  try {
    const supabaseUrl = Deno.env.get("SUPABASE_URL")!;
    const supabaseServiceKey = Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!;
    const openaiApiKey = Deno.env.get("OPENAI_API_KEY");

    if (!openaiApiKey) {
      return new Response(
        JSON.stringify({ error: "OpenAI API key not configured" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    const { message, game_id, session_id, user_id, conversation_history } = payload;

    if (!message || !game_id) {
      return new Response(
        JSON.stringify({ error: "Missing required fields: message, game_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: configs, error: configError } = await supabase
      .from("coaching_ai_config")
      .select("*")
      .eq("game_id", game_id)
      .eq("is_active", true)
      .order("display_order", { ascending: true });

    if (configError) {
      console.error("Error fetching configs:", configError);
    }

    const systemPrompt = assembleSystemPrompt((configs as CoachingConfig[]) || []);

    const topicPriorities = (configs as CoachingConfig[] || [])
      .filter((c) => c.config_key === "topic_priority")
      .map((c) => c.config_value);
    const detectedTopics = detectTopics(message, topicPriorities);

    const messages: ChatMessage[] = [
      { role: "system", content: systemPrompt },
    ];

    if (conversation_history && conversation_history.length > 0) {
      messages.push(...conversation_history);
    }

    messages.push({ role: "user", content: message });

    const openaiResponse = await fetch("https://api.openai.com/v1/chat/completions", {
      method: "POST",
      headers: {
        "Authorization": `Bearer ${openaiApiKey}`,
        "Content-Type": "application/json",
      },
      body: JSON.stringify({
        model: "gpt-4o-mini",
        messages: messages,
        temperature: 0.7,
        max_tokens: 1000,
      }),
    });

    if (!openaiResponse.ok) {
      const errorData = await openaiResponse.text();
      console.error("OpenAI API error:", errorData);
      return new Response(
        JSON.stringify({ error: "Failed to get AI response" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const aiData = await openaiResponse.json();
    const aiMessage = aiData.choices?.[0]?.message?.content || "I'm sorry, I couldn't generate a response.";

    if (user_id) {
      const analyticsData: Record<string, unknown> = {
        user_id,
        game_id,
        question_text: message,
        detected_topics: detectedTopics,
        category: detectedTopics.length > 0 ? detectedTopics[0] : null,
      };

      if (session_id) {
        analyticsData.session_id = session_id;
      }

      const { error: analyticsError } = await supabase
        .from("coaching_question_analytics")
        .insert([analyticsData]);

      if (analyticsError) {
        console.error("Error logging analytics:", analyticsError);
      }
    }

    return new Response(
      JSON.stringify({
        message: aiMessage,
        detected_topics: detectedTopics,
        session_id: session_id || null,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in ai-coaching-chat:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});