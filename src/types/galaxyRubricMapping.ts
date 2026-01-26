export interface GalaxyRubricMapping {
  id: string;
  project_config_id: string;
  game_id: string;
  rubric_id: string;
  rubric_name?: string | null;
  created_at: string;
  updated_at: string;
}

export interface CreateGalaxyRubricMappingData {
  project_config_id: string;
  game_id: string;
  rubric_id: string;
  rubric_name?: string;
}

export interface Game {
  id: string;
  name: string;
  publisher: string | null;
  image_url: string | null;
}

export interface GalaxyRubric {
  id: string;
  name: string;
  description?: string;
}

export interface GalaxyCampaignRubricsResponse {
  success: boolean;
  data: {
    rubrics: GalaxyRubric[];
  };
  error?: string;
}

export interface GameWithMappings {
  id: string;
  name: string;
  publisher: string | null;
  image_url: string | null;
  mapping_count: number;
  mappings: GalaxyRubricMapping[];
}
