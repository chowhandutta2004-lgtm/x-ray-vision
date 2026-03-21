'use client';

import { useState, useCallback, useEffect } from 'react';
import { AppState } from '@/types';

interface HudOverlayProps {
  appState: AppState;
  canvasRef: React.RefObject<HTMLCanvasElement | null>;
  hasFace: boolean;
  hasHands: boolean;
  hasPose: boolean;
  fps: number;
}

export default function HudOverlay({
  appState,
  canvasRef,
  hasFace,
  hasHands,
  hasPose,
  fps,
}: HudOverlayProps) {
  const [flash, setFlash] = useState(false);
  const [toast, setToast] = useState<string | null>(null);

  const handleScreenshot = useCallback(() => {
    const canvas = canvasRef.current;
    if (!canvas) return;

    setFlash(true);
    setTimeout(() => setFlash(false), 400);

    canvas.toBlob((blob) => {
      if (!blob) return;
      const url = URL.createObjectURL(blob);
      const a = document.createElement('a');
      a.href = url;
      a.download = `xray-capture-${Date.now()}.png`;
      a.click();
      URL.revokeObjectURL(url);
      setToast('CAPTURED');
      setTimeout(() => setToast(null), 2000);
    }, 'image/png');
  }, [canvasRef]);

  const handleFullscreen = useCallback(() => {
    if (document.fullscreenElement) {
      document.exitFullscreen();
    } else {
      document.documentElement.requestFullscreen();
    }
  }, []);

  useEffect(() => {
    const onKey = (e: KeyboardEvent) => {
      if (appState === 'loading') return;
      if (e.code === 'Space') {
        e.preventDefault();
        handleScreenshot();
      }
      if (e.code === 'KeyF') {
        handleFullscreen();
      }
    };
    window.addEventListener('keydown', onKey);
    return () => window.removeEventListener('keydown', onKey);
  }, [appState, handleScreenshot, handleFullscreen]);

  if (appState === 'loading') return null;

  const isScanning = appState === 'scanning';

  return (
    <div className="hud-overlay">
      {/* Top bar */}
      <div className="hud-top">
        <div className="hud-brand">
          <span className="hud-brand-icon">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5">
              <circle cx="12" cy="12" r="10" />
              <circle cx="12" cy="12" r="4" />
              <line x1="12" y1="2" x2="12" y2="6" />
              <line x1="12" y1="18" x2="12" y2="22" />
              <line x1="2" y1="12" x2="6" y2="12" />
              <line x1="18" y1="12" x2="22" y2="12" />
            </svg>
          </span>
          <span className="hud-brand-text">X-RAY</span>
        </div>

        <div className="hud-top-right">
          <div className="hud-indicators">
            <div className={`hud-indicator ${hasFace ? 'on' : ''}`}>
              <span className="hud-indicator-dot" />
              <span>FACE</span>
            </div>
            <div className={`hud-indicator ${hasHands ? 'on' : ''}`}>
              <span className="hud-indicator-dot" />
              <span>HANDS</span>
            </div>
            <div className={`hud-indicator ${hasPose ? 'on' : ''}`}>
              <span className="hud-indicator-dot" />
              <span>BODY</span>
            </div>
          </div>
          <div className="hud-fps">{fps}</div>
        </div>
      </div>

      {/* Center prompt when idle */}
      {!isScanning && (
        <div className="hud-idle-prompt">
          <div className="hud-idle-hands">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M18 11V6a2 2 0 00-4 0v5" />
              <path d="M14 10V4a2 2 0 00-4 0v6" />
              <path d="M10 10.5V5a2 2 0 00-4 0v9" />
              <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-4.5-1-6.2-2.8L3 16" />
            </svg>
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round" style={{ transform: 'scaleX(-1)' }}>
              <path d="M18 11V6a2 2 0 00-4 0v5" />
              <path d="M14 10V4a2 2 0 00-4 0v6" />
              <path d="M10 10.5V5a2 2 0 00-4 0v9" />
              <path d="M18 11a2 2 0 014 0v3a8 8 0 01-8 8h-2c-2.5 0-4.5-1-6.2-2.8L3 16" />
            </svg>
          </div>
          <p className="hud-idle-text">Raise both hands to scan</p>
        </div>
      )}

      {/* Bottom bar */}
      <div className="hud-bottom">
        <div className={`hud-status-pill ${isScanning ? 'active' : ''}`}>
          <span className="hud-status-ping" />
          <span>{isScanning ? 'SCANNING' : 'READY'}</span>
        </div>

        <div className="hud-actions">
          <button className="hud-icon-btn" onClick={handleScreenshot} title="Capture (Space)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M23 19a2 2 0 01-2 2H3a2 2 0 01-2-2V8a2 2 0 012-2h4l2-3h6l2 3h4a2 2 0 012 2z" />
              <circle cx="12" cy="13" r="4" />
            </svg>
          </button>
          <button className="hud-icon-btn" onClick={handleFullscreen} title="Fullscreen (F)">
            <svg viewBox="0 0 24 24" fill="none" stroke="currentColor" strokeWidth="1.5" strokeLinecap="round" strokeLinejoin="round">
              <path d="M8 3H5a2 2 0 00-2 2v3m18 0V5a2 2 0 00-2-2h-3m0 18h3a2 2 0 002-2v-3M3 16v3a2 2 0 002 2h3" />
            </svg>
          </button>
        </div>
      </div>

      {flash && <div className="screenshot-flash" />}
      {toast && <div className="toast">{toast}</div>}
    </div>
  );
}
