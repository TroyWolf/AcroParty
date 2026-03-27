import { useRef, useEffect, useState } from 'react';

export function useAudio(src) {
  const audioRef = useRef(null);
  const startedRef = useRef(false);
  const [muted, setMuted] = useState(() => localStorage.getItem('musicMuted') === 'true');

  useEffect(() => {
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.8;
    audio.muted = muted;
    audioRef.current = audio;

    function tryPlay() {
      audio.play().then(() => {
        startedRef.current = true;
        document.removeEventListener('pointerdown', tryPlay);
      }).catch(() => {});
    }

    audio.play().then(() => { startedRef.current = true; }).catch(() => {
      document.addEventListener('pointerdown', tryPlay);
    });

    return () => {
      audio.pause();
      document.removeEventListener('pointerdown', tryPlay);
    };
  }, [src]);

  useEffect(() => {
    if (audioRef.current) audioRef.current.muted = muted;
    localStorage.setItem('musicMuted', muted);
  }, [muted]);

  return { muted, toggleMute: () => setMuted(m => !m) };
}
