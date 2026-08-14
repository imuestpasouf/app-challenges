import type { Zone } from '../domain/calories';

export const ZONE_HEX: Record<Zone, string> = {
  green: '#12B76A',
  amber: '#F59E0B',
  red: '#F0433A',
  black: '#1A1D2B',
};

export const ZONE_NAME: Record<Zone, string> = {
  green: 'VERT',
  amber: 'JAUNE',
  red: 'ROUGE',
  black: 'NOIR',
};

export function hexA(hex: string, alpha: number): string {
  const n = parseInt(hex.slice(1), 16);
  return `rgba(${(n >> 16) & 255},${(n >> 8) & 255},${n & 255},${alpha})`;
}

export function shade(hex: string, pct: number): string {
  const n = parseInt(hex.slice(1), 16);
  let r = (n >> 16) & 255;
  let g = (n >> 8) & 255;
  let b = n & 255;
  const f = pct / 100;
  r = Math.round(r + (pct < 0 ? r : 255 - r) * f);
  g = Math.round(g + (pct < 0 ? g : 255 - g) * f);
  b = Math.round(b + (pct < 0 ? b : 255 - b) * f);
  const clamp = (v: number) => Math.max(0, Math.min(255, v));
  return `rgb(${clamp(r)},${clamp(g)},${clamp(b)})`;
}
