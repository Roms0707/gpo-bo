import { serve } from "https://deno.land/std@0.168.0/http/server.ts";
import { createClient } from "https://esm.sh/@supabase/supabase-js@2.39.7";

interface GalaxyContent {
  content_id: string | number;
  title: string;
  description: string;
  duration?: number;
  theme_label?: string;
  product_year?: number;
  product_country?: string[];
  content_type: string;
  content_type_tech_label: string;
  assets?: {
    cover?: Array<{
      url: string;
      ratio_tech_label: string;
    }>;
  };
  deliveries?: {
    mainDelivery?: {
      url: string;
      duration: number;
      resolution?: string;
    };
    stream?: {
      [quality: string]: Array<{
        url: string;
        duration: number;
        resolution?: string;
      }>;
    };
    additionalDeliveries?: Array<{
      url: string;
      duration: number;
      resolution?: string;
    }>;
  };
}

interface RubricGameMapping {
  rubric_id: string;
  game_id: string;
}

const corsHeaders = {
  "Access-Control-Allow-Origin": "*",
  "Access-Control-Allow-Methods": "GET, POST, PUT, DELETE, OPTIONS",
  "Access-Control-Allow-Headers": "Content-Type, Authorization",
};

serve(async (req) => {
  // Handle CORS
  if (req.method === "OPTIONS") {
    return new Response(null, {
      status: 200,
      headers: corsHeaders,
    });
  }

  // Initialize Supabase client
  const supabase = createClient(
    Deno.env.get("SUPABASE_URL")!,
    Deno.env.get("SUPABASE_SERVICE_ROLE_KEY")!
  );

  try {
    console.log("[Galaxy Sync] Function started - Starting Galaxy content synchronization");

    // Fetch Galaxy API configuration from the database
    let galaxyApiConfig;
    try {
      console.log("[Galaxy Sync] Fetching Galaxy API configuration from database...");
      const { data, error } = await supabase
        .from('platform_api_integrations')
        .select('api_key, api_url')
        .eq('api_name', 'Galaxy API')
        .eq('is_active', true)
        .single();

      if (error || !data) {
        console.error("[Galaxy Sync] Error fetching Galaxy API config from DB:", error?.message || "Config not found");
        throw new Error("Galaxy API configuration not found or incomplete in database.");
      }
      galaxyApiConfig = data;
      console.log("[Galaxy Sync] Galaxy API config fetched from DB successfully");
    } catch (err) {
      console.error("[Galaxy Sync] Critical error during config fetch:", err.message, err.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Failed to load Galaxy API config: ${err.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    let galaxyCredentials;
    try {
      console.log("[Galaxy Sync] Parsing Galaxy API credentials...");
      if (!galaxyApiConfig.api_key) {
        throw new Error("API key is null or empty in database config.");
      }
      galaxyCredentials = JSON.parse(galaxyApiConfig.api_key);
      console.log("[Galaxy Sync] Galaxy API credentials parsed successfully");
    } catch (parseError) {
      console.error("[Galaxy Sync] Error parsing Galaxy API credentials (check format in DB):", parseError.message, parseError.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Invalid Galaxy API credentials format: ${parseError.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    const galaxyConfig = {
      api_key: galaxyCredentials.api_key,
      api_secret_key: galaxyCredentials.api_secret_key,
      campaign_id: galaxyCredentials.campaign_id,
      service_id: galaxyCredentials.service_id,
      country_code: galaxyCredentials.country_code,
      language_code: galaxyCredentials.language_code,
      base_url: galaxyApiConfig.api_url
    };

    // Validate essential credentials
    if (!galaxyConfig.api_key || !galaxyConfig.api_secret_key || !galaxyConfig.campaign_id || !galaxyConfig.service_id || !galaxyConfig.country_code || !galaxyConfig.language_code || !galaxyConfig.base_url) {
      console.error("[Galaxy Sync] Missing essential Galaxy API credentials after parsing.");
      return new Response(
        JSON.stringify({ success: false, error: "Missing essential Galaxy API credentials." }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    console.log("[Galaxy Sync] Galaxy API configuration loaded and validated successfully");

    // Helper function to get base authentication parameters
    const getBaseParams = (): URLSearchParams => {
      const params = new URLSearchParams();
      params.append('api_key', galaxyConfig.api_key!);
      params.append('api_secret_key', galaxyConfig.api_secret_key!);
      params.append('campaign_id', galaxyConfig.campaign_id!);
      params.append('service_id', galaxyConfig.service_id!);
      params.append('country_code', galaxyConfig.country_code!);
      params.append('language_code', galaxyConfig.language_code!);
      return params;
    };

    // Helper function to extract video URL from content
    const getVideoUrl = (content: GalaxyContent): string => {
      // Helper to check if URL is a valid HLS stream
      const isHlsUrl = (url: string): boolean => {
        return url.toLowerCase().includes('.m3u8') || 
               url.toLowerCase().includes('manifest') ||
               url.toLowerCase().includes('playlist');
      };

      // Helper to check if URL is a direct video file
      const isDirectVideoUrl = (url: string): boolean => {
        const videoExtensions = ['.mp4', '.webm', '.ogg', '.mov', '.avi'];
        return videoExtensions.some(ext => url.toLowerCase().includes(ext));
      };

      // Collect all possible URLs with their priorities
      const urlCandidates: Array<{ url: string; priority: number; source: string }> = [];

      // Priority 1: Main delivery URL
      if (content.deliveries?.mainDelivery?.url) {
        const url = content.deliveries.mainDelivery.url;
        let priority = 1;
        if (isHlsUrl(url)) priority = 0; // Highest priority for HLS
        else if (isDirectVideoUrl(url)) priority = 1;
        else priority = 2;
        urlCandidates.push({ url, priority, source: 'mainDelivery' });
      }
      
      // Priority 2: Stream with highest quality
      if (content.deliveries?.stream) {
        const qualityPriority = ['VHD (1080p)', 'HD (720p)', 'SD (480p)'];
        
        for (const quality of qualityPriority) {
          const streamUrls = content.deliveries.stream[quality];
          if (Array.isArray(streamUrls)) {
            streamUrls.forEach((stream, index) => {
              if (stream?.url) {
                let priority = 3 + index; // Base priority for streams
                if (isHlsUrl(stream.url)) priority = 0; // Highest priority for HLS
                else if (isDirectVideoUrl(stream.url)) priority = 1;
                urlCandidates.push({ 
                  url: stream.url, 
                  priority, 
                  source: `stream-${quality}-${index}` 
                });
              }
            });
          }
        }
      }
      
      // Priority 3: Any delivery in additionalDeliveries
      if (Array.isArray(content.deliveries?.additionalDeliveries) && 
          content.deliveries.additionalDeliveries.length > 0) {
        content.deliveries.additionalDeliveries.forEach((delivery, index) => {
          if (delivery?.url) {
            let priority = 4 + index; // Lower priority for additional deliveries
            if (isHlsUrl(delivery.url)) priority = 0; // Highest priority for HLS
            else if (isDirectVideoUrl(delivery.url)) priority = 1;
            urlCandidates.push({ 
              url: delivery.url, 
              priority, 
              source: `additionalDelivery-${index}` 
            });
          }
        });
      }
      
      // Sort by priority (lower number = higher priority) and return the best URL
      if (urlCandidates.length > 0) {
        urlCandidates.sort((a, b) => a.priority - b.priority);
        const selectedUrl = urlCandidates[0];
        console.log(`[Galaxy Sync] Selected URL for content ${content.content_id}: ${selectedUrl.url} (source: ${selectedUrl.source}, priority: ${selectedUrl.priority})`);
        return selectedUrl.url;
      }

      console.warn('[Galaxy Sync] No valid video URL found for content:', content.content_id);
      return '';
    };

    // Helper function to get cover image URL
    const getCoverImageUrl = (content: GalaxyContent): string => {
      if (!content.assets?.cover || content.assets.cover.length === 0) {
        return '';
      }

      // Prefer landscape images for video thumbnails
      const landscapeImage = content.assets.cover.find(
        cover => cover.ratio_tech_label === 'landscape-16-9'
      );
      
      if (landscapeImage) {
        return landscapeImage.url;
      }

      // Fallback to first available image
      return content.assets.cover[0].url;
    };

    let totalSynced = 0;
    let totalErrors = 0;
    let totalDeleted = 0;

    // Fetch rubric-game mappings from the database
    let rubricGameMappings;
    try {
      console.log("[Galaxy Sync] Fetching rubric-game mappings from database...");
      const { data, error } = await supabase
        .from('galaxy_rubric_mappings')
        .select('rubric_id, game_id');
      
      if (error) {
        throw error;
      }
      
      rubricGameMappings = data;
      console.log(`[Galaxy Sync] Fetched ${rubricGameMappings?.length || 0} rubric-game mappings from database`);
      
      if (!rubricGameMappings || rubricGameMappings.length === 0) {
        console.warn("[Galaxy Sync] No rubric-game mappings found in database");
        return new Response(
          JSON.stringify({ 
            success: true, 
            message: "No rubric-game mappings found",
            stats: {
              total_synced: 0,
              total_errors: 0,
              total_deleted: 0,
              mappings_processed: 0
            }
          }),
          { status: 200, headers: { "Content-Type": "application/json", ...corsHeaders } }
        );
      }
    } catch (err) {
      console.error("[Galaxy Sync] Error fetching rubric-game mappings:", err.message, err.stack);
      return new Response(
        JSON.stringify({ success: false, error: `Error fetching rubric-game mappings: ${err.message}` }),
        { status: 500, headers: { "Content-Type": "application/json", ...corsHeaders } }
      );
    }

    for (const mapping of rubricGameMappings) {
      try {
        console.log(`[Galaxy Sync] Processing rubric ${mapping.rubric_id} for game ${mapping.game_id}`);

        // Delete existing content for this game_id + rubric_id combination before re-syncing
        // This preserves content from other rubrics when multiple rubrics share the same game_id
        console.log(`[Galaxy Sync] Deleting existing content for game ${mapping.game_id}, rubric ${mapping.rubric_id}`);
        const { count: deletedCount, error: deleteError } = await supabase
          .from('game_contents')
          .delete({ count: 'exact' })
          .eq('game_id', mapping.game_id)
          .eq('galaxy_rubric_id', mapping.rubric_id);

        if (deleteError) {
          console.error(`[Galaxy Sync] Error deleting existing content for game ${mapping.game_id}:`, deleteError.message, deleteError.stack);
          totalErrors++;
          continue;
        }

        const deleted = deletedCount || 0;
        totalDeleted += deleted;
        console.log(`[Galaxy Sync] Deleted ${deleted} existing content items for game ${mapping.game_id}`);

        // Prepare API request parameters
        const params = getBaseParams();
        params.append('rubric_id', mapping.rubric_id);
        params.append('asset', 'true');
        params.append('delivery', 'true');
        params.append('itemsPerPage', '50'); // Get more items per request

        // Call Galaxy API
        const apiUrl = `${galaxyConfig.base_url}/publishing-content-list?${params.toString()}`;
        console.log(`[Galaxy Sync] Calling Galaxy API: ${apiUrl}`);

        let response;
        try {
          response = await fetch(apiUrl, {
            method: 'GET',
            mode: 'cors',
            credentials: 'omit',
            headers: {
              'Accept': 'application/json'
            }
          });
          console.log(`[Galaxy Sync] Galaxy API response status for ${mapping.rubric_id}: ${response.status}`);
        } catch (fetchError) {
          console.error(`[Galaxy Sync] Fetch error for rubric ${mapping.rubric_id}:`, fetchError.message, fetchError.stack);
          totalErrors++;
          continue;
        }

        if (!response.ok) {
          const errorText = await response.text();
          console.error(`[Galaxy Sync] API request failed for rubric ${mapping.rubric_id}: ${response.status} - ${errorText}`);
          totalErrors++;
          continue;
        }

        let apiData;
        try {
          apiData = await response.json();
        } catch (jsonError) {
          console.error(`[Galaxy Sync] Error parsing JSON response for rubric ${mapping.rubric_id}:`, jsonError.message, jsonError.stack);
          totalErrors++;
          continue;
        }

        if (apiData.code !== 200) {
          console.error(`[Galaxy Sync] Galaxy API error for rubric ${mapping.rubric_id}:`, apiData.code, apiData.message);
          totalErrors++;
          continue;
        }

        const contents = apiData.data?.data || [];
        console.log(`[Galaxy Sync] Found ${contents.length} contents for rubric ${mapping.rubric_id}`);

        // Collect all content data for batch processing
        const gameContentDataArray = [];
        
        for (const content of contents) {
          try {
            const videoUrl = getVideoUrl(content);
            const imageUrl = getCoverImageUrl(content);

            if (!videoUrl) {
              console.warn(`[Galaxy Sync] Skipping content ${content.content_id} - no video URL found`);
              continue;
            }

            // Prepare data for Supabase
            const gameContentData = {
              game_id: mapping.game_id,
              title: content.title || 'Untitled',
              description: content.description || '',
              content_type: 'video', // Standardize to 'video' for our system
              content_url: videoUrl,
              playlist_image_url: imageUrl,
              galaxy_content_id: content.content_id.toString(),
              galaxy_rubric_id: mapping.rubric_id,
              duration: content.duration || content.deliveries?.mainDelivery?.duration || null,
              theme_label: content.theme_label || null,
              product_year: content.product_year || null,
              product_country: content.product_country ? content.product_country.join(',') : null,
              galaxy_content_type: content.content_type_tech_label || content.content_type || null,
              extra_data: {
                galaxy_data: {
                  content_id: content.content_id,
                  collection_title: content.collection_title,
                  parent_id: content.parent_id,
                  children_number: content.children_number,
                  display_order: content.display_order,
                  sales_mode: content.sales_mode || [],
                  extra_data: content.extra_data || {}
                }
              }
            };

            // Add to batch array instead of individual upsert
            gameContentDataArray.push(gameContentData);

          } catch (contentError) {
            console.error(`[Galaxy Sync] Error processing content ${content.content_id}:`, contentError.message, contentError.stack);
            totalErrors++;
          }
        }

        // Perform batch upsert for all content items at once
        if (gameContentDataArray.length > 0) {
          console.log(`[Galaxy Sync] Performing batch upsert of ${gameContentDataArray.length} items for game ${mapping.game_id}`);
          
          try {
            const { error: batchUpsertError } = await supabase
              .from('game_contents')
              .upsert(gameContentDataArray, {
                onConflict: 'game_id,galaxy_content_id',
                ignoreDuplicates: false
              });

            if (batchUpsertError) {
              console.error(`[Galaxy Sync] Error in batch upsert for game ${mapping.game_id}:`, batchUpsertError.message, batchUpsertError.stack);
              totalErrors += gameContentDataArray.length;
            } else {
              console.log(`[Galaxy Sync] Successfully batch synced ${gameContentDataArray.length} contents for game ${mapping.game_id}`);
              totalSynced += gameContentDataArray.length;
            }
          } catch (upsertError) {
            console.error(`[Galaxy Sync] Exception during batch upsert for game ${mapping.game_id}:`, upsertError.message, upsertError.stack);
            totalErrors += gameContentDataArray.length;
          }
        } else {
          console.log(`[Galaxy Sync] No valid content to upsert for game ${mapping.game_id}`);
        }

      } catch (mappingError) {
        console.error(`[Galaxy Sync] Error processing mapping ${mapping.rubric_id}:`, mappingError.message, mappingError.stack);
        totalErrors++;
      }
    }

    console.log(`[Galaxy Sync] Synchronization completed. Synced: ${totalSynced}, Errors: ${totalErrors}, Deleted: ${totalDeleted}`);

    return new Response(
      JSON.stringify({ 
        success: true, 
        message: `Galaxy content synchronization completed`,
        stats: {
          total_synced: totalSynced,
          total_errors: totalErrors,
          total_deleted: totalDeleted,
          mappings_processed: (rubricGameMappings || []).length
        }
      }),
      {
        status: 200,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );

  } catch (error) {
    console.error("[Galaxy Sync] Uncaught error in sync-galaxy-content function:", error.message, error.stack);
    return new Response(
      JSON.stringify({ success: false, error: `Internal server error: ${error.message}` }),
      {
        status: 500,
        headers: {
          "Content-Type": "application/json",
          ...corsHeaders,
        },
      }
    );
  }
});