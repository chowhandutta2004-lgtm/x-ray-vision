declare module '@mediapipe/tasks-vision' {
  export interface BaseOptions {
    modelAssetPath?: string;
    modelAssetBuffer?: Uint8Array;
    delegate?: 'GPU' | 'CPU';
  }

  export interface VisionTaskOptions {
    baseOptions: BaseOptions;
    runningMode: 'IMAGE' | 'VIDEO';
  }

  export interface FaceLandmarkerOptions extends VisionTaskOptions {
    numFaces?: number;
    minFaceDetectionConfidence?: number;
    minFacePresenceConfidence?: number;
    minTrackingConfidence?: number;
    outputFaceBlendshapes?: boolean;
    outputFacialTransformationMatrixes?: boolean;
  }

  export interface HandLandmarkerOptions extends VisionTaskOptions {
    numHands?: number;
    minHandDetectionConfidence?: number;
    minHandPresenceConfidence?: number;
    minTrackingConfidence?: number;
  }

  export interface PoseLandmarkerOptions extends VisionTaskOptions {
    numPoses?: number;
    minPoseDetectionConfidence?: number;
    minPosePresenceConfidence?: number;
    minTrackingConfidence?: number;
    outputSegmentationMasks?: boolean;
  }

  export interface NormalizedLandmark {
    x: number;
    y: number;
    z: number;
    visibility?: number;
  }

  export interface FaceLandmarkerResult {
    faceLandmarks: NormalizedLandmark[][];
    faceBlendshapes?: unknown[];
    facialTransformationMatrixes?: unknown[];
  }

  export interface HandLandmarkerResult {
    landmarks: NormalizedLandmark[][];
    worldLandmarks: NormalizedLandmark[][];
    handednesses: unknown[][];
  }

  export interface PoseLandmarkerResult {
    landmarks: NormalizedLandmark[][];
    worldLandmarks: NormalizedLandmark[][];
    segmentationMasks?: unknown[];
  }

  export class FaceLandmarker {
    static createFromOptions(
      vision: unknown,
      options: FaceLandmarkerOptions
    ): Promise<FaceLandmarker>;
    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): FaceLandmarkerResult;
    close(): void;
  }

  export class HandLandmarker {
    static createFromOptions(
      vision: unknown,
      options: HandLandmarkerOptions
    ): Promise<HandLandmarker>;
    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): HandLandmarkerResult;
    close(): void;
  }

  export class PoseLandmarker {
    static createFromOptions(
      vision: unknown,
      options: PoseLandmarkerOptions
    ): Promise<PoseLandmarker>;
    detectForVideo(
      video: HTMLVideoElement,
      timestamp: number
    ): PoseLandmarkerResult;
    close(): void;
  }

  export class FilesetResolver {
    static forVisionTasks(wasmPath: string): Promise<unknown>;
  }
}
