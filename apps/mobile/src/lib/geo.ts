export interface LatLng {
  latitude: number;
  longitude: number;
}

export function haversineMeters(a: LatLng, b: LatLng): number {
  const R = 6371000;
  const dLat = ((b.latitude - a.latitude) * Math.PI) / 180;
  const dLon = ((b.longitude - a.longitude) * Math.PI) / 180;
  const lat1 = (a.latitude * Math.PI) / 180;
  const lat2 = (b.latitude * Math.PI) / 180;
  const x =
    Math.sin(dLat / 2) ** 2 +
    Math.cos(lat1) * Math.cos(lat2) * Math.sin(dLon / 2) ** 2;
  return 2 * R * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}

export function paceSecPerKm(distanceM: number, durationSec: number): number | null {
  if (distanceM < 100 || durationSec <= 0) return null;
  return Math.round(durationSec / (distanceM / 1000));
}

export function formatPace(secPerKm: number | null): string {
  if (!secPerKm) return '--:--';
  const min = Math.floor(secPerKm / 60);
  const sec = secPerKm % 60;
  return `${min}:${sec.toString().padStart(2, '0')}`;
}

export function formatDuration(sec: number): string {
  const h = Math.floor(sec / 3600);
  const m = Math.floor((sec % 3600) / 60);
  const s = sec % 60;
  if (h > 0) return `${h}:${m.toString().padStart(2, '0')}:${s.toString().padStart(2, '0')}`;
  return `${m}:${s.toString().padStart(2, '0')}`;
}

export function formatKm(meters: number): string {
  return (meters / 1000).toFixed(2);
}

export function toLineString(coords: LatLng[]): GeoJSON.LineString {
  return {
    type: 'LineString',
    coordinates: coords.map((c) => [c.longitude, c.latitude]),
  };
}

export function simplifyCoords(coords: LatLng[], minDistM = 8): LatLng[] {
  if (coords.length < 2) return coords;
  const out: LatLng[] = [coords[0]];
  for (let i = 1; i < coords.length; i++) {
    if (haversineMeters(out[out.length - 1], coords[i]) >= minDistM) {
      out.push(coords[i]);
    }
  }
  return out;
}
