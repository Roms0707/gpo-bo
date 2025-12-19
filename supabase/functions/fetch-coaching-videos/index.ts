import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface GameContent {
  id: string;
  game_id: string;
  title: string;
  description: string | null;
  content_type: string;
  content_url: string;
  playlist_image_url: string | null;
  theme_label: string | null;
  duration: number | null;
  created_at: string;
}

interface VideoRecommendation {
  id: string;
  title: string;
  description: string | null;
  content_url: string;
  thumbnail_url: string | null;
  duration: number | null;
  matched_topics: string[];
  relevance_score: number;
  reason: string;
}

interface RequestPayload {
  game_id: string;
  topics?: string[];
  session_id?: string;
  limit?: number;
}

const LOL_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Farming / CS": ["cs", "farm", "farming", "minion", "last hit", "gold", "creep"],
  "Wave Management": ["wave", "freeze", "slow push", "fast push", "crash", "bounce", "minion wave"],
  "Trading and Lane Pressure": ["trade", "trading", "poke", "harass", "lane pressure", "all-in"],
  "Vision Control and Warding": ["ward", "warding", "vision", "control ward", "pink ward", "sweeper"],
  "Map Awareness and Roaming": ["roam", "roaming", "map", "rotation", "gank", "ganking", "river"],
  "Teamfighting": ["teamfight", "team fight", "5v5", "engage", "peel", "frontline", "positioning"],
  "Objective Control": ["dragon", "baron", "herald", "objective", "tower", "turret"],
  "Champion Matchups": ["matchup", "counter", "counterpick", "vs", "against"],
  "Itemization and Builds": ["item", "build", "mythic", "legendary", "boots", "rune"],
  "Macro Decision Making": ["macro", "split push", "side lane", "win condition", "strategy"],
  "Mental Game and Tilt Management": ["tilt", "mental", "focus", "mindset", "improve"],
};

function matchVideoToTopics(video: GameContent, topics: string[]): { matched: string[]; score: number } {
  const titleLower = video.title.toLowerCase();
  const descLower = (video.description || "").toLowerCase();
  const themeLower = (video.theme_label || "").toLowerCase();
  const combined = `${titleLower} ${descLower} ${themeLower}`;

  const matched: string[] = [];
  let score = 0;

  for (const topic of topics) {
    const keywords = LOL_TOPIC_KEYWORDS[topic];
    if (keywords) {
      for (const keyword of keywords) {
        if (combined.includes(keyword)) {
          matched.push(topic);
          score += titleLower.includes(keyword) ? 3 : 1;
          break;
        }
      }
    }
  }

  return { matched, score };
}

function generateReason(matchedTopics: string[], videoTitle: string): string {
  if (matchedTopics.length === 0) {
    return "General coaching content for your game.";
  }
  if (matchedTopics.length === 1) {
    return `This video covers ${matchedTopics[0]}, which is relevant to your question.`;
  }
  const topicsStr = matchedTopics.slice(0, -1).join(", ") + " and " + matchedTopics[matchedTopics.length - 1];
  return `This video covers ${topicsStr}, addressing multiple aspects of your question.`;
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

    const supabase = createClient(supabaseUrl, supabaseServiceKey);

    const payload: RequestPayload = await req.json();
    const { game_id, topics = [], session_id, limit = 5 } = payload;

    if (!game_id) {
      return new Response(
        JSON.stringify({ error: "Missing required field: game_id" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const { data: videos, error: videosError } = await supabase
      .from("game_contents")
      .select("*")
      .eq("game_id", game_id)
      .in("content_type", ["video", "playlist"])
      .order("created_at", { ascending: false });

    if (videosError) {
      console.error("Error fetching videos:", videosError);
      return new Response(
        JSON.stringify({ error: "Failed to fetch videos" }),
        {
          status: 500,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    const allTopics = topics.length > 0 ? topics : Object.keys(LOL_TOPIC_KEYWORDS);

    const scoredVideos: VideoRecommendation[] = ((videos as GameContent[]) || []).map((video) => {
      const { matched, score } = matchVideoToTopics(video, allTopics);
      return {
        id: video.id,
        title: video.title,
        description: video.description,
        content_url: video.content_url,
        thumbnail_url: video.playlist_image_url,
        duration: video.duration,
        matched_topics: matched,
        relevance_score: score,
        reason: generateReason(matched, video.title),
      };
    });

    scoredVideos.sort((a, b) => b.relevance_score - a.relevance_score);

    const recommendations = scoredVideos.slice(0, limit);

    if (session_id && recommendations.length > 0) {
      const recommendationRecords = recommendations.map((rec) => ({
        session_id,
        content_id: rec.id,
        reason: rec.reason,
        was_watched: false,
      }));

      const { error: insertError } = await supabase
        .from("coaching_content_recommendations")
        .insert(recommendationRecords);

      if (insertError) {
        console.error("Error storing recommendations:", insertError);
      }
    }

    return new Response(
      JSON.stringify({
        recommendations,
        total_videos: videos?.length || 0,
        topics_searched: allTopics,
      }),
      {
        status: 200,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("Error in fetch-coaching-videos:", error);
    return new Response(
      JSON.stringify({ error: "Internal server error" }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});