export interface Annotation {
  id: string;
  type: 'arrow' | 'box' | 'circle' | 'text' | 'highlight' | 'callout' | 'blur' | 'cursor';
  x: number;
  y: number;
  width?: number;
  height?: number;
  endX?: number;
  endY?: number;
  text?: string;
  color: string;
  fontSize?: number;
  number?: number; // For callouts
}

export interface GuideStep {
  id: string;
  order: number;
  imageUrl: string;
  imageName: string;
  title: string;
  instructions: string;
  annotations: Annotation[];
}

export interface GuideProject {
  id: string;
  name: string;
  description: string;
  steps: GuideStep[];
  createdAt: string;
  updatedAt: string;
  settings: GuideSettings;
}

export interface GuideSettings {
  primaryColor: string;
  fontFamily: string;
  showStepNumbers: boolean;
  headerText: string;
  footerText: string;
}

export const DEFAULT_SETTINGS: GuideSettings = {
  primaryColor: '#3B82F6',
  fontFamily: 'Inter, sans-serif',
  showStepNumbers: true,
  headerText: '',
  footerText: '',
};
