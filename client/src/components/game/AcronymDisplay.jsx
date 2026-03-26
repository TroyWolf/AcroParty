import { useState, useEffect, useRef } from 'react';
import styles from './AcronymDisplay.module.css';

const LETTER_INTERVAL_MS = 500;

export default function AcronymDisplay({ acronym }) {
  const [revealedCount, setRevealedCount] = useState(0);
  const audioRef = useRef(null);

  useEffect(() => {
    if (!acronym) return;
    setRevealedCount(0);
    audioRef.current = new Audio('/sounds/letter-drop.mp3');

    const timeouts = acronym.split('').map((_, i) =>
      setTimeout(() => {
        setRevealedCount(i + 1);
        const sfx = audioRef.current.cloneNode();
        sfx.play().catch(() => {});
      }, i * LETTER_INTERVAL_MS)
    );

    return () => timeouts.forEach(clearTimeout);
  }, [acronym]);

  if (!acronym) return null;

  return (
    <div className={styles.container}>
      {acronym.split('').slice(0, revealedCount).map((letter, i) => (
        <span key={i} className={styles.letter}>
          {letter}
        </span>
      ))}
    </div>
  );
}
