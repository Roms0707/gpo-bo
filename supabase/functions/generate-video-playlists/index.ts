import "jsr:@supabase/functions-js/edge-runtime.d.ts";
import { createClient } from "npm:@supabase/supabase-js@2.39.7";

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization, X-Client-Info, Apikey",
};

interface KeywordMapping {
  id: string;
  playlist_name: string;
  category: string;
  keywords: string[];
  priority: number;
  description_template: string | null;
  is_active: boolean;
}

interface VideoContent {
  id: string;
  title: string;
  description: string | null;
  game_id: string;
  playlist_image_url: string | null;
  duration: number | null;
  theme_label: string | null;
  created_at: string;
}

interface PlaylistMatch {
  mapping: KeywordMapping;
  matchedKeywords: string[];
  score: number;
}

function normalizeText(text: string): string {
  return text
    .toLowerCase()
    .normalize("NFD")
    .replace(/[\u0300-\u036f]/g, "")
    .replace(/[^a-z0-9\s]/g, " ")
    .replace(/\s+/g, " ")
    .trim();
}

function findBestPlaylistMatch(
  video: VideoContent,
  mappings: KeywordMapping[]
): PlaylistMatch | null {
  const titleNormalized = normalizeText(video.title);
  const descNormalized = video.description ? normalizeText(video.description) : "";
  const themeLabelNormalized = video.theme_label ? normalizeText(video.theme_label) : "";
  const combinedText = `${titleNormalized} ${descNormalized} ${themeLabelNormalized}`;

  let bestMatch: PlaylistMatch | null = null;

  for (const mapping of mappings) {
    if (!mapping.is_active) continue;
    if (mapping.keywords.length === 0) continue;

    const matchedKeywords: string[] = [];
    let score = 0;

    for (const keyword of mapping.keywords) {
      const keywordNormalized = normalizeText(keyword);

      if (titleNormalized.includes(keywordNormalized)) {
        matchedKeywords.push(keyword);
        score += 10;
      } else if (combinedText.includes(keywordNormalized)) {
        matchedKeywords.push(keyword);
        score += 5;
      }
    }

    if (matchedKeywords.length > 0) {
      score += mapping.priority;

      if (!bestMatch || score > bestMatch.score) {
        bestMatch = {
          mapping,
          matchedKeywords,
          score
        };
      }
    }
  }

  return bestMatch;
}

