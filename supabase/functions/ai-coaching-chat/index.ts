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

const VALORANT_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Crosshair Placement": ["crosshair", "aim", "head level", "head height", "pre-aim", "preaim", "headshot"],
  "Agent Abilities and Utility Usage": ["ability", "abilities", "util", "utility", "smoke", "flash", "molly", "wall", "drone", "dart", "ult", "ultimate", "signature"],
  "Economy Management": ["eco", "economy", "save", "buy", "force", "bonus", "thrifty", "credits", "creds"],
  "Map Control and Site Takes": ["site", "execute", "take", "push", "entry", "default", "control", "map control"],
  "Communication and Callouts": ["callout", "comms", "communicate", "info", "call", "ping"],
  "Gunfight Mechanics": ["gunfight", "duel", "1v1", "aim", "spray", "burst", "tap", "strafe", "counter-strafe"],
  "Positioning and Angles": ["angle", "position", "positioning", "off-angle", "peek", "peeking", "hold", "post"],
  "Post-Plant Situations": ["post-plant", "post plant", "spike", "planted", "defuse", "clutch"],
  "Retake Strategies": ["retake", "re-take", "rotate", "rotation", "lurk"],
  "Team Composition": ["comp", "composition", "team comp", "duelist", "initiator", "controller", "sentinel"],
  "Mental Game and Consistency": ["tilt", "tilted", "mental", "focus", "consistency", "consistent", "frustrated"],
  "VOD Review and Self-Analysis": ["vod", "review", "replay", "analyze", "analysis", "improve", "mistake"],
};

const OVERWATCH2_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Hero Mechanics and Cooldowns": ["cooldown", "ability", "primary", "secondary", "passive", "mechanic", "mechanics"],
  "Ultimate Economy and Tracking": ["ult", "ultimate", "ult track", "ult economy", "ult charge", "ult advantage"],
  "Team Composition and Synergy": ["comp", "composition", "synergy", "team comp", "dive", "poke", "brawl", "rush"],
  "Positioning by Role": ["position", "positioning", "sightline", "high ground", "cover", "los", "line of sight"],
  "Objective Play and Timing": ["objective", "point", "payload", "cart", "contest", "touch", "overtime", "stall"],
  "Target Priority and Focus": ["focus", "target", "priority", "dive", "kill", "pick", "elim"],
  "Peeling and Support Awareness": ["peel", "peeling", "support", "heal", "healing", "save", "protect"],
  "Tank Space Creation": ["space", "tank", "frontline", "aggro", "pressure", "engage", "main tank", "off tank"],
  "DPS Flank and Angles": ["flank", "angle", "dps", "damage", "off-angle", "rotate"],
  "Map-Specific Strategies": ["map", "route", "choke", "spawn", "flank route"],
  "Counter-Picking and Swapping": ["counter", "swap", "switch", "counterpick", "counter-pick"],
  "Mental Game and Adaptation": ["tilt", "tilted", "mental", "adapt", "adaptation", "frustrated", "focus"],
};

const ROCKETLEAGUE_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Car Control and Recovery": ["car control", "recovery", "flip", "powerslide", "half-flip", "half flip", "wavedash", "wave dash", "landing"],
  "Boost Management": ["boost", "small pad", "big boost", "100 boost", "starve", "boost starve", "pad"],
  "Rotation and Positioning": ["rotation", "rotate", "position", "positioning", "back post", "far post", "shadow", "third man", "last man"],
  "Aerial Mechanics": ["aerial", "aerials", "air", "flying", "fast aerial", "double jump", "air roll"],
  "Ground Plays and Power Shots": ["ground", "power shot", "powershot", "50/50", "fifty", "dribble", "flick", "shot"],
  "Defense and Shadow Defense": ["defense", "defend", "shadow", "shadow defense", "challenge", "block", "save"],
  "Kickoffs": ["kickoff", "kick-off", "kick off", "faceoff", "face-off"],
  "Team Play and Passing": ["pass", "passing", "team play", "teamplay", "assist", "infield", "backboard"],
  "Game Sense and Reading Play": ["read", "reading", "game sense", "predict", "prediction", "anticipate"],
  "Advanced Mechanics (Flip Resets, Air Dribbles, etc.)": ["flip reset", "reset", "air dribble", "ceiling", "ceiling shot", "musty", "breezi", "double tap"],
  "Mode-Specific Strategy (1v1, 2v2, 3v3)": ["1v1", "1s", "2v2", "2s", "3v3", "3s", "ones", "twos", "threes", "solo", "duos"],
  "Mental Game and Consistency": ["tilt", "tilted", "mental", "focus", "consistency", "consistent", "frustrated", "ranked anxiety"],
};

