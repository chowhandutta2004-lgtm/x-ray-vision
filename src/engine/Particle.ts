import { ParticleData } from '@/types';

export class Particle implements ParticleData {
  x = 0;
  y = 0;
  vx = 0;
  vy = 0;
  life = 0;
  maxLife = 0;
  size = 0;
  color = '#ffffff';
  active = false;

  reset(
    x: number,
    y: number,
    vx: number,
    vy: number,
    life: number,
    size: number,
    color: string
  ) {
    this.x = x;
    this.y = y;
    this.vx = vx;
    this.vy = vy;
    this.life = life;
    this.maxLife = life;
    this.size = size;
    this.color = color;
    this.active = true;
  }

  update(dt: number) {
    if (!this.active) return;
    this.life -= dt;
    if (this.life <= 0) {
      this.active = false;
      return;
    }
    this.x += this.vx * dt;
    this.y += this.vy * dt;
  }

  getAlpha(): number {
    if (!this.active) return 0;
    return Math.min(1, this.life / this.maxLife);
  }
}
