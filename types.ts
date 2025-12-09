
export type Role = 'production' | 'director';

// 统一 'script' 和 'workbench' 为 'creation_center'，具体视图由内部状态控制
export type PageType = 'dashboard' | 'assets' | 'assets_detail' | 'creation_center';

export type WorkbenchMode = 'workbench_t2i' | 'workbench_i2v';

export interface User {
  role: Role;
}

export interface SubAsset {
  id: string;
  img: string;
  label: string; // e.g., 'Three View', 'Detail', 'Expression'
  description?: string;
  type: 'image';
}

export interface Asset {
  id: string;
  name: string;
  img: string;
  type: 'character' | 'scene' | 'prop';
  // Extended fields for AI Character consistency
  description?: string; 
  loraId?: string;
  subAssets?: SubAsset[];
}

export interface AssetCollection {
  characters: Asset[];
  scenes: Asset[];
  props: Asset[];
}

export interface Version {
  id: string;
  imgUrl: string;
  prompt: string;
  timestamp: number;
  isFavorite: boolean;
  type: 'image' | 'video';
  // Configuration snapshot for comparison
  model?: string;
  aspectRatio?: string;
  resolution?: string;
  duration?: string;
  referencedAssetIds?: string[];
}

export interface TaskAssets {
  char: Asset | null;
  scene: Asset | null;
  prop: Asset | null;
}

export interface TaskBreakdown {
  subject?: string;
  composition?: string;
  lighting?: string;
  mood?: string;
}

export type CameraMovement = string; // Relaxed from union type to support UI dropdowns

export interface Task {
  id: string;
  title: string;
  status: 'queued' | 'generating' | 'done' | 't2i_reject';
  script: string;
  assets: TaskAssets;
  prompt: string;
  versions: Version[];
  referenceImages?: string[];
  breakdown?: TaskBreakdown;
  duration?: string; 
  
  // Extended fields for Video Generation
  keyframeImage?: string; // Selected image to drive video generation
  referenceCharacterIds?: string[]; // IDs of characters in this shot
  referencedAssetIds?: string[]; // Generic list of all referenced assets (chars, scenes, props)
  actionDescription?: string; // Specific action prompt for I2V
  cameraMovement?: CameraMovement; 

  // New fields for Storyboard Redesign
  shotNumber?: string; // Custom shot number (e.g. "1A")
  cameraAngle?: string; // e.g. "Eye-level", "Low Angle"
  sound?: string; // e.g. "SFX: Rain"

  // AI Extracted Tags for Asset Breakdown
  extractedTags?: {
    characters: string[];
    scenes: string[];
    props: string[];
  };
}

export interface Scene {
  id: string;
  title: string;
  content: string; 
  tasks: Task[];
}

export interface ScriptEpisode {
  id: string;
  title: string;
  content: string;
  scenes: Scene[];
  status: 'draft' | 'analyzed';
  lastAnalysisTime?: number;
  extractedAssets?: {
    characters: string[];
    scenes: string[];
    props: string[];
  };
}

export interface ScriptDraft {
  id: string;
  title: string;
  updatedAt: number;
  status: string;
  episodes: ScriptEpisode[];
}

export interface Project {
  id: string;
  name: string;
  status: string;
  type: string;
  cover: string;
  assets: AssetCollection;
  scenes: Scene[];
  scripts: ScriptDraft[];
}

export interface GenerationConfig {
  batchSize: number;
  aspectRatio: string;
  resolution: string;
}

// Updated I2V Types
export type VideoGenerationType = 'text_to_video' | 'image_to_video';

export interface I2VConfig {
  type: VideoGenerationType;
  duration: '2s' | '5s' | '8s';
  aspectRatio: string;
  resolution: string;
  model: string;
  motion: string;
  
  // I2V Specifics
  startFrameImage?: string | null;
  endFrameImage?: string | null;
  referenceImages?: string[]; // Multi-image reference
}

export interface BreakdownResult {
  episodes: Partial<ScriptEpisode & { assets: { characters: string[], scenes: string[], props: string[] } }>[];
}
