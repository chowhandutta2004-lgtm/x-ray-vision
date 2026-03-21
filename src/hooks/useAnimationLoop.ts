'use client';

import { useEffect, useRef } from 'react';

export function useAnimationLoop(
  callback: (dt: number, time: number) => void,
  active: boolean
) {
  const callbackRef = useRef(callback);
  callbackRef.current = callback;

  useEffect(() => {
    if (!active) return;

    let rafId: number;
    let lastTime = 0;

    function loop(timestamp: number) {
      if (lastTime === 0) lastTime = timestamp;
      const dt = Math.min((timestamp - lastTime) / 1000, 0.05); // cap at 50ms
      lastTime = timestamp;

      callbackRef.current(dt, timestamp / 1000);

      rafId = requestAnimationFrame(loop);
    }

    rafId = requestAnimationFrame(loop);
    return () => cancelAnimationFrame(rafId);
  }, [active]);
}
