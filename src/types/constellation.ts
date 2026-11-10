/**
 * Constellation Persona Specification (v0.1.0)
 * Specification schema: urn:constellation-persona:spec:constellation-persona-spec:0.1.0
 */

export interface ConstellationPersona {
  id: string;
  name: string;
  tagline: string;
  contextIngestionMandates?: string[];
  systemManager?: {
    description?: string;
    authority?: string;
  };
  sourceAuthority?: {
    sourceCharacter?: string;
    sourceTimePeriod?: string;
    sourceUniverse?: string;
    primeDirective?: string;
  };
  systemAuthority?: {
    system?: string;
    systemVersion?: string;
    systemRecord?: Record<string, any>;
  };
  personality: {
    archetype: string;
    shadowArchetype: string;
    ego: {
      description?: string;
      currentGoal?: string;
    };
    shadow?: {
      dominantAspect?: {
        name: string;
        description: string;
        strength: number;
      };
      aspects?: Array<{
        name: string;
        description: string;
      }>;
    };
    emotionMon?: {
      state?: string;
      tensionLevel?: number; // 0 to 100
    };
    emotionalMerits?: string[];
    emotionalFlaws?: string[];
    emotionalScars?: string[];
  };
  spiritu: {
    core?: string;
    morality?: {
      moralCode: string[];
      beliefs: string[];
    };
    virtues?: Array<{
      name: string; // e.g., 'love', 'faithfulness', 'patience', 'gentleness'
      strength: number;
      description?: string;
    }>;
    vices?: Array<{
      name: string; // e.g., 'pride', 'wrath', 'greed', 'sloth'
      strength: number;
      description?: string;
    }>;
    self?: string;
    compassion?: string;
  };
  mentam: {
    merimna: {
      activeConcerns: string[]; // Unresolved problems and dilemmas being turned over
      processingSpiders?: string[];
    };
    mind?: {
      intellectStyle: string;
      overclockActive?: boolean;
    };
    skills?: string[];
    noticePreferences?: string;
    creativeSpark?: string;
    misapprehensions?: string[];
  };
  corpus: {
    appearance: string;
    wardrobe: string;
    inventory: string[];
    purse?: string;
    locus: string; // Exact current physical location and position in scene
    bodyState?: {
      health: string;
      wounds?: string[];
      fatigueLevel?: number; // 0 to 100
    };
  };
  janus: {
    relationshipWithPlayer: {
      trustLevel: number; // 0 to 100
      socialDynamic: string; // e.g., 'Cautious contractor', 'Loyal confidant'
      recentShifts?: string;
      notes?: string;
    };
  };
  voice: {
    tone: string;
    accent: string;
    vocabulary: string;
    microexpressions: string[];
    behaviors: string[];
    kinetics: string[];
  };
  record?: {
    longTermMemories?: string[];
    shortTermMemories?: string[];
    downtimeActivities?: string[];
  };
}
