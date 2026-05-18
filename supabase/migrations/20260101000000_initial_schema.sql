-- PACE initial schema: PostGIS, profiles, social, runs, crews, SOS, marketplace, monetization

CREATE EXTENSION IF NOT EXISTS postgis WITH SCHEMA extensions;

-- Enums
CREATE TYPE visibility_level AS ENUM ('public', 'friends', 'hidden');
CREATE TYPE crew_type AS ENUM ('public', 'private', 'club', 'friends');
CREATE TYPE run_status AS ENUM ('active', 'paused', 'completed');
CREATE TYPE invitation_status AS ENUM ('pending', 'accepted', 'declined', 'expired');
CREATE TYPE sos_status AS ENUM ('open', 'matched', 'active', 'completed', 'cancelled');
CREATE TYPE sos_difficulty AS ENUM ('easy', 'moderate', 'hard');
CREATE TYPE post_type AS ENUM ('photo', 'video', 'gps', 'pr', 'crew_run', 'event', 'challenge');
CREATE TYPE subscription_tier AS ENUM ('free', 'premium', 'partner_basic', 'partner_pro');

-- Profiles
CREATE TABLE profiles (
  id UUID PRIMARY KEY REFERENCES auth.users(id) ON DELETE CASCADE,
  username TEXT UNIQUE NOT NULL,
  bio TEXT,
  city TEXT,
  avatar_url TEXT,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  primary_crew_id UUID,
  visibility_default visibility_level NOT NULL DEFAULT 'public',
  runner_level TEXT,
  is_premium BOOLEAN NOT NULL DEFAULT false,
  is_partner BOOLEAN NOT NULL DEFAULT false,
  total_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  weekly_runs INT NOT NULL DEFAULT 0,
  avg_pace_sec_per_km INT,
  current_streak INT NOT NULL DEFAULT 0,
  crew_sessions INT NOT NULL DEFAULT 0,
  rescues_done INT NOT NULL DEFAULT 0,
  max_distance_km NUMERIC(10,2) NOT NULL DEFAULT 0,
  onboarding_completed BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Follows
CREATE TABLE follows (
  follower_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  following_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (follower_id, following_id),
  CHECK (follower_id <> following_id)
);

-- Runs
CREATE TABLE runs (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  started_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  ended_at TIMESTAMPTZ,
  distance_m INT NOT NULL DEFAULT 0,
  duration_sec INT NOT NULL DEFAULT 0,
  avg_pace_sec_per_km INT,
  calories INT,
  polyline JSONB,
  status run_status NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE run_recaps (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  run_id UUID NOT NULL UNIQUE REFERENCES runs(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  summary JSONB NOT NULL DEFAULT '{}',
  photo_urls TEXT[] NOT NULL DEFAULT '{}',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Live presence
CREATE TABLE live_presence (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  session_id UUID,
  location geography(POINT, 4326) NOT NULL,
  heading REAL,
  visibility visibility_level NOT NULL DEFAULT 'public',
  is_running BOOLEAN NOT NULL DEFAULT true,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX live_presence_geo_idx ON live_presence USING GIST (location);

-- Shared sessions & invitations
CREATE TABLE shared_sessions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  status TEXT NOT NULL DEFAULT 'active',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE shared_session_participants (
  session_id UUID NOT NULL REFERENCES shared_sessions(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (session_id, user_id)
);

CREATE TABLE run_invitations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  message TEXT NOT NULL,
  status invitation_status NOT NULL DEFAULT 'pending',
  shared_session_id UUID REFERENCES shared_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Chat messages (private, crew, session)
CREATE TABLE chat_messages (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  channel_type TEXT NOT NULL CHECK (channel_type IN ('direct', 'crew', 'session')),
  channel_id UUID NOT NULL,
  sender_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Crews
CREATE TABLE crews (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  name TEXT NOT NULL,
  description TEXT,
  city TEXT,
  crew_type crew_type NOT NULL DEFAULT 'public',
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  level INT NOT NULL DEFAULT 1,
  xp INT NOT NULL DEFAULT 0,
  collective_streak INT NOT NULL DEFAULT 0,
  monthly_goal_km NUMERIC(10,2) DEFAULT 100,
  avatar_url TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

ALTER TABLE profiles ADD CONSTRAINT profiles_primary_crew_fkey
  FOREIGN KEY (primary_crew_id) REFERENCES crews(id) ON DELETE SET NULL;

CREATE TABLE crew_members (
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  role TEXT NOT NULL DEFAULT 'member' CHECK (role IN ('owner', 'admin', 'member')),
  presence_count INT NOT NULL DEFAULT 0,
  joined_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (crew_id, user_id)
);

CREATE TABLE crew_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location geography(POINT, 4326),
  starts_at TIMESTAMPTZ NOT NULL,
  created_by UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE crew_goals (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  crew_id UUID NOT NULL REFERENCES crews(id) ON DELETE CASCADE,
  goal_type TEXT NOT NULL CHECK (goal_type IN ('streak', 'monthly_km', 'attendance')),
  target_value NUMERIC NOT NULL,
  current_value NUMERIC NOT NULL DEFAULT 0,
  period_start DATE NOT NULL,
  period_end DATE NOT NULL
);

-- Private profiles (sensitive data)
CREATE TABLE profiles_private (
  id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  push_token TEXT,
  updated_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- SOS
CREATE TABLE sos_credits (
  user_id UUID PRIMARY KEY REFERENCES profiles(id) ON DELETE CASCADE,
  credits_remaining INT NOT NULL DEFAULT 5,
  last_used_at TIMESTAMPTZ,
  daily_count INT NOT NULL DEFAULT 0,
  daily_reset_at DATE NOT NULL DEFAULT CURRENT_DATE
);

CREATE TABLE sos_requests (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  requester_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  pacer_id UUID REFERENCES profiles(id) ON DELETE SET NULL,
  difficulty sos_difficulty NOT NULL DEFAULT 'moderate',
  location geography(POINT, 4326) NOT NULL,
  distance_remaining_m INT,
  status sos_status NOT NULL DEFAULT 'open',
  shared_session_id UUID REFERENCES shared_sessions(id) ON DELETE SET NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  completed_at TIMESTAMPTZ
);

CREATE TABLE sos_ratings (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  sos_request_id UUID NOT NULL REFERENCES sos_requests(id) ON DELETE CASCADE,
  rater_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rated_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  rating INT NOT NULL CHECK (rating BETWEEN 1 AND 5),
  comment TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Social feed
CREATE TABLE posts (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  run_id UUID REFERENCES runs(id) ON DELETE SET NULL,
  content TEXT,
  media_url TEXT,
  media_type TEXT CHECK (media_type IN ('image', 'video')),
  gps_trace JSONB,
  post_type post_type NOT NULL DEFAULT 'photo',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE post_likes (
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (post_id, user_id)
);

CREATE TABLE post_comments (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  post_id UUID NOT NULL REFERENCES posts(id) ON DELETE CASCADE,
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  body TEXT NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Stories
CREATE TABLE stories (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  media_url TEXT NOT NULL,
  media_type TEXT NOT NULL CHECK (media_type IN ('image', 'video')),
  overlay_data JSONB DEFAULT '{}',
  expires_at TIMESTAMPTZ NOT NULL,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE story_views (
  story_id UUID NOT NULL REFERENCES stories(id) ON DELETE CASCADE,
  viewer_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  viewed_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (story_id, viewer_id)
);

-- Badges
CREATE TABLE badges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  code TEXT UNIQUE NOT NULL,
  name TEXT NOT NULL,
  description TEXT,
  icon_url TEXT
);

CREATE TABLE user_badges (
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  badge_id UUID NOT NULL REFERENCES badges(id) ON DELETE CASCADE,
  earned_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  PRIMARY KEY (user_id, badge_id)
);

-- Partners & marketplace
CREATE TABLE partners (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  owner_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  name TEXT NOT NULL,
  category TEXT NOT NULL,
  description TEXT,
  address TEXT,
  city TEXT NOT NULL,
  location geography(POINT, 4326) NOT NULL,
  logo_url TEXT,
  is_featured BOOLEAN NOT NULL DEFAULT false,
  subscription_tier subscription_tier NOT NULL DEFAULT 'partner_basic',
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partners_geo_idx ON partners USING GIST (location);

CREATE TABLE partner_events (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  location geography(POINT, 4326),
  starts_at TIMESTAMPTZ NOT NULL,
  is_sponsored BOOLEAN NOT NULL DEFAULT false,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE INDEX partner_events_geo_idx ON partner_events USING GIST (location);

CREATE TABLE partner_offers (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  description TEXT,
  discount_percent INT,
  valid_until TIMESTAMPTZ
);

CREATE TABLE challenges (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  partner_id UUID REFERENCES partners(id) ON DELETE CASCADE,
  crew_id UUID REFERENCES crews(id) ON DELETE CASCADE,
  title TEXT NOT NULL,
  target_runs INT NOT NULL,
  reward_description TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE event_registrations (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  event_id UUID NOT NULL,
  event_type TEXT NOT NULL CHECK (event_type IN ('partner', 'crew')),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  registered_at TIMESTAMPTZ NOT NULL DEFAULT now(),
  UNIQUE (event_id, event_type, user_id)
);

CREATE TABLE check_ins (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  partner_id UUID NOT NULL REFERENCES partners(id) ON DELETE CASCADE,
  event_id UUID,
  check_in_type TEXT NOT NULL CHECK (check_in_type IN ('departure', 'return')),
  qr_code TEXT,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Monetization
CREATE TABLE subscriptions (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  tier subscription_tier NOT NULL,
  provider TEXT NOT NULL DEFAULT 'revenuecat',
  external_id TEXT,
  expires_at TIMESTAMPTZ,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

CREATE TABLE tips (
  id UUID PRIMARY KEY DEFAULT gen_random_uuid(),
  from_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  to_user_id UUID NOT NULL REFERENCES profiles(id) ON DELETE CASCADE,
  amount_cents INT NOT NULL,
  sos_request_id UUID REFERENCES sos_requests(id) ON DELETE SET NULL,
  platform_fee_cents INT NOT NULL DEFAULT 0,
  created_at TIMESTAMPTZ NOT NULL DEFAULT now()
);

-- Helper: are friends
CREATE OR REPLACE FUNCTION is_friend(viewer UUID, target UUID)
RETURNS BOOLEAN LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = viewer AND following_id = target
  ) OR EXISTS (
    SELECT 1 FROM follows
    WHERE follower_id = target AND following_id = viewer
  );
$$;

-- Nearby runners RPC
CREATE OR REPLACE FUNCTION nearby_runners(
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  radius_m INT DEFAULT 5000
)
RETURNS TABLE (
  user_id UUID,
  username TEXT,
  avatar_url TEXT,
  visibility visibility_level,
  lat DOUBLE PRECISION,
  lng DOUBLE PRECISION,
  distance_m DOUBLE PRECISION,
  updated_at TIMESTAMPTZ
) LANGUAGE sql STABLE SECURITY DEFINER SET search_path = public AS $$
  SELECT
    p.user_id,
    pr.username,
    pr.avatar_url,
    p.visibility,
    ST_Y(p.location::geometry) AS lat,
    ST_X(p.location::geometry) AS lng,
    ST_Distance(p.location, ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography) AS distance_m,
    p.updated_at
  FROM live_presence p
  JOIN profiles pr ON pr.id = p.user_id
  WHERE p.is_running = true
    AND p.visibility <> 'hidden'
    AND p.user_id <> auth.uid()
    AND ST_DWithin(
      p.location,
      ST_SetSRID(ST_MakePoint(lng, lat), 4326)::geography,
      radius_m
    )
    AND (
      p.visibility = 'public'
      OR (p.visibility = 'friends' AND is_friend(auth.uid(), p.user_id))
    );
$$;

-- Profile creation trigger
CREATE OR REPLACE FUNCTION handle_new_user()
RETURNS TRIGGER LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO profiles (id, username)
  VALUES (
    NEW.id,
    COALESCE(NEW.raw_user_meta_data->>'username', 'runner_' || substr(NEW.id::text, 1, 8))
  );
  INSERT INTO profiles_private (id) VALUES (NEW.id);
  INSERT INTO sos_credits (user_id) VALUES (NEW.id);
  RETURN NEW;
END;
$$;

CREATE TRIGGER on_auth_user_created
  AFTER INSERT ON auth.users
  FOR EACH ROW EXECUTE FUNCTION handle_new_user();

-- Updated_at trigger
CREATE OR REPLACE FUNCTION set_updated_at()
RETURNS TRIGGER LANGUAGE plpgsql AS $$
BEGIN
  NEW.updated_at = now();
  RETURN NEW;
END;
$$;

CREATE TRIGGER profiles_updated_at
  BEFORE UPDATE ON profiles
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

CREATE TRIGGER profiles_private_updated_at
  BEFORE UPDATE ON profiles_private
  FOR EACH ROW EXECUTE FUNCTION set_updated_at();

-- RLS
ALTER TABLE profiles ENABLE ROW LEVEL SECURITY;
ALTER TABLE profiles_private ENABLE ROW LEVEL SECURITY;
ALTER TABLE follows ENABLE ROW LEVEL SECURITY;
ALTER TABLE runs ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_recaps ENABLE ROW LEVEL SECURITY;
ALTER TABLE live_presence ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_sessions ENABLE ROW LEVEL SECURITY;
ALTER TABLE shared_session_participants ENABLE ROW LEVEL SECURITY;
ALTER TABLE run_invitations ENABLE ROW LEVEL SECURITY;
ALTER TABLE chat_messages ENABLE ROW LEVEL SECURITY;
ALTER TABLE crews ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_members ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE crew_goals ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_credits ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_requests ENABLE ROW LEVEL SECURITY;
ALTER TABLE sos_ratings ENABLE ROW LEVEL SECURITY;
ALTER TABLE posts ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_likes ENABLE ROW LEVEL SECURITY;
ALTER TABLE post_comments ENABLE ROW LEVEL SECURITY;
ALTER TABLE stories ENABLE ROW LEVEL SECURITY;
ALTER TABLE story_views ENABLE ROW LEVEL SECURITY;
ALTER TABLE badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE user_badges ENABLE ROW LEVEL SECURITY;
ALTER TABLE partners ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_events ENABLE ROW LEVEL SECURITY;
ALTER TABLE partner_offers ENABLE ROW LEVEL SECURITY;
ALTER TABLE challenges ENABLE ROW LEVEL SECURITY;
ALTER TABLE event_registrations ENABLE ROW LEVEL SECURITY;
ALTER TABLE check_ins ENABLE ROW LEVEL SECURITY;
ALTER TABLE subscriptions ENABLE ROW LEVEL SECURITY;
ALTER TABLE tips ENABLE ROW LEVEL SECURITY;

-- Profiles policies
CREATE POLICY profiles_select ON profiles FOR SELECT USING (true);
CREATE POLICY profiles_update ON profiles FOR UPDATE USING (auth.uid() = id);

CREATE POLICY profiles_private_all ON profiles_private FOR ALL USING (auth.uid() = id);

-- Follows
CREATE POLICY follows_select ON follows FOR SELECT USING (true);
CREATE POLICY follows_insert ON follows FOR INSERT WITH CHECK (auth.uid() = follower_id);
CREATE POLICY follows_delete ON follows FOR DELETE USING (auth.uid() = follower_id);

-- Runs
CREATE POLICY runs_select ON runs FOR SELECT USING (
  user_id = auth.uid() OR EXISTS (SELECT 1 FROM follows WHERE follower_id = auth.uid() AND following_id = runs.user_id)
);
CREATE POLICY runs_insert ON runs FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY runs_update ON runs FOR UPDATE USING (auth.uid() = user_id);

-- Run recaps
CREATE POLICY run_recaps_select ON run_recaps FOR SELECT USING (true);
CREATE POLICY run_recaps_all ON run_recaps FOR ALL USING (auth.uid() = user_id);

-- Live presence
CREATE POLICY live_presence_select ON live_presence FOR SELECT USING (
  user_id = auth.uid()
  OR visibility = 'public'
  OR (visibility = 'friends' AND is_friend(auth.uid(), user_id))
);
CREATE POLICY live_presence_upsert ON live_presence FOR ALL USING (auth.uid() = user_id);

-- Invitations
CREATE POLICY run_invitations_select ON run_invitations FOR SELECT USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);
CREATE POLICY run_invitations_insert ON run_invitations FOR INSERT WITH CHECK (auth.uid() = from_user_id);
CREATE POLICY run_invitations_update ON run_invitations FOR UPDATE USING (
  auth.uid() = from_user_id OR auth.uid() = to_user_id
);

-- Shared sessions
CREATE POLICY shared_sessions_select ON shared_sessions FOR SELECT USING (
  EXISTS (SELECT 1 FROM shared_session_participants WHERE session_id = id AND user_id = auth.uid())
  OR created_by = auth.uid()
);
CREATE POLICY shared_sessions_insert ON shared_sessions FOR INSERT WITH CHECK (auth.uid() = created_by);

CREATE POLICY shared_participants_select ON shared_session_participants FOR SELECT USING (true);
CREATE POLICY shared_participants_insert ON shared_session_participants FOR INSERT WITH CHECK (
  auth.uid() = user_id OR EXISTS (SELECT 1 FROM shared_sessions s WHERE s.id = session_id AND s.created_by = auth.uid())
);

-- Chat
CREATE POLICY chat_select ON chat_messages FOR SELECT USING (true);
CREATE POLICY chat_insert ON chat_messages FOR INSERT WITH CHECK (auth.uid() = sender_id);

-- Crews
CREATE POLICY crews_select ON crews FOR SELECT USING (
  crew_type = 'public' OR EXISTS (SELECT 1 FROM crew_members WHERE crew_id = id AND user_id = auth.uid())
);
CREATE POLICY crews_insert ON crews FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY crews_update ON crews FOR UPDATE USING (auth.uid() = owner_id);

CREATE POLICY crew_members_select ON crew_members FOR SELECT USING (true);
CREATE POLICY crew_members_insert ON crew_members FOR INSERT WITH CHECK (auth.uid() = user_id);

CREATE POLICY crew_events_select ON crew_events FOR SELECT USING (true);
CREATE POLICY crew_events_insert ON crew_events FOR INSERT WITH CHECK (auth.uid() = created_by);

-- SOS
CREATE POLICY sos_credits_select ON sos_credits FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY sos_requests_select ON sos_requests FOR SELECT USING (true);
CREATE POLICY sos_requests_insert ON sos_requests FOR INSERT WITH CHECK (auth.uid() = requester_id);
CREATE POLICY sos_requests_update ON sos_requests FOR UPDATE USING (
  auth.uid() = requester_id OR auth.uid() = pacer_id
);

CREATE POLICY sos_ratings_insert ON sos_ratings FOR INSERT WITH CHECK (auth.uid() = rater_id);
CREATE POLICY sos_ratings_select ON sos_ratings FOR SELECT USING (true);

-- Posts & social
CREATE POLICY posts_select ON posts FOR SELECT USING (true);
CREATE POLICY posts_insert ON posts FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_likes_all ON post_likes FOR ALL USING (auth.uid() = user_id) WITH CHECK (auth.uid() = user_id);
CREATE POLICY post_comments_select ON post_comments FOR SELECT USING (true);
CREATE POLICY post_comments_insert ON post_comments FOR INSERT WITH CHECK (auth.uid() = user_id);

-- Stories
CREATE POLICY stories_select ON stories FOR SELECT USING (expires_at > now());
CREATE POLICY stories_insert ON stories FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY story_views_insert ON story_views FOR INSERT WITH CHECK (auth.uid() = viewer_id);

-- Badges
CREATE POLICY badges_select ON badges FOR SELECT USING (true);
CREATE POLICY user_badges_select ON user_badges FOR SELECT USING (true);

-- Partners (public read)
CREATE POLICY partners_select ON partners FOR SELECT USING (true);
CREATE POLICY partners_insert ON partners FOR INSERT WITH CHECK (auth.uid() = owner_id);
CREATE POLICY partner_events_select ON partner_events FOR SELECT USING (true);
CREATE POLICY partner_offers_select ON partner_offers FOR SELECT USING (true);
CREATE POLICY challenges_select ON challenges FOR SELECT USING (true);

CREATE POLICY event_registrations_all ON event_registrations FOR ALL USING (auth.uid() = user_id);
CREATE POLICY check_ins_insert ON check_ins FOR INSERT WITH CHECK (auth.uid() = user_id);
CREATE POLICY check_ins_select ON check_ins FOR SELECT USING (auth.uid() = user_id);

-- Subscriptions & tips
CREATE POLICY subscriptions_select ON subscriptions FOR SELECT USING (auth.uid() = user_id);
CREATE POLICY tips_select ON tips FOR SELECT USING (auth.uid() = from_user_id OR auth.uid() = to_user_id);
CREATE POLICY tips_insert ON tips FOR INSERT WITH CHECK (auth.uid() = from_user_id);

-- Realtime
ALTER PUBLICATION supabase_realtime ADD TABLE live_presence;
ALTER PUBLICATION supabase_realtime ADD TABLE chat_messages;
ALTER PUBLICATION supabase_realtime ADD TABLE run_invitations;
ALTER PUBLICATION supabase_realtime ADD TABLE sos_requests;
