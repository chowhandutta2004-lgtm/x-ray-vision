'use client';

import { useRef, useState, useCallback, useEffect } from 'react';
import { useWebcam } from '@/hooks/useWebcam';
import { useAnimationLoop } from '@/hooks/useAnimationLoop';
import { MediaPipeTracker } from '@/engine/MediaPipeTracker';
import { ParticleSystem } from '@/engine/ParticleSystem';
import { Renderer } from '@/engine/Renderer';
import { ScanRect } from '@/engine/ScanRect';
import { AppState, TrackingResult } from '@/types';
import LoadingScreen from './LoadingScreen';
import HudOverlay from './HudOverlay';

export default function XrayVision() {
  const canvasRef = useRef<HTMLCanvasElement>(null);
  const trackerRef = useRef<MediaPipeTracker | null>(null);
  const particlesRef = useRef<ParticleSystem | null>(null);
  const rendererRef = useRef<Renderer | null>(null);
  const scanRectRef = useRef<ScanRect | null>(null);
  const trackingRef = useRef<TrackingResult>({
    faceLandmarks: null,
    handLandmarks: null,
    poseLandmarks: null,
  });
  const appStateRef = useRef<AppState>('loading');

  const [appState, setAppState] = useState<AppState>('loading');
  const [loadingMsg, setLoadingMsg] = useState('Initializing...');
  const [hasFace, setHasFace] = useState(false);
  const [hasHands, setHasHands] = useState(false);
  const [hasPose, setHasPose] = useState(false);
  const [fps, setFps] = useState(0);

  const fpsFrames = useRef(0);
  const fpsLastTime = useRef(0);

  useEffect(() => {
    appStateRef.current = appState;
  }, [appState]);

  const { videoRef, ready: webcamReady, error: webcamError } = useWebcam();

  useEffect(() => {
    particlesRef.current = new ParticleSystem();
    scanRectRef.current = new ScanRect();
  }, []);

  useEffect(() => {
    if (!webcamReady) return;

    const tracker = new MediaPipeTracker();
    trackerRef.current = tracker;

    tracker
      .init((msg) => setLoadingMsg(msg))
      .then(() => setAppState('idle'))
      .catch((err) => {
        console.error('MediaPipe init failed:', err);
        setLoadingMsg('Failed to load models. Please refresh.');
      });

    return () => tracker.destroy();
  }, [webcamReady]);

  const onFrame = useCallback(
    (dt: number, time: number) => {
      const video = videoRef.current;
      const canvas = canvasRef.current;
      const tracker = trackerRef.current;
      const particles = particlesRef.current;
      const scanRectCalc = scanRectRef.current;

      if (!video || !canvas || !particles || !scanRectCalc) return;

      if (!rendererRef.current) {
        const ctx = canvas.getContext('2d', { willReadFrequently: false });
        if (!ctx) return;
        rendererRef.current = new Renderer(ctx);
      }
      const renderer = rendererRef.current;

      if (
        canvas.width !== video.videoWidth ||
        canvas.height !== video.videoHeight
      ) {
        canvas.width = video.videoWidth || 1280;
        canvas.height = video.videoHeight || 720;
      }

      const cw = canvas.width;
      const ch = canvas.height;

      // FPS counter
      fpsFrames.current++;
      if (time - fpsLastTime.current >= 1) {
        setFps(fpsFrames.current);
        fpsFrames.current = 0;
        fpsLastTime.current = time;
      }

      // Detection
      if (tracker?.isReady() && video.readyState >= 2) {
        trackingRef.current = tracker.detect(video, performance.now());
      }

      const { faceLandmarks, handLandmarks, poseLandmarks } = trackingRef.current;

      // Update tracking indicators
      if (fpsFrames.current === 1) {
        setHasFace(!!(faceLandmarks && faceLandmarks.length > 0));
        setHasHands(!!(handLandmarks && handLandmarks.length > 0));
        setHasPose(!!(poseLandmarks && poseLandmarks.length > 0));
      }

      // Scan rect from hands
      const hasHandsNow = handLandmarks !== null && handLandmarks.length >= 2;
      const scanResult = hasHandsNow
        ? scanRectCalc.update(handLandmarks!, cw, ch)
        : scanRectCalc.update([], cw, ch);

      // Update state
      const currentState = appStateRef.current;
      if (currentState !== 'loading') {
        if (scanResult && currentState !== 'scanning') setAppState('scanning');
        else if (!scanResult && currentState !== 'idle') setAppState('idle');
      }

      const isScanning = !!scanResult;

      // === RENDER ===
      renderer.clear(cw, ch);
      renderer.drawWebcam(video, cw, ch);
      renderer.drawDarkOverlay(cw, ch, time, isScanning);

      if (scanResult) {
        const { rect, corners } = scanResult;

        renderer.prepareXray(video, cw, ch);
        renderer.drawXrayInRect(rect, faceLandmarks, cw, ch, time);
        renderer.drawSkeletonGlow(poseLandmarks, faceLandmarks, rect, cw, ch, time);

        particles.update(dt, faceLandmarks, poseLandmarks, rect, cw, ch);
        const activeParticles = particles.getActiveParticles();
        renderer.drawParticles(activeParticles, rect);

        renderer.drawScanRectBorder(rect, corners, time);
      } else {
        particles.clear();
        renderer.drawIdleText(cw, ch, time);
      }
    },
    [videoRef]
  );

  useAnimationLoop(onFrame, appState !== 'loading');

  if (webcamError) {
    return (
      <div
        style={{
          position: 'fixed',
          inset: 0,
          display: 'flex',
          alignItems: 'center',
          justifyContent: 'center',
          background: '#000',
          color: '#ff4444',
          fontFamily: "'Rajdhani', system-ui",
          padding: '20px',
          textAlign: 'center',
        }}
      >
        <div>
          <h2 style={{ fontFamily: "'Orbitron', monospace", letterSpacing: '4px', marginBottom: '16px' }}>
            CAMERA ACCESS REQUIRED
          </h2>
          <p>{webcamError}</p>
          <p style={{ color: '#888', marginTop: '12px' }}>
            Please allow camera access and refresh the page.
          </p>
        </div>
      </div>
    );
  }

  return (
    <>
      <video ref={videoRef} style={{ display: 'none' }} playsInline muted />
      <canvas
        ref={canvasRef}
        style={{
          position: 'fixed',
          inset: 0,
          width: '100vw',
          height: '100vh',
          objectFit: 'cover',
          background: '#000',
          display: appState === 'loading' ? 'none' : 'block',
        }}
      />
      <HudOverlay
        appState={appState}
        canvasRef={canvasRef}
        hasFace={hasFace}
        hasHands={hasHands}
        hasPose={hasPose}
        fps={fps}
      />
      {appState === 'loading' && <LoadingScreen message={loadingMsg} />}
    </>
  );
}
