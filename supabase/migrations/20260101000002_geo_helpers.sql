CREATE OR REPLACE FUNCTION upsert_live_presence(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_session_id UUID DEFAULT NULL,
  p_visibility visibility_level DEFAULT 'public',
  p_is_running BOOLEAN DEFAULT true
)
RETURNS void LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
BEGIN
  INSERT INTO live_presence (user_id, session_id, location, visibility, is_running, updated_at)
  VALUES (
    auth.uid(),
    p_session_id,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_visibility,
    p_is_running,
    now()
  )
  ON CONFLICT (user_id) DO UPDATE SET
    session_id = EXCLUDED.session_id,
    location = EXCLUDED.location,
    visibility = EXCLUDED.visibility,
    is_running = EXCLUDED.is_running,
    updated_at = now();
END;
$$;

CREATE OR REPLACE FUNCTION create_sos_request(
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION,
  p_difficulty sos_difficulty DEFAULT 'moderate',
  p_distance_remaining_m INT DEFAULT 2000
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
  cred RECORD;
BEGIN
  SELECT * INTO cred FROM sos_credits WHERE user_id = auth.uid();
  IF cred.credits_remaining <= 0 THEN
    RAISE EXCEPTION 'No SOS credits remaining';
  END IF;
  IF cred.daily_count >= 3 THEN
    RAISE EXCEPTION 'Daily SOS limit reached';
  END IF;

  INSERT INTO sos_requests (requester_id, difficulty, location, distance_remaining_m, status)
  VALUES (
    auth.uid(),
    p_difficulty,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography,
    p_distance_remaining_m,
    'open'
  )
  RETURNING id INTO new_id;

  UPDATE sos_credits SET
    credits_remaining = credits_remaining - 1,
    daily_count = daily_count + 1,
    last_used_at = now()
  WHERE user_id = auth.uid();

  RETURN new_id;
END;
$$;

CREATE OR REPLACE FUNCTION increment_rescues(p_user_id UUID)
RETURNS void LANGUAGE sql SECURITY DEFINER SET search_path = public AS $$
  UPDATE profiles SET rescues_done = rescues_done + 1 WHERE id = p_user_id;
$$;

GRANT EXECUTE ON FUNCTION upsert_live_presence TO authenticated;
GRANT EXECUTE ON FUNCTION create_sos_request TO authenticated;
GRANT EXECUTE ON FUNCTION increment_rescues TO authenticated;
CREATE OR REPLACE FUNCTION create_partner(
  p_name TEXT,
  p_category TEXT,
  p_city TEXT,
  p_lat DOUBLE PRECISION,
  p_lng DOUBLE PRECISION
)
RETURNS UUID LANGUAGE plpgsql SECURITY DEFINER SET search_path = public AS $$
DECLARE
  new_id UUID;
BEGIN
  INSERT INTO partners (owner_id, name, category, city, location)
  VALUES (
    auth.uid(),
    p_name,
    p_category,
    p_city,
    ST_SetSRID(ST_MakePoint(p_lng, p_lat), 4326)::geography
  )
  RETURNING id INTO new_id;
  RETURN new_id;
END;
$$;

GRANT EXECUTE ON FUNCTION nearby_runners TO authenticated;
GRANT EXECUTE ON FUNCTION create_partner TO authenticated;
