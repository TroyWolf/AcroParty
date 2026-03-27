import { useState, useEffect, useRef } from 'react';
import styles from './IntroScreen.module.css';

const ACRO = 'ACRO'.split('');
const PARTY = 'PARTY'.split('');
const SWIRL_MS = 4000;
const AUTO_ADVANCE_MS = 9500;

const LETTER_POOL = 'ABCDEFGHIJKLMNOPRSTUVWY';
const COLORS = ['#ff2200', '#ffff00', '#00ffff', '#ffffff', '#4488ff', '#ff8800'];

function rndLetter() {
  return LETTER_POOL[Math.floor(Math.random() * LETTER_POOL.length)];
}

export default function IntroScreen({ onDone }) {
  const [phase, setPhase] = useState('swirl');
  const canvasRef = useRef(null);
  const rafRef = useRef(null);

  useEffect(() => {
    const swirl = setTimeout(() => setPhase('reveal'), SWIRL_MS);
    const done  = setTimeout(onDone, AUTO_ADVANCE_MS);
    return () => { clearTimeout(swirl); clearTimeout(done); };
  }, [onDone]);

  useEffect(() => {
    if (phase !== 'swirl') return;
    const canvas = canvasRef.current;
    if (!canvas) return;

    canvas.width  = window.innerWidth;
    canvas.height = window.innerHeight;
    const ctx = canvas.getContext('2d');
    const cx = canvas.width / 2;
    const cy = canvas.height / 2;

    const letters = Array.from({ length: 52 }, () => {
      const angle = Math.random() * Math.PI * 2;
      const dist  = 180 + Math.random() * Math.min(canvas.width, canvas.height) * 0.42;
      return {
        char:      rndLetter(),
        x:         cx + Math.cos(angle) * dist,
        y:         cy + Math.sin(angle) * dist,
        vx:        (Math.random() - 0.5) * 600,
        vy:        (Math.random() - 0.5) * 600,
        size:      80 + Math.random() * 140,
        rotation:  Math.random() * Math.PI * 2,
        rotSpeed:  (Math.random() - 0.5) * 2.5,
        color:     COLORS[Math.floor(Math.random() * COLORS.length)],
        alpha:     0.45 + Math.random() * 0.55,
        startX:    null,
        startY:    null,
      };
    });

    let startTime = null;
    let lastTs    = null;
    const CONVERGE_START = 0.65; // fraction of SWIRL_MS when letters start converging

    function draw(ts) {
      if (!startTime) startTime = ts;
      if (!lastTs)    lastTs    = ts;
      const dt      = Math.min((ts - lastTs) / 1000, 0.05); // seconds, capped
      lastTs        = ts;
      const elapsed = ts - startTime;
      const t       = Math.min(elapsed / SWIRL_MS, 1);

      // ct: 0 during drift, 0→1 during convergence
      const ct     = t < CONVERGE_START ? 0 : (t - CONVERGE_START) / (1 - CONVERGE_START);
      const eased  = ct * ct * ct; // cubic ease-in: slow then slam

      ctx.clearRect(0, 0, canvas.width, canvas.height);

      for (const p of letters) {
        if (t < CONVERGE_START) {
          // Free drift
          p.x        += p.vx * dt;
          p.y        += p.vy * dt;
          p.rotation += p.rotSpeed * dt;
          p.startX    = null; // reset so we capture position at converge start
          p.startY    = null;
        } else {
          // Capture position at the moment convergence begins
          if (p.startX === null) {
            p.startX = p.x;
            p.startY = p.y;
          }
          // Lerp toward center (cubic ease-in = slow start, fast finish)
          p.x        = p.startX + (cx - p.startX) * eased;
          p.y        = p.startY + (cy - p.startY) * eased;
          p.rotation += p.rotSpeed * dt * (1 + eased * 10);
        }

        // Fade out as they slam in (last 20% of convergence)
        const fadeT = ct > 0.8 ? 1 - (ct - 0.8) / 0.2 : 1;
        const alpha = p.alpha * fadeT;
        if (alpha < 0.01) continue;

        ctx.save();
        ctx.translate(p.x, p.y);
        ctx.rotate(p.rotation);
        ctx.globalAlpha  = alpha;
        ctx.font         = `900 ${p.size}px Impact, 'Arial Narrow', Arial, sans-serif`;
        ctx.textAlign    = 'center';
        ctx.textBaseline = 'middle';
        ctx.shadowBlur   = 10 + eased * 30;
        ctx.shadowColor  = p.color;
        ctx.fillStyle    = p.color;
        ctx.fillText(p.char, 0, 0);
        ctx.restore();
      }

      // Explosion flash in the final 20% of convergence
      if (ct > 0.8) {
        const ft   = (ct - 0.8) / 0.2;
        const rad  = 30 + 280 * ft;
        const grad = ctx.createRadialGradient(cx, cy, 0, cx, cy, rad);
        grad.addColorStop(0,    `rgba(255, 255, 255, ${ft * 0.98})`);
        grad.addColorStop(0.15, `rgba(220, 230, 255, ${ft * 0.8})`);
        grad.addColorStop(0.4,  `rgba(160, 180, 255, ${ft * 0.45})`);
        grad.addColorStop(1,    'transparent');
        ctx.globalAlpha = 1;
        ctx.fillStyle   = grad;
        ctx.beginPath();
        ctx.arc(cx, cy, rad, 0, Math.PI * 2);
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
                <span key={i} className={styles.letter} style={{ animationDelay: `${i * 60}ms` }}>
                  {l}
                </span>
              ))}
            </span>
            <span className={styles.party}>
              {PARTY.map((l, i) => (
                <span key={i} className={styles.letter} style={{ animationDelay: `${(ACRO.length + i) * 60}ms` }}>
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
