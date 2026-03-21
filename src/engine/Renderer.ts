import { Particle } from './Particle';
import { Point, Rect } from '@/types';
import { ScanCorners } from './ScanRect';

export class Renderer {
  private ctx: CanvasRenderingContext2D;
  private xrayCanvas: HTMLCanvasElement | null = null;
  private xrayCtx: CanvasRenderingContext2D | null = null;
  private edgeCanvas: HTMLCanvasElement | null = null;
  private edgeCtx: CanvasRenderingContext2D | null = null;

  constructor(ctx: CanvasRenderingContext2D) {
    this.ctx = ctx;
  }

  getXrayCanvas(): HTMLCanvasElement | null { return this.xrayCanvas; }
  getEdgeCanvas(): HTMLCanvasElement | null { return this.edgeCanvas; }
  getCtx(): CanvasRenderingContext2D { return this.ctx; }

  private ensureXray(w: number, h: number): CanvasRenderingContext2D {
    if (!this.xrayCanvas) {
      this.xrayCanvas = document.createElement('canvas');
      this.xrayCtx = this.xrayCanvas.getContext('2d')!;
    }
    if (this.xrayCanvas.width !== w || this.xrayCanvas.height !== h) {
      this.xrayCanvas.width = w;
      this.xrayCanvas.height = h;
    }
    return this.xrayCtx!;
  }

  private ensureEdge(w: number, h: number): CanvasRenderingContext2D {
    if (!this.edgeCanvas) {
      this.edgeCanvas = document.createElement('canvas');
      this.edgeCtx = this.edgeCanvas.getContext('2d')!;
    }
    if (this.edgeCanvas.width !== w || this.edgeCanvas.height !== h) {
      this.edgeCanvas.width = w;
      this.edgeCanvas.height = h;
    }
    return this.edgeCtx!;
  }

  drawWebcam(video: HTMLVideoElement, canvasW: number, canvasH: number) {
    const ctx = this.ctx;
    ctx.save();
    ctx.translate(canvasW, 0);
    ctx.scale(-1, 1);
    ctx.drawImage(video, 0, 0, canvasW, canvasH);
    ctx.restore();
  }

  drawDarkOverlay(canvasW: number, canvasH: number, _time: number, _isScanning: boolean) {
    const ctx = this.ctx;

    // Subtle edge vignette only — clean and minimal
    const vig = ctx.createRadialGradient(
      canvasW / 2, canvasH / 2, Math.min(canvasW, canvasH) * 0.35,
      canvasW / 2, canvasH / 2, Math.max(canvasW, canvasH) * 0.8
    );
    vig.addColorStop(0, 'rgba(0,0,0,0)');
    vig.addColorStop(1, 'rgba(0,0,0,0.4)');
    ctx.fillStyle = vig;
    ctx.fillRect(0, 0, canvasW, canvasH);
  }

  prepareXray(video: HTMLVideoElement, canvasW: number, canvasH: number) {
    // Silhouette layer
    const offCtx = this.ensureXray(canvasW, canvasH);
    offCtx.save();
    offCtx.filter = 'grayscale(1) contrast(1.6) brightness(0.55)';
    offCtx.translate(canvasW, 0);
    offCtx.scale(-1, 1);
    offCtx.drawImage(video, 0, 0, canvasW, canvasH);
    offCtx.restore();
    offCtx.filter = 'none';

    // Edge layer
    const edgeCtx = this.ensureEdge(canvasW, canvasH);
    edgeCtx.save();
    edgeCtx.filter = 'grayscale(1) invert(1) contrast(4) brightness(0.7)';
    edgeCtx.translate(canvasW, 0);
    edgeCtx.scale(-1, 1);
    edgeCtx.drawImage(video, 0, 0, canvasW, canvasH);
    edgeCtx.restore();
    edgeCtx.filter = 'none';
  }

