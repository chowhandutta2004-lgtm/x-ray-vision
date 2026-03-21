import { Particle } from './Particle';
import { Point, Rect } from '@/types';
import { MAX_PARTICLES, PARTICLE_COLORS, POSE_CONNECTIONS } from './constants';

export class ParticleSystem {
  private pool: Particle[] = [];

  constructor() {
    for (let i = 0; i < MAX_PARTICLES; i++) {
      this.pool.push(new Particle());
    }
  }

  private getInactive(): Particle | null {
    for (const p of this.pool) {
      if (!p.active) return p;
    }
    return null;
  }

  private spawn(
    x: number,
    y: number,
    velScale: number,
    sizeMin: number,
    sizeMax: number,
    lifeMin: number,
    lifeMax: number,
    color?: string
  ) {
    const p = this.getInactive();
    if (!p) return;
    const c = color || PARTICLE_COLORS[Math.floor(Math.random() * PARTICLE_COLORS.length)];
    const size = sizeMin + Math.random() * (sizeMax - sizeMin);
    const life = lifeMin + Math.random() * (lifeMax - lifeMin);
    const angle = Math.random() * Math.PI * 2;
    const speed = Math.random() * velScale;
    p.reset(x, y, Math.cos(angle) * speed, Math.sin(angle) * speed, life, size, c);
  }

  private isInRect(px: number, py: number, rect: Rect): boolean {
    return px >= rect.x && px <= rect.x + rect.w &&
           py >= rect.y && py <= rect.y + rect.h;
  }

  update(
    dt: number,
    faceLandmarks: Point[][] | null,
    poseLandmarks: Point[][] | null,
    scanRect: Rect,
    canvasW: number,
    canvasH: number
  ) {
    // === FACE PARTICLES — very dense, spawn at nearly every landmark ===
    if (faceLandmarks && faceLandmarks.length > 0) {
      const face = faceLandmarks[0];
      for (let i = 0; i < face.length; i++) {
        // Spawn at ~60% of landmarks per frame for high density
        if (Math.random() > 0.6) continue;
        const px = face[i].x * canvasW;
        const py = face[i].y * canvasH;
        if (this.isInRect(px, py, scanRect)) {
          // Small jitter for organic look
          const jx = px + (Math.random() - 0.5) * 4;
          const jy = py + (Math.random() - 0.5) * 4;
          this.spawn(jx, jy, 20, 0.8, 2.5, 0.3, 0.9);
        }
      }

      // Extra dense pass on key face features (eyes, nose, mouth, jawline)
      // Eyes: 33,133,159,145,386,374,263,362
      // Nose: 1,2,4,5,6,19,94,168
      // Mouth: 13,14,78,308,82,312,87,317
      // Jawline: 10,152,234,454,136,365
      const keyIndices = [33,133,159,145,386,374,263,362,1,2,4,5,6,19,94,168,13,14,78,308,82,312,87,317,10,152,234,454,136,365];
      for (const idx of keyIndices) {
        if (idx >= face.length) continue;
        if (Math.random() > 0.7) continue;
        const px = face[idx].x * canvasW + (Math.random() - 0.5) * 3;
        const py = face[idx].y * canvasH + (Math.random() - 0.5) * 3;
        if (this.isInRect(px, py, scanRect)) {
          this.spawn(px, py, 15, 1, 3, 0.4, 1.2);
        }
      }
    }

    // === POSE / BODY PARTICLES ===
    if (poseLandmarks && poseLandmarks.length > 0) {
      const pose = poseLandmarks[0];

      // At each pose landmark
      for (let i = 0; i < pose.length; i++) {
        if (Math.random() > 0.55) continue;
        const px = pose[i].x * canvasW;
        const py = pose[i].y * canvasH;
        if (this.isInRect(px, py, scanRect)) {
          this.spawn(px, py, 25, 1, 3.5, 0.4, 1.2);
        }
      }

      // Along skeleton connections — denser
      for (const [a, b] of POSE_CONNECTIONS) {
        if (a >= pose.length || b >= pose.length) continue;
        const count = Math.random() < 0.5 ? 4 : 2;
        for (let s = 0; s < count; s++) {
          const t = Math.random();
          const px = (pose[a].x * (1 - t) + pose[b].x * t) * canvasW;
          const py = (pose[a].y * (1 - t) + pose[b].y * t) * canvasH;
          if (this.isInRect(px, py, scanRect)) {
            this.spawn(px, py, 18, 0.8, 2.5, 0.3, 0.8);
          }
        }
      }
    }

    // === AMBIENT WHITE DOTS scattered inside rect ===
    for (let i = 0; i < 4; i++) {
      const px = scanRect.x + Math.random() * scanRect.w;
      const py = scanRect.y + Math.random() * scanRect.h;
      this.spawn(px, py, 3, 0.5, 1.2, 1.5, 4, 'rgba(200,220,255,0.9)');
    }

    // Update all
    for (const p of this.pool) {
      if (!p.active) continue;
      p.update(dt);
    }
  }

  getActiveParticles(): Particle[] {
    return this.pool.filter((p) => p.active);
  }

  clear() {
    for (const p of this.pool) {
      p.active = false;
    }
  }
}
