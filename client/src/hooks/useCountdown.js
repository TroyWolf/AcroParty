import { useState, useEffect } from 'react';

/**
 * Returns remaining seconds based on a server-provided epoch timestamp.
 * Uses rAF-based polling to avoid drift.
 */
export function useCountdown(phaseEndsAt) {
  const [remaining, setRemaining] = useState(0);

  useEffect(() => {
    if (!phaseEndsAt) {
      setRemaining(0);
      return;
    }

    let rafId;

    function tick() {
      const secs = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
      setRemaining(secs);
      if (secs > 0) {
        rafId = requestAnimationFrame(tick);
      }
    }

    rafId = requestAnimationFrame(tick);
    return () => cancelAnimationFrame(rafId);
  }, [phaseEndsAt]);

  return remaining;
}
