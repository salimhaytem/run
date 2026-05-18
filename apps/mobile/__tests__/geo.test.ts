import { haversineMeters, formatPace, paceSecPerKm, simplifyCoords } from '../src/lib/geo';

describe('geo utils', () => {
  it('computes distance between two points', () => {
    const a = { latitude: 33.5731, longitude: -7.5898 };
    const b = { latitude: 33.58, longitude: -7.59 };
    const d = haversineMeters(a, b);
    expect(d).toBeGreaterThan(500);
    expect(d).toBeLessThan(1500);
  });

  it('formats pace', () => {
    expect(formatPace(300)).toBe('5:00');
    expect(formatPace(null)).toBe('--:--');
  });

  it('calculates pace sec per km', () => {
    expect(paceSecPerKm(5000, 1500)).toBe(300);
    expect(paceSecPerKm(50, 100)).toBeNull();
  });

  it('simplifies coords', () => {
    const coords = [
      { latitude: 0, longitude: 0 },
      { latitude: 0.00001, longitude: 0.00001 },
      { latitude: 0.001, longitude: 0.001 },
    ];
    const simplified = simplifyCoords(coords, 50);
    expect(simplified.length).toBeLessThan(coords.length);
  });
});
