export type ToolCategory = 'all' | 'pdf' | 'image' | 'business' | 'video' | 'ai' | 'education';

export interface ToolItem {
  id: string;
  name: string;
  tamilName: string;
  desc: string;
  tamilDesc: string;
  icon: string;
  color: string;
  cat: 'pdf' | 'image' | 'business' | 'video' | 'ai' | 'education';
  badge?: string;
  cost?: number;
  keywords?: string[];
}

export type AppLanguage = 'ta' | 'en';

export interface CategoryInfo {
  id: 'pdf' | 'image' | 'business' | 'video' | 'ai' | 'education';
  name: string;
  tamilName: string;
  desc: string;
  tamilDesc: string;
  icon: string;
  gradient: string;
  count: number;
}
