import { useGame } from '../../context/GameContext.jsx';
import styles from './CategoryReveal.module.css';

export default function CategoryReveal() {
  const { state } = useGame();
  const { round } = state;

  return (
    <div className={styles.wrap}>
      <p className={styles.roundLabel}>
        Round {round.roundNumber} of {round.totalRounds}
      </p>
      <p className={styles.categoryLabel}>Category</p>
      <h2 className={styles.categoryName}>{round.category?.label}</h2>
      <p className={styles.hint}>{round.category?.hint}</p>
      <p className={styles.preparing}>Preparing your acronym<span className="blink">...</span></p>
    </div>
  );
}
