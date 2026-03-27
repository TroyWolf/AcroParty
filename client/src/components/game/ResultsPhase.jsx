import { useGame } from '../../context/GameContext.jsx';
import styles from './ResultsPhase.module.css';

export default function ResultsPhase() {
  const { state } = useGame();
  const { round } = state;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.phaseLabel}>
          Round {round.roundNumber}/{round.totalRounds} Results
        </span>
      </div>

      <div className={styles.acronymSmall}>
        {round.acronym?.split('').map((l, i) => (
          <span key={i} className={styles.acronymLetter}>{l}</span>
        ))}
      </div>

      {round.roundWinner && (
        <div className={styles.winnerBanner}>
          <span className={styles.winnerLabel}>Winner</span>
          <span className={styles.winnerName}>{round.roundWinner.nickname}</span>
          <span className={styles.winnerText}>"{round.roundWinner.text}"</span>
        </div>
      )}

      <div className={styles.answers}>
        {round.answers?.map((answer, i) => (
          <div
            key={answer.anonId ?? i}
            className={`${styles.answerCard} ${answer.isWinner ? styles.winner : ''}`}
          >
            <span className={styles.nickname}>{answer.nickname}</span>
            <span className={styles.voteBox}>{answer.votes}</span>
            <span className={styles.answerText}>{answer.text}</span>
            {round.scoreDelta?.[answer.nickname] > 0 && (
              <span className={styles.delta}>
                +{round.scoreDelta[answer.nickname]}
              </span>
            )}
          </div>
        ))}
      </div>

      <p className={styles.next}>
        {round.roundNumber === round.totalRounds
          ? <>Tallying final scores<span className="blink">...</span></>
          : <>Next round starting<span className="blink">...</span></>}
      </p>
    </div>
  );
}