const CS2_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Crosshair Placement": ["crosshair", "aim", "headshot", "pre-aim", "preaim", "head level"],
  "Spray Control and Recoil": ["spray", "recoil", "pattern", "burst", "tap", "spray control", "spray pattern"],
  "Economy and Buy Decisions": ["eco", "economy", "save", "buy", "force", "force buy", "full buy", "half buy", "bonus"],
  "Utility Usage (Smokes, Flashes, Molotovs)": ["smoke", "flash", "molotov", "molly", "nade", "grenade", "he", "utility", "util", "lineup"],
  "Map Knowledge and Callouts": ["callout", "map", "position", "spot", "angle", "mirage", "dust2", "inferno", "nuke", "anubis", "ancient", "vertigo"],
  "Positioning and Angles": ["angle", "position", "positioning", "off-angle", "peek", "peeking", "hold", "post", "site"],
  "Movement and Counter-Strafing": ["movement", "counter-strafe", "counterstrafe", "strafe", "jiggle", "jiggle peek", "bunny hop", "bhop"],
  "Trade Fragging and Teamplay": ["trade", "trading", "refrag", "teamplay", "team play", "support", "flash for"],
  "Site Executes and Retakes": ["execute", "exec", "retake", "take", "site take", "plant", "defuse", "clutch"],
  "AWP and Entry Fragging Roles": ["awp", "awper", "entry", "entry frag", "lurk", "lurker", "igl", "support", "rifler"],
  "Anti-Eco and Force Buy Rounds": ["anti-eco", "anti eco", "force", "force buy", "pistol", "pistol round", "bonus round"],
  "Mental Game and Consistency": ["tilt", "tilted", "mental", "focus", "consistency", "consistent", "frustrated", "toxic"],
};

const APEX_TOPIC_KEYWORDS: Record<string, string[]> = {
  "Movement Mechanics": ["slide", "jump", "tap strafe", "tap-strafe", "wall bounce", "bunny hop", "bhop", "super glide", "superglide", "movement"],
  "Legend Abilities and Synergy": ["tactical", "ultimate", "passive", "ability", "legend", "synergy", "combo", "ult"],
  "Positioning and High Ground": ["position", "positioning", "high ground", "height", "cover", "rotation", "rotate"],
  "Gun Skill and Recoil Control": ["aim", "recoil", "spray", "hipfire", "ads", "tracking", "flick", "beam"],
  "Loot Priority and Inventory Management": ["loot", "inventory", "shield", "armor", "attachment", "ammo", "meds", "heal", "backpack"],
  "Ring Rotation and Zone Play": ["ring", "zone", "rotate", "rotation", "circle", "storm", "edge", "center"],
  "Third-Party Awareness": ["third party", "third-party", "3rd party", "ape", "aping", "push", "disengage", "reset"],
  "Team Composition": ["comp", "composition", "team comp", "assault", "skirmisher", "recon", "support", "controller"],
  "Armor Swapping and Fight Reset": ["armor swap", "shield swap", "swap", "reset", "bat", "battery", "cell", "med kit", "syringe"],
  "Drop Spots and Early Game": ["drop", "landing", "hot drop", "cold drop", "loot", "early game", "spawn"],
  "End Game and Final Circles": ["end game", "endgame", "final ring", "final circle", "last ring", "placement", "rp"],
  "Mental Game and Consistency": ["tilt", "tilted", "mental", "focus", "consistency", "consistent", "frustrated", "ranked"],
};

const GAME_ID_TO_KEYWORDS: Record<string, Record<string, string[]>> = {
  "614e99e6-40b0-48e6-9dcd-d8c3f1981f52": LOL_TOPIC_KEYWORDS,
  "ab74ea87-6563-4448-bf84-e37c5c39275a": VALORANT_TOPIC_KEYWORDS,
  "67da1904-004d-472c-8f37-32f0350ce53e": OVERWATCH2_TOPIC_KEYWORDS,
  "7759f604-0199-4c42-8a04-81c9b10978b2": ROCKETLEAGUE_TOPIC_KEYWORDS,
  "dad78506-9cc6-4bcb-b488-f87007702342": CS2_TOPIC_KEYWORDS,
  "44d38835-4666-4a02-8eb4-25589a88ebd8": APEX_TOPIC_KEYWORDS,
};

function detectTopics(message: string, topicPriorities: string[], gameId: string): string[] {
  const lowerMessage = message.toLowerCase();
  const detectedTopics: string[] = [];
  const keywordMap = GAME_ID_TO_KEYWORDS[gameId] || {};

  for (const topic of topicPriorities) {
    const keywords = keywordMap[topic];
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
    const detectedTopics = detectTopics(message, topicPriorities, game_id);

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