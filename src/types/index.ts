export interface Character {
  id: string;
  name: string;
  role: string;
  avatar: string;
  directives: string;
  tone: string;
  constraints: string;
  speechQuirks: string;
  greeting: string;
  suggestedPrompts: string[];
  linkedDocIds: string[];
  voicePitch?: number;
  voiceRate?: number;
  frameworkMode?: 'standard' | 'constellation';
  constellationPersona?: import('./constellation').ConstellationPersona;
  createdAt: number;
}

export interface LinkedDoc {
  id: string; // Google Docs document ID
  title: string;
  url: string;
  text: string;
  wordCount: number;
  charCount: number;
  fetchedAt: string;
  active: boolean;
  docUsageInstructions?: string;
  isSample?: boolean;
}

export interface DriveFile {
  id: string;
  name: string;
  modifiedTime: string;
  webViewLink?: string;
  iconLink?: string;
  size?: string;
}

export interface ChatMessage {
  id: string;
  role: 'user' | 'model';
  text: string;
  timestamp: number;
  error?: boolean;
}
