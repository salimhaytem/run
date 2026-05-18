import { create } from 'zustand';
import type { LatLng } from '@/lib/geo';

interface RunState {
  runId: string | null;
  isActive: boolean;
  isPaused: boolean;
  startedAt: number | null;
  pausedAt: number | null;
  totalPausedMs: number;
  coords: LatLng[];
  distanceM: number;
  durationSec: number;
  startRun: (runId: string) => void;
  pauseRun: () => void;
  resumeRun: () => void;
  addCoord: (coord: LatLng, deltaM: number) => void;
  tick: (durationSec: number) => void;
  reset: () => void;
}

export const useRunStore = create<RunState>((set, get) => ({
  runId: null,
  isActive: false,
  isPaused: false,
  startedAt: null,
  pausedAt: null,
  totalPausedMs: 0,
  coords: [],
  distanceM: 0,
  durationSec: 0,
  startRun: (runId) =>
    set({
      runId,
      isActive: true,
      isPaused: false,
      startedAt: Date.now(),
      coords: [],
      distanceM: 0,
      durationSec: 0,
      totalPausedMs: 0,
    }),
  pauseRun: () => set({ isPaused: true, pausedAt: Date.now() }),
  resumeRun: () => {
    const { pausedAt, totalPausedMs } = get();
    const extra = pausedAt ? Date.now() - pausedAt : 0;
    set({ isPaused: false, pausedAt: null, totalPausedMs: totalPausedMs + extra });
  },
  addCoord: (coord, deltaM) =>
    set((s) => ({
      coords: [...s.coords, coord],
      distanceM: s.distanceM + deltaM,
    })),
  tick: (durationSec) => set({ durationSec }),
  reset: () =>
    set({
      runId: null,
      isActive: false,
      isPaused: false,
      startedAt: null,
      pausedAt: null,
      totalPausedMs: 0,
      coords: [],
      distanceM: 0,
      durationSec: 0,
    }),
}));
