export type RubricScope = 'game' | 'project';

export type ContentCategory = 'tips' | 'masterclass' | 'grind_zone' | 'article';

export const CONTENT_CATEGORIES: { id: ContentCategory; label: string }[] = [
  { id: 'tips', label: 'Tips' },
  { id: 'masterclass', label: 'Masterclasses' },
  { id: 'grind_zone', label: 'Grind Zone' },
  { id: 'article', label: 'Articles' },
];

export interface GalaxyRubricMapping {
  id: string;
  project_config_id: string;
  game_id: string | null;
  rubric_id: string;
  rubric_name?: string | null;
  scope: RubricScope;
  content_category: ContentCategory;
  display_on_frontend: boolean;
  created_at: string;
  updated_at: string;
}

export interface CreateGalaxyRubricMappingData {
  project_config_id: string;
  game_id?: string | null;
  rubric_id: string;
  rubric_name?: string;
  scope: RubricScope;
  content_category: ContentCategory;
  display_on_frontend?: boolean;
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
  parent_rubric_id?: string | null;
  has_children?: boolean;
}

export interface RubricPageResult {
  rubrics: GalaxyRubric[];
  currentPage: number;
  hasMore: boolean;
}

export interface BreadcrumbItem {
  id: string;
  name: string;
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
