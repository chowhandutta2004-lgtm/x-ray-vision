import {
  FilesetResolver,
  FaceLandmarker,
  HandLandmarker,
  PoseLandmarker,
} from '@mediapipe/tasks-vision';
import { Point, TrackingResult } from '@/types';

// Lower = more responsive, higher = smoother but laggier
const HAND_SMOOTH = 0.08;  // nearly raw — hands control the rectangle, must be instant
const FACE_SMOOTH = 0.35;  // face can be smoother (just visual)
const POSE_SMOOTH = 0.35;  // pose can be smoother (just visual)

export class MediaPipeTracker {
  private faceLandmarker: FaceLandmarker | null = null;
  private handLandmarker: HandLandmarker | null = null;
  private poseLandmarker: PoseLandmarker | null = null;
  private ready = false;

  // Smoothed landmark buffers
  private prevFace: Point[][] = [];
  private prevHands: Point[][] = [];
  private prevPose: Point[][] = [];
  private lastResult: TrackingResult = { faceLandmarks: null, handLandmarks: null, poseLandmarks: null };
  private poseDropFrames = 0;
  private faceDropFrames = 0;
  private handDropFrames = 0;
  private readonly HOLD_FRAMES = 8;

  // Frame counter for staggering heavy models
  private frameCount = 0;

  async init(onProgress?: (msg: string) => void): Promise<void> {
    const originalError = console.error;
    const suppress = (...args: unknown[]) => {
      const m = String(args[0] || '');
      if (m.includes('INFO:') || m.includes('XNNPACK') || m.includes('gl_context')) return;
      originalError.apply(console, args);
    };
    console.error = suppress;

    try {
      onProgress?.('Loading vision WASM...');
      const vision = await FilesetResolver.forVisionTasks(
        'https://cdn.jsdelivr.net/npm/@mediapipe/tasks-vision@latest/wasm'
      );

      onProgress?.('Loading face model...');
      this.faceLandmarker = await FaceLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/face_landmarker/face_landmarker/float16/1/face_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numFaces: 1,
        minFaceDetectionConfidence: 0.3,
        minFacePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
        outputFaceBlendshapes: false,
        outputFacialTransformationMatrixes: false,
      });

      onProgress?.('Loading hand model...');
      this.handLandmarker = await HandLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/hand_landmarker/hand_landmarker/float16/1/hand_landmarker.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numHands: 2,
        minHandDetectionConfidence: 0.3,
        minHandPresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      onProgress?.('Loading pose model...');
      this.poseLandmarker = await PoseLandmarker.createFromOptions(vision, {
        baseOptions: {
          modelAssetPath:
            'https://storage.googleapis.com/mediapipe-models/pose_landmarker/pose_landmarker_full/float16/1/pose_landmarker_full.task',
          delegate: 'GPU',
        },
        runningMode: 'VIDEO',
        numPoses: 1,
        minPoseDetectionConfidence: 0.3,
        minPosePresenceConfidence: 0.3,
        minTrackingConfidence: 0.3,
      });