  drawXrayInRect(rect: Rect, faceLandmarks: Point[][] | null, canvasW: number, canvasH: number, time: number) {
    const ctx = this.ctx;
    if (!this.xrayCanvas || !this.edgeCanvas) return;
    if (rect.w <= 0 || rect.h <= 0) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();

    // 1. Dark base
    ctx.fillStyle = '#020510';
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // 2. Body silhouette
    ctx.globalCompositeOperation = 'multiply';
    ctx.globalAlpha = 0.6;
    ctx.drawImage(this.xrayCanvas, 0, 0);
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 3. Body glow — single pass with combined filter (was 3 passes, now 1)
    ctx.globalCompositeOperation = 'screen';
    ctx.globalAlpha = 0.55;
    ctx.filter = 'sepia(1) saturate(8) hue-rotate(190deg) brightness(2.2) blur(2px)';
    ctx.drawImage(this.edgeCanvas, 0, 0);
    ctx.filter = 'none';
    ctx.globalCompositeOperation = 'source-over';
    ctx.globalAlpha = 1;

    // 4. Face glow
    let cx = rect.x + rect.w / 2;
    let cy = rect.y + rect.h / 2;
    if (faceLandmarks && faceLandmarks.length > 0) {
      const nose = faceLandmarks[0][1];
      if (nose) {
        cx = nose.x * canvasW;
        cy = nose.y * canvasH;
      }
    }

    const pulse = 0.85 + 0.15 * Math.sin(time * 2.5);
    const faceGlow = ctx.createRadialGradient(cx, cy, 0, cx, cy, Math.max(1, rect.h * 0.45));
    faceGlow.addColorStop(0, `rgba(180, 80, 200, ${0.12 * pulse})`);
    faceGlow.addColorStop(0.4, `rgba(100, 40, 160, ${0.06 * pulse})`);
    faceGlow.addColorStop(1, 'rgba(0, 0, 0, 0)');
    ctx.fillStyle = faceGlow;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    // 5. Ripple circles (reduced from 14 to 6)
    const maxRadius = Math.max(1, Math.max(rect.w, rect.h) * 0.85);
    for (let i = 0; i < 6; i++) {
      const phase = (time * 40 + i * (maxRadius / 6)) % maxRadius;
      const ratio = phase / maxRadius;
      const alpha = 0.09 * (1 - ratio) * (1 - ratio);
      if (alpha <= 0.005) continue;
      ctx.beginPath();
      ctx.arc(cx, cy, phase, 0, Math.PI * 2);
      ctx.strokeStyle = `rgba(80, 120, 220, ${alpha})`;
      ctx.lineWidth = 1;
      ctx.stroke();
    }

    // 6. Scan line
    const scanY = rect.y + ((time / 3.5) % 1) * rect.h;
    const scanGrad = ctx.createLinearGradient(rect.x, scanY - 15, rect.x, scanY + 15);
    scanGrad.addColorStop(0, 'rgba(100, 180, 255, 0)');
    scanGrad.addColorStop(0.5, 'rgba(140, 200, 255, 0.12)');
    scanGrad.addColorStop(1, 'rgba(100, 180, 255, 0)');
    ctx.fillStyle = scanGrad;
    ctx.fillRect(rect.x, scanY - 15, rect.w, 30);

    // 7. Vignette
    const vigGrad = ctx.createRadialGradient(
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(1, Math.min(rect.w, rect.h) * 0.25),
      rect.x + rect.w / 2, rect.y + rect.h / 2, Math.max(2, Math.max(rect.w, rect.h) * 0.7)
    );
    vigGrad.addColorStop(0, 'rgba(0,0,0,0)');
    vigGrad.addColorStop(1, 'rgba(0,2,15,0.45)');
    ctx.fillStyle = vigGrad;
    ctx.fillRect(rect.x, rect.y, rect.w, rect.h);

    ctx.restore();
  }

  drawSkeletonGlow(
    poseLandmarks: Point[][] | null,
    faceLandmarks: Point[][] | null,
    rect: Rect,
    canvasW: number,
    canvasH: number,
    time: number
  ) {
    const ctx = this.ctx;
    if (!poseLandmarks?.length && !faceLandmarks?.length) return;

    ctx.save();
    ctx.beginPath();
    ctx.rect(rect.x, rect.y, rect.w, rect.h);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    const pulse = 0.7 + 0.3 * Math.sin(time * 2);

    // === POSE SKELETON — single pass, no shadows ===
    if (poseLandmarks && poseLandmarks.length > 0) {
      const pose = poseLandmarks[0];
      const connections: [number, number][] = [
        [11, 12], [11, 23], [12, 24], [23, 24],
        [11, 13], [13, 15], [12, 14], [14, 16],
        [23, 25], [25, 27], [24, 26], [26, 28],
      ];

      // Single pass skeleton lines
      ctx.globalAlpha = 0.35 * pulse;
      ctx.strokeStyle = '#44EEFF';
      ctx.lineWidth = 2;
      ctx.beginPath();
      for (const [a, b] of connections) {
        if (a >= pose.length || b >= pose.length) continue;
        const ax = pose[a].x * canvasW, ay = pose[a].y * canvasH;
        const bx = pose[b].x * canvasW, by = pose[b].y * canvasH;
        ctx.moveTo(ax, ay);
        ctx.lineTo(bx, by);
      }
      ctx.stroke();

      // Joints — batch all into one path per color group
      const keyJoints = [11, 12, 13, 14, 15, 16, 23, 24, 25, 26, 27, 28];
      ctx.globalAlpha = 0.6 * pulse;
      ctx.fillStyle = '#00FFDD';
      ctx.beginPath();
      for (const i of keyJoints) {
        if (i >= pose.length) continue;
        const px = pose[i].x * canvasW;
        const py = pose[i].y * canvasH;
        if (px < rect.x || px > rect.x + rect.w || py < rect.y || py > rect.y + rect.h) continue;
        ctx.moveTo(px + 3, py);
        ctx.arc(px, py, 3, 0, Math.PI * 2);
      }
      ctx.fill();
    }

    // === FACE CONTOURS — single pass each, no shadows, no glow pass ===
    if (faceLandmarks && faceLandmarks.length > 0) {
      const face = faceLandmarks[0];

      const jawline = [10,338,297,332,284,251,389,356,454,323,361,288,397,365,379,378,400,377,152,148,176,149,150,136,172,58,132,93,234,127,162,21,54,103,67,109,10];
      const leftEye = [33,246,161,160,159,158,157,173,133,155,154,153,145,144,163,7,33];
      const rightEye = [362,398,384,385,386,387,388,466,263,249,390,373,374,380,381,382,362];
      const lipsOuter = [61,146,91,181,84,17,314,405,321,375,291,409,270,269,267,0,37,39,40,185,61];

      const contours = [
        { pts: jawline, color: '#CC44FF', width: 1.2, alpha: 0.25 },
        { pts: leftEye, color: '#00FFDD', width: 1, alpha: 0.3 },
        { pts: rightEye, color: '#00FFDD', width: 1, alpha: 0.3 },
        { pts: lipsOuter, color: '#FF2D78', width: 1, alpha: 0.3 },
      ];

      for (const contour of contours) {
        ctx.globalAlpha = contour.alpha * pulse;
        ctx.strokeStyle = contour.color;
        ctx.lineWidth = contour.width;
        ctx.beginPath();
        let started = false;
        for (const idx of contour.pts) {
          if (idx >= face.length) continue;
          const px = face[idx].x * canvasW;
          const py = face[idx].y * canvasH;
          if (!started) { ctx.moveTo(px, py); started = true; }
          else ctx.lineTo(px, py);
        }
        ctx.stroke();
      }
    }

    ctx.restore();
  }