function extractVideoPosition(title: string): number {
  const patterns = [
    /(?:part|partie|episode|ep|épisode)\s*(\d+)/i,
    /(?:#|n°|num|numero)\s*(\d+)/i,
    /^(\d+)\s*[.\-:]/,
    /\s(\d+)\s*$/,
  ];

  for (const pattern of patterns) {
    const match = title.match(pattern);
    if (match) {
      return parseInt(match[1], 10);
    }
  }

  return 0;
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

    const { game_id } = await req.json();

    if (!game_id) {
      return new Response(
        JSON.stringify({ success: false, error: "game_id is required" }),
        {
          status: 400,
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[generate-video-playlists] Generating playlists for game: ${game_id}`);

    const { data: mappings, error: mappingsError } = await supabase
      .from("playlist_keyword_mappings")
      .select("*")
      .eq("is_active", true)
      .order("priority", { ascending: false });

    if (mappingsError) {
      console.error("Error fetching keyword mappings:", mappingsError);
      throw new Error("Failed to fetch keyword mappings");
    }

    const { data: videos, error: videosError } = await supabase
      .from("game_contents")
      .select("id, title, description, game_id, playlist_image_url, duration, theme_label, created_at")
      .eq("game_id", game_id)
      .eq("content_type", "video")
      .order("created_at", { ascending: true });

    if (videosError) {
      console.error("Error fetching videos:", videosError);
      throw new Error("Failed to fetch videos");
    }

    if (!videos || videos.length === 0) {
      console.log(`[generate-video-playlists] No videos found for game: ${game_id}`);
      return new Response(
        JSON.stringify({
          success: true,
          message: "No videos found for this game",
          playlists_created: 0,
          videos_assigned: 0
        }),
        {
          headers: { ...corsHeaders, "Content-Type": "application/json" },
        }
      );
    }

    console.log(`[generate-video-playlists] Found ${videos.length} videos to categorize`);

    const playlistAssignments: Map<string, {
      mapping: KeywordMapping;
      videos: Array<{ video: VideoContent; position: number }>
    }> = new Map();

    const uncategorizedVideos: VideoContent[] = [];

    for (const video of videos) {
      const match = findBestPlaylistMatch(video, mappings as KeywordMapping[]);

      if (match) {
        const playlistKey = match.mapping.playlist_name;

        if (!playlistAssignments.has(playlistKey)) {
          playlistAssignments.set(playlistKey, {
            mapping: match.mapping,
            videos: []
          });
        }

        const position = extractVideoPosition(video.title);
        playlistAssignments.get(playlistKey)!.videos.push({ video, position });
      } else {
        uncategorizedVideos.push(video);
      }
    }

    if (uncategorizedVideos.length > 0) {
      const generalMapping = (mappings as KeywordMapping[]).find(
        m => m.playlist_name === "General Training"
      );

      if (generalMapping) {
        playlistAssignments.set("General Training", {
          mapping: generalMapping,
          videos: uncategorizedVideos.map((video, index) => ({ video, position: index + 1 }))
        });
      }
    }

    const { error: deletePlaylistsError } = await supabase
      .from("video_playlists")
      .delete()
      .eq("game_id", game_id)
      .eq("is_auto_generated", true);

    if (deletePlaylistsError) {
      console.error("Error deleting old playlists:", deletePlaylistsError);
    }

    let playlistsCreated = 0;
    let videosAssigned = 0;
    const createdPlaylists: Array<{ name: string; video_count: number; category: string }> = [];

    let sortOrder = 0;
    for (const [playlistName, assignment] of playlistAssignments) {
      if (assignment.videos.length === 0) continue;

      assignment.videos.sort((a, b) => {
        if (a.position !== 0 && b.position !== 0) {
          return a.position - b.position;
        }
        if (a.position !== 0) return -1;
        if (b.position !== 0) return 1;
        return new Date(a.video.created_at).getTime() - new Date(b.video.created_at).getTime();
      });

      const firstVideo = assignment.videos[0].video;
      const thumbnailUrl = firstVideo.playlist_image_url;

      const { data: newPlaylist, error: playlistError } = await supabase
        .from("video_playlists")
        .insert({
          game_id,
          name: playlistName,
          description: assignment.mapping.description_template,
          thumbnail_url: thumbnailUrl,
          category: assignment.mapping.category,
          sort_order: sortOrder++,
          is_auto_generated: true,
          keywords: assignment.mapping.keywords
        })
        .select("id")
        .single();

      if (playlistError) {
        console.error(`Error creating playlist ${playlistName}:`, playlistError);
        continue;
      }

      const playlistVideos = assignment.videos.map((item, index) => ({
        playlist_id: newPlaylist.id,
        content_id: item.video.id,
        position: index + 1
      }));

      const { error: videosInsertError } = await supabase
        .from("playlist_videos")
        .insert(playlistVideos);

      if (videosInsertError) {
        console.error(`Error inserting videos for playlist ${playlistName}:`, videosInsertError);
        continue;
      }

      playlistsCreated++;
      videosAssigned += assignment.videos.length;
      createdPlaylists.push({
        name: playlistName,
        video_count: assignment.videos.length,
        category: assignment.mapping.category
      });

      console.log(`[generate-video-playlists] Created playlist "${playlistName}" with ${assignment.videos.length} videos`);
    }

    console.log(`[generate-video-playlists] Completed. Created ${playlistsCreated} playlists with ${videosAssigned} videos total`);

    return new Response(
      JSON.stringify({
        success: true,
        message: `Successfully generated ${playlistsCreated} playlists`,
        playlists_created: playlistsCreated,
        videos_assigned: videosAssigned,
        playlists: createdPlaylists
      }),
      {
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  } catch (error) {
    console.error("[generate-video-playlists] Error:", error);

    return new Response(
      JSON.stringify({
        success: false,
        error: error instanceof Error ? error.message : "Unknown error occurred"
      }),
      {
        status: 500,
        headers: { ...corsHeaders, "Content-Type": "application/json" },
      }
    );
  }
});
