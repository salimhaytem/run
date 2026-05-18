export const VISIBILITY_OPTIONS = ['public', 'friends', 'hidden'] as const;
export const CREW_TYPES = ['public', 'private', 'club', 'friends'] as const;
export const SOS_DIFFICULTY = ['easy', 'moderate', 'hard'] as const;
export const STORY_DURATION_HOURS = 24;
export const LIVE_PRESENCE_INTERVAL_MS = 5000;
export const SOS_DAILY_LIMIT = 3;
export const SOS_COOLDOWN_MINUTES = 30;
export const DEFAULT_SOS_CREDITS = 5;

export const BADGE_CODES = {
  MOTIVATOR: 'motivator',
  CREW_LEADER: 'crew_leader',
  SOS_HERO: 'sos_hero',
  SUNRISE_RUNNER: 'sunrise_runner',
  MARATHON_FINISHER: 'marathon_finisher',
} as const;
