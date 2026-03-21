export interface Point {
  x: number;
  y: number;
}

export interface Rect {
  x: number;
  y: number;
  w: number;
  h: number;
}

export type AppState = 'loading' | 'idle' | 'scanning';

export interface ParticleData {
  x: number;
  y: number;
  vx: number;
  vy: number;
  life: number;
  maxLife: number;
  size: number;
  color: string;
  active: boolean;
}

export interface TrackingResult {
  faceLandmarks: Point[][] | null;
  handLandmarks: Point[][] | null;
  poseLandmarks: Point[][] | null;
}
