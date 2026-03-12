import { useCountdown } from '../../hooks/useCountdown.js';
import styles from './Countdown.module.css';

export default function Countdown({ phaseEndsAt, total }) {
  const remaining = useCountdown(phaseEndsAt);
  const pct = total ? remaining / total : 1;
  const urgent = remaining <= 10;

  return (
    <div className={`${styles.wrap} ${urgent ? styles.urgent : ''}`}>
      <span className={styles.number}>{remaining}</span>
      <div className={styles.bar}>
        <div className={styles.fill} style={{ width: `${pct * 100}%` }} />
      </div>
    </div>
  );
}