      this.ready = true;
      onProgress?.('Ready!');
    } finally {
      console.error = originalError;
    }
  }

  isReady(): boolean {
    return this.ready;
  }

  private smoothLandmarks(prev: Point[][], raw: Point[][], factor: number): Point[][] {
    if (prev.length === 0) return raw.map(arr => arr.map(p => ({ ...p })));

    return raw.map((arr, i) => {
      const prevArr = i < prev.length ? prev[i] : null;
      if (!prevArr || prevArr.length !== arr.length) {
        return arr.map(p => ({ ...p }));
      }
      return arr.map((p, j) => ({
        x: prevArr[j].x * factor + p.x * (1 - factor),
        y: prevArr[j].y * factor + p.y * (1 - factor),
      }));
    });
  }

  detect(video: HTMLVideoElement, timestamp: number): TrackingResult {
    if (!this.ready || !this.faceLandmarker || !this.handLandmarker || !this.poseLandmarker) {
      return { faceLandmarks: null, handLandmarks: null, poseLandmarks: null };
    }

    this.frameCount++;

    const origErr = console.error;
    console.error = (...args: unknown[]) => {
      const m = String(args[0] || '');
      if (m.includes('INFO:') || m.includes('XNNPACK') || m.includes('gl_context')) return;
      origErr.apply(console, args);
    };

    // HANDS: detect EVERY frame (controls the scan rectangle — must be responsive)
    const handResult = this.handLandmarker.detectForVideo(video, timestamp);

    // FACE & POSE: detect every 2nd frame each, staggered
    // Frame 0: face, Frame 1: pose, Frame 2: face, Frame 3: pose ...
    let faceResult: ReturnType<FaceLandmarker['detectForVideo']> | null = null;
    let poseResult: ReturnType<PoseLandmarker['detectForVideo']> | null = null;

    if (this.frameCount % 2 === 0) {
      faceResult = this.faceLandmarker.detectForVideo(video, timestamp);
    } else {
      poseResult = this.poseLandmarker.detectForVideo(video, timestamp);
    }

    console.error = origErr;

    // --- HANDS (every frame, low smoothing) ---
    const rawHands: Point[][] = (handResult.landmarks || []).map((hand) =>
      hand.map((lm) => ({ x: 1 - lm.x, y: lm.y }))
    );

    let handLandmarks: Point[][] | null;
    if (rawHands.length > 0) {
      handLandmarks = this.smoothLandmarks(this.prevHands, rawHands, HAND_SMOOTH);
      this.prevHands = handLandmarks;
      this.handDropFrames = 0;
    } else {
      this.handDropFrames++;
      handLandmarks = this.handDropFrames <= this.HOLD_FRAMES && this.prevHands.length > 0
        ? this.prevHands
        : null;
      if (!handLandmarks) this.prevHands = [];
    }

    // --- FACE (every 2nd frame) ---
    let faceLandmarks = this.lastResult.faceLandmarks;
    if (faceResult) {
      const rawFace: Point[][] = (faceResult.faceLandmarks || []).map(
        (face) => face.map((lm) => ({ x: 1 - lm.x, y: lm.y }))
      );
      if (rawFace.length > 0) {
        faceLandmarks = this.smoothLandmarks(this.prevFace, rawFace, FACE_SMOOTH);
        this.prevFace = faceLandmarks;
        this.faceDropFrames = 0;
      } else {
        this.faceDropFrames++;
        faceLandmarks = this.faceDropFrames <= this.HOLD_FRAMES && this.prevFace.length > 0
          ? this.prevFace
          : null;
        if (!faceLandmarks) this.prevFace = [];
      }
    }

    // --- POSE (every 2nd frame, staggered) ---
    let poseLandmarks = this.lastResult.poseLandmarks;
    if (poseResult) {
      const rawPose: Point[][] = (poseResult.landmarks || []).map((pose) =>
        pose.map((lm) => ({ x: 1 - lm.x, y: lm.y }))
      );
      if (rawPose.length > 0) {
        poseLandmarks = this.smoothLandmarks(this.prevPose, rawPose, POSE_SMOOTH);
        this.prevPose = poseLandmarks;
        this.poseDropFrames = 0;
      } else {
        this.poseDropFrames++;
        poseLandmarks = this.poseDropFrames <= this.HOLD_FRAMES && this.prevPose.length > 0
          ? this.prevPose
          : null;
        if (!poseLandmarks) this.prevPose = [];
      }
    }

    this.lastResult = { faceLandmarks, handLandmarks, poseLandmarks };
    return this.lastResult;
  }

  destroy() {
    this.faceLandmarker?.close();
    this.handLandmarker?.close();
    this.poseLandmarker?.close();
    this.ready = false;
  }
}
