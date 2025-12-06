
export type MoodType = 'happy' | 'calm' | 'neutral' | 'tired' | 'sad' | 'excited';

export interface PlanItem {
  id: string;
  text: string;
  completed: boolean;
  isLongTerm?: boolean; // If true, it comes from a long-term goal
  longTermId?: string;
}

export interface LongTermGoal {
  id: string;
  title: string;
  startDate: string; // YYYY-MM-DD
  endDate?: string; // YYYY-MM-DD, optional
  color: string; // Tailwind color class e.g. 'bg-red-200'
  isCompleted: boolean; // If the entire goal is archived/done
}

export interface DailyReview {
  diet: string;
  dietWater?: number; // Cups of water
  languageLearning: string;
  languageTime?: number; // Minutes
  finances: string;
  financeAmount?: number;
  social: string;
  socialEnergy?: number; // 0-100
  surprise: string;
  mood: MoodType;
  moodNote: string;
}

export interface DayData {
  date: string; // ISO string YYYY-MM-DD
  plans: PlanItem[];
  // We track daily completion of long term goals separately so they don't get 'checked' forever
  longTermProgress?: Record<string, boolean>; 
  review: DailyReview;
  aiReflection?: string;
  lastUpdated?: number;
}

export const MOODS: { type: MoodType; emoji: string; label: string; color: string }[] = [
  { type: 'happy', emoji: '😊', label: '开心', color: 'bg-yellow-100 text-yellow-700' },
  { type: 'excited', emoji: '🎉', label: '兴奋', color: 'bg-orange-100 text-orange-700' },
  { type: 'calm', emoji: '🍃', label: '平静', color: 'bg-green-100 text-green-700' },
  { type: 'neutral', emoji: '😐', label: '平淡', color: 'bg-stone-200 text-stone-700' },
  { type: 'tired', emoji: '😴', label: '疲惫', color: 'bg-purple-100 text-purple-700' },
  { type: 'sad', emoji: '🌧️', label: '低落', color: 'bg-blue-100 text-blue-700' },
];

export const GOAL_COLORS = [
  { label: 'Rose', bg: 'bg-rose-200', text: 'text-rose-700', border: 'border-rose-200' },
  { label: 'Blue', bg: 'bg-sky-200', text: 'text-sky-700', border: 'border-sky-200' },
  { label: 'Green', bg: 'bg-emerald-200', text: 'text-emerald-700', border: 'border-emerald-200' },
  { label: 'Purple', bg: 'bg-violet-200', text: 'text-violet-700', border: 'border-violet-200' },
  { label: 'Orange', bg: 'bg-orange-200', text: 'text-orange-700', border: 'border-orange-200' },
];
