import { z } from 'zod';
import { CREW_TYPES, SOS_DIFFICULTY, VISIBILITY_OPTIONS } from './constants';

export const visibilitySchema = z.enum(VISIBILITY_OPTIONS);
export type Visibility = z.infer<typeof visibilitySchema>;

export const crewTypeSchema = z.enum(CREW_TYPES);
export type CrewType = z.infer<typeof crewTypeSchema>;

export const sosDifficultySchema = z.enum(SOS_DIFFICULTY);
export type SosDifficulty = z.infer<typeof sosDifficultySchema>;

export interface Profile {
  id: string;
  username: string;
  bio: string | null;
  city: string | null;
  avatar_url: string | null;
  level: number;
  xp: number;
  primary_crew_id: string | null;
  visibility_default: Visibility;
  runner_level: string | null;
  is_premium: boolean;
  is_partner: boolean;
  total_km: number;
  weekly_runs: number;
  avg_pace_sec_per_km: number | null;
  current_streak: number;
  crew_sessions: number;
  rescues_done: number;
  max_distance_km: number;
  onboarding_completed: boolean;
  created_at: string;
}

export interface Run {
  id: string;
  user_id: string;
  started_at: string;
  ended_at: string | null;
  distance_m: number;
  duration_sec: number;
  avg_pace_sec_per_km: number | null;
  calories: number | null;
  polyline: GeoJSON.LineString | null;
  status: 'active' | 'paused' | 'completed';
}

export interface Post {
  id: string;
  user_id: string;
  run_id: string | null;
  content: string | null;
  media_url: string | null;
  media_type: 'image' | 'video' | null;
  gps_trace: GeoJSON.LineString | null;
  post_type: 'photo' | 'video' | 'gps' | 'pr' | 'crew_run' | 'event' | 'challenge';
  created_at: string;
}
