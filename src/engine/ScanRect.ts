import { Point, Rect } from '@/types';

export interface ScanCorners {
  topLeft: Point;
  topRight: Point;
  bottomLeft: Point;
  bottomRight: Point;
}

// Each hand "holds" two corners of the rectangle:
// - Middle finger tip (12) = top corner (the highest point of the hand)
// - Wrist (0) = bottom corner (the base of the hand)
const TOP_FINGER = 12; // middle finger tip
const BOTTOM_ANCHOR = 0; // wrist

const SMOOTH = 0.75; // high = snappy, low = laggy

export class ScanRect {
  private smoothedCorners: ScanCorners | null = null;
  private lostFrames = 0;

  update(
    handLandmarks: Point[][],
    canvasW: number,
    canvasH: number
  ): { rect: Rect; corners: ScanCorners } | null {
    if (handLandmarks.length < 2) {
      this.lostFrames++;
      if (this.lostFrames > 30) {
        this.smoothedCorners = null;
        return null;
      }
      if (this.smoothedCorners) {
        const c = this.smoothedCorners;
        return {
          rect: this.cornersToRect(c),
          corners: this.cloneCorners(c),
        };
      }
      return null;
    }

    this.lostFrames = 0;

    const hand0 = handLandmarks[0];
    const hand1 = handLandmarks[1];

    // Determine left vs right hand by their middle finger tip x
    const x0 = hand0[TOP_FINGER].x;
    const x1 = hand1[TOP_FINGER].x;

    const leftHand = x0 < x1 ? hand0 : hand1;
    const rightHand = x0 < x1 ? hand1 : hand0;

    // Left hand: top corner = middle finger tip, bottom corner = wrist
    const leftTop = leftHand[TOP_FINGER];
    const leftBottom = leftHand[BOTTOM_ANCHOR];

    // Right hand: top corner = middle finger tip, bottom corner = wrist
    const rightTop = rightHand[TOP_FINGER];
    const rightBottom = rightHand[BOTTOM_ANCHOR];

    // Build raw corners directly from finger positions
    // Top edge Y = min of both top fingers, Bottom edge Y = max of both bottom anchors
    // Left edge X = left hand's x, Right edge X = right hand's x
    const rawCorners: ScanCorners = {
      topLeft: { x: leftTop.x * canvasW, y: Math.min(leftTop.y, rightTop.y) * canvasH },
      topRight: { x: rightTop.x * canvasW, y: Math.min(leftTop.y, rightTop.y) * canvasH },
      bottomLeft: { x: leftBottom.x * canvasW, y: Math.max(leftBottom.y, rightBottom.y) * canvasH },
      bottomRight: { x: rightBottom.x * canvasW, y: Math.max(leftBottom.y, rightBottom.y) * canvasH },
    };

    // Smooth
    if (!this.smoothedCorners) {
      this.smoothedCorners = this.cloneCorners(rawCorners);
    } else {
      const sc = this.smoothedCorners;
      this.lerpPoint(sc.topLeft, rawCorners.topLeft, SMOOTH);
      this.lerpPoint(sc.topRight, rawCorners.topRight, SMOOTH);
      this.lerpPoint(sc.bottomLeft, rawCorners.bottomLeft, SMOOTH);
      this.lerpPoint(sc.bottomRight, rawCorners.bottomRight, SMOOTH);
    }

    const c = this.smoothedCorners;
    return {
      rect: this.cornersToRect(c),
      corners: this.cloneCorners(c),
    };
  }

  private lerpPoint(target: Point, raw: Point, f: number) {
    target.x += (raw.x - target.x) * f;
    target.y += (raw.y - target.y) * f;
  }

  private cornersToRect(c: ScanCorners): Rect {
    const x = c.topLeft.x;
    const y = c.topLeft.y;
    const w = c.topRight.x - c.topLeft.x;
    const h = c.bottomLeft.y - c.topLeft.y;
    return { x, y, w, h };
  }

  private cloneCorners(c: ScanCorners): ScanCorners {
    return {
      topLeft: { ...c.topLeft },
      topRight: { ...c.topRight },
      bottomLeft: { ...c.bottomLeft },
      bottomRight: { ...c.bottomRight },
    };
  }

  reset() {
    this.smoothedCorners = null;
    this.lostFrames = 0;
  }
}
