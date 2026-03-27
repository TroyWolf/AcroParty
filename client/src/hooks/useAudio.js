import { useRef, useEffect, useState } from 'react';

export function useAudio(src) {
  const audioRef = useRef(null);
  const startedRef = useRef(false);
  const [muted, setMuted] = useState(() => localStorage.getItem('musicMuted') === 'true');

  useEffect(() => {
    let active = true;
    const audio = new Audio(src);
    audio.loop = true;
    audio.volume = 0.8;
    audio.muted = muted;
    audioRef.current = audio;

    function tryPlay() {
      if (!active) return;
      audio.play().then(() => {
        if (active) startedRef.current = true;
        document.removeEventListener('pointerdown', tryPlay);
      }).catch(() => {});
    }

    audio.play().then(() => {
      if (active) startedRef.current = true;
    }).catch(() => {
      if (active) document.addEventListener('pointerdown', tryPlay);
    });

    return () => {
      active = false;
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