  drawParticles(particles: Particle[], clipRect: Rect) {
    const ctx = this.ctx;
    ctx.save();
    ctx.beginPath();
    ctx.rect(clipRect.x, clipRect.y, clipRect.w, clipRect.h);
    ctx.clip();
    ctx.globalCompositeOperation = 'lighter';

    for (const p of particles) {
      if (!p.active) continue;
      const alpha = p.getAlpha();
      if (alpha <= 0.01) continue;
      ctx.globalAlpha = alpha * 0.8;
      ctx.fillStyle = p.color;
      ctx.beginPath();
      ctx.arc(p.x, p.y, p.size * 0.5, 0, Math.PI * 2);
      ctx.fill();
    }

    ctx.restore();
  }

  drawScanRectBorder(rect: Rect, _corners: ScanCorners, time: number) {
    const ctx = this.ctx;
    ctx.save();

    const pulse = 0.8 + 0.2 * Math.sin(time * 3);

    // Animated dashed border
    ctx.strokeStyle = `rgba(20, 140, 255, ${0.9 * pulse})`;
    ctx.lineWidth = 2;
    ctx.shadowColor = '#0066FF';
    ctx.shadowBlur = 15;
    ctx.setLineDash([12, 6]);
    ctx.lineDashOffset = -time * 40;
    ctx.strokeRect(rect.x, rect.y, rect.w, rect.h);
    ctx.setLineDash([]);
    ctx.shadowBlur = 0;

    // Corner brackets
    const bracketLen = 24;
    const corners = [
      { x: rect.x, y: rect.y, dx: 1, dy: 1 },
      { x: rect.x + rect.w, y: rect.y, dx: -1, dy: 1 },
      { x: rect.x, y: rect.y + rect.h, dx: 1, dy: -1 },
      { x: rect.x + rect.w, y: rect.y + rect.h, dx: -1, dy: -1 },
    ];

    ctx.strokeStyle = '#00FFCC';
    ctx.lineWidth = 2.5;
    ctx.globalAlpha = 0.9 * pulse;

    // Batch all corner lines into one path
    ctx.beginPath();
    for (const cp of corners) {
      ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(cp.x + bracketLen * cp.dx, cp.y);
      ctx.moveTo(cp.x, cp.y);
      ctx.lineTo(cp.x, cp.y + bracketLen * cp.dy);
    }
    ctx.stroke();

    // Corner dots
    ctx.fillStyle = '#ffffff';
    ctx.globalAlpha = 1;
    ctx.beginPath();
    for (const cp of corners) {
      ctx.moveTo(cp.x + 3, cp.y);
      ctx.arc(cp.x, cp.y, 3, 0, Math.PI * 2);
    }
    ctx.fill();

    // Size label
    ctx.globalAlpha = 0.5 * pulse;
    ctx.fillStyle = '#00bfff';
    ctx.font = '10px Orbitron, monospace';
    ctx.textAlign = 'left';
    ctx.fillText(`${Math.round(rect.w)}x${Math.round(rect.h)}`, rect.x + 30, rect.y - 6);

    ctx.restore();
  }

  drawIdleText(_canvasW: number, _canvasH: number, _time: number) {
    // Idle state is now handled entirely by the HUD overlay (HTML/CSS)
    // No canvas drawing needed — keeps the webcam feed clean
  }

  clear(canvasW: number, canvasH: number) {
    this.ctx.clearRect(0, 0, canvasW, canvasH);
  }
}
