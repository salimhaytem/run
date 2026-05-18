INSERT INTO badges (code, name, description) VALUES
  ('motivator', 'Motivator', 'Encouraged 10 runners to join a run'),
  ('crew_leader', 'Crew Leader', 'Led a crew with 20+ active members'),
  ('sos_hero', 'SOS Hero', 'Completed 5 pacer rescues'),
  ('sunrise_runner', 'Sunrise Runner', '10 runs before 7am'),
  ('marathon_finisher', 'Marathon Finisher', 'Completed a 42km run')
ON CONFLICT (code) DO NOTHING;
