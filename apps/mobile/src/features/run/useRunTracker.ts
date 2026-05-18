import { useEffect, useRef } from 'react';
import * as Location from 'expo-location';
import { haversineMeters, paceSecPerKm, simplifyCoords, toLineString } from '@/lib/geo';
import { supabase } from '@/lib/supabase';
import { useRunStore } from './runStore';
import { LIVE_PRESENCE_INTERVAL_MS } from '@pace/shared';

export function useRunTracker(userId: string | undefined, visibility: string) {
  const watchRef = useRef<Location.LocationSubscription | null>(null);
  const tickRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const presenceRef = useRef<ReturnType<typeof setInterval> | null>(null);
  const lastCoord = useRef<{ latitude: number; longitude: number } | null>(null);

  const {
    runId,
    isActive,
    isPaused,
    coords,
    distanceM,
    durationSec,
    startRun,
    pauseRun,
    resumeRun,
    addCoord,
    tick,
    reset,
  } = useRunStore();

  useEffect(() => {
    if (!isActive || isPaused) return;
    tickRef.current = setInterval(() => tick(durationSec + 1), 1000);
    return () => {
      if (tickRef.current) clearInterval(tickRef.current);
    };
  }, [isActive, isPaused, durationSec]);

  const beginRun = async () => {
    if (!userId) return null;
    const { status } = await Location.requestForegroundPermissionsAsync();
    if (status !== 'granted') throw new Error('Location permission denied');

    const { data: run, error } = await supabase
      .from('runs')
      .insert({ user_id: userId, status: 'active' })
      .select('id')
      .single();

    if (error || !run) throw error ?? new Error('Failed to create run');
    const activeRunId = run.id as string;
    startRun(activeRunId);

    watchRef.current = await Location.watchPositionAsync(
      {
        accuracy: Location.Accuracy.BestForNavigation,
        distanceInterval: 5,
        timeInterval: 3000,
      },
      (loc) => {
        const { latitude, longitude } = loc.coords;
        const point = { latitude, longitude };
        let delta = 0;
        if (lastCoord.current) {
          delta = haversineMeters(lastCoord.current, point);
          if (delta < 2) return;
        }
        lastCoord.current = point;
        addCoord(point, delta);
      },
    );

    presenceRef.current = setInterval(async () => {
      const pos = lastCoord.current;
      if (!pos) return;
      await supabase.rpc('upsert_live_presence', {
        p_lat: pos.latitude,
        p_lng: pos.longitude,
        p_session_id: activeRunId,
        p_visibility: visibility,
        p_is_running: true,
      });
    }, LIVE_PRESENCE_INTERVAL_MS);

    return activeRunId;
  };

  const endRun = async () => {
    if (!runId || !userId) return null;
    watchRef.current?.remove();
    if (presenceRef.current) clearInterval(presenceRef.current);
    if (tickRef.current) clearInterval(tickRef.current);

    const simplified = simplifyCoords(coords);
    const polyline = simplified.length > 1 ? toLineString(simplified) : null;
    const pace = paceSecPerKm(distanceM, durationSec);

    const { data: run, error } = await supabase
      .from('runs')
      .update({
        ended_at: new Date().toISOString(),
        distance_m: Math.round(distanceM),
        duration_sec: durationSec,
        avg_pace_sec_per_km: pace,
        calories: Math.round(distanceM * 0.06),
        polyline,
        status: 'completed',
      })
      .eq('id', runId)
      .select()
      .single();

    await supabase.from('live_presence').delete().eq('user_id', userId);

    await supabase.from('run_recaps').insert({
      run_id: runId,
      user_id: userId,
      summary: {
        distance_m: distanceM,
        duration_sec: durationSec,
        pace,
      },
    });

    await supabase.functions.invoke('aggregate_profile_stats', {
      body: { user_id: userId, run_id: runId },
    });

    reset();
    lastCoord.current = null;
    if (error) throw error;
    return run;
  };

  return {
    runId,
    isActive,
    isPaused,
    coords,
    distanceM,
    durationSec,
    beginRun,
    pauseRun,
    resumeRun,
    endRun,
  };
}
