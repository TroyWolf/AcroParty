import { useState, useEffect, useRef } from 'react';
import styles from './IntroScreen.module.css';

const ACRO = 'ACRO'.split('');
const PARTY = 'PARTY'.split('');
const SWIRL_MS = 4000;
const AUTO_ADVANCE_MS = 9500;

export default function IntroScreen({ onDone }) {
  const [phase, setPhase] = useState('swirl');
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  // Phase timing
  useEffect(() => {
    const swirl = setTimeout(() => setPhase('reveal'), SWIRL_MS);
    const done  = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => { clearTimeout(swirl); clearTimeout(done); };
  }, [onDone]);

  // Canvas particle vortex
  useEffect(() => {
    if (phase !== 'swirl') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const particles = Array.from({ length: 70 }, () => ({
      angle:           Math.random() * Math.PI * 2,
      radius:          220 + Math.random() * 380,
      angularVelocity: -(1.8 + Math.random() * 1.2), // clockwise
      size:            1.5 + Math.random() * 2,
      alpha:           0.5 + Math.random() * 0.5,
    }));

    let startTime = null;

    function draw(ts) {
      if (!startTime) startTime = ts;
      const elapsed = ts - startTime;
      const t = Math.min(elapsed / SWIRL_MS, 1);
      const eased = t * t * t; // cubic ease-in: slow→fast

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of particles) {
        const r = p.radius * (1 - eased);
        const θ = p.angle + p.angularVelocity * (elapsed / 1000);
        const x = cx + r * Math.cos(θ);
        const y = cy + r * Math.sin(θ);
        const brightness = 0.25 + eased * 0.75;
        const sz = p.size * (1 + eased * 2.5);

        ctx.beginPath();
        ctx.arc(x, y, sz, 0, Math.PI * 2);
        ctx.fillStyle = `rgba(180, 215, 255, ${p.alpha * brightness})`;
        ctx.shadowBlur  = 6 + eased * 18;
        ctx.shadowColor = 'rgba(120, 180, 255, 0.9)';
        ctx.fill();
      }

      // Convergence flash in the final 15%
      if (t > 0.85) {
        const ft = (t - 0.85) / 0.15;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, 180 * ft + 10);
        grad.addColorStop(0,   `rgba(255, 255, 255, ${ft * 0.95})`);
        grad.addColorStop(0.2, `rgba(200, 220, 255, ${ft * 0.6})`);
        grad.addColorStop(1,   'transparent');
        ctx.shadowBlur = 0;
        ctx.fillStyle = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, 180 * ft + 10, 0, Math.PI * 2);
        ctx.fill();
      }

      if (t < 1) {
        rafRef.current = requestAnimationFrame(draw);
      }
    }

    rafRef.current = requestAnimationFrame(draw);
    return () => { if (rafRef.current) cancelAnimationFrame(rafRef.current); };
  }, [phase]);

  return (
    <div className={styles.screen} onClick={onDone}>
      <canvas
        ref={canvasRef}
        className={`${styles.canvas} ${phase === 'reveal' ? styles.canvasFadeOut : ''}`}
      />
      {phase === 'reveal' && (
        <>
          <div className={styles.ovalWrap}>
            <div className={styles.oval}>
              <div className={styles.lightBar} />
            </div>
          </div>
          <div className={styles.burst} />
          <div className={styles.star} />
          <div className={styles.titleWrap}>
            <span className={styles.acro}>
              {ACRO.map((l, i) => (
                <span key={i} className={styles.letter} style={{ animationDelay: `${1300 + i * 150}ms` }}>
                  {l}
                </span>
              ))}
            </span>
            <span className={styles.party}>
              {PARTY.map((l, i) => (
                <span key={i} className={styles.letter} style={{ animationDelay: `${1300 + (ACRO.length + i) * 150}ms` }}>
                  {l}
                </span>
              ))}
            </span>
          </div>
          <div className={styles.subtitle}>THE ACRONYM PARTY GAME</div>
        </>
      )}
    </div>
  );
}
