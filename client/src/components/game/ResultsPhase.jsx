import { useGame } from '../../context/GameContext.jsx';
import styles from './ResultsPhase.module.css';

export default function ResultsPhase() {
  const { state } = useGame();
  const { round } = state;

  const sortedScores = Object.entries(round.currentScores ?? {})
    .sort(([, a], [, b]) => b - a);

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.roundInfo}>
          Round {round.roundNumber}/{round.totalRounds} Results — {round.category?.label}
        </span>
      </div>

      <div className={styles.acronymSmall}>
        {round.acronym?.split('').map((l, i) => (
          <span key={i} className={styles.letter}>{l}</span>
        ))}
      </div>

      {round.roundWinner && (
        <div className={styles.winnerBanner}>
          <span className={styles.winnerLabel}>WINNER</span>
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
            <div className={styles.answerTop}>
              <span className={styles.nickname}>{answer.nickname}</span>
              <span className={styles.votes}>
                {answer.votes} vote{answer.votes !== 1 ? 's' : ''}
              </span>
              {round.scoreDelta?.[answer.nickname] > 0 && (
                <span className={styles.delta}>
                  +{round.scoreDelta[answer.nickname]} pts
                </span>
              )}
            </div>
            <p className={styles.answerText}>{answer.text}</p>
          </div>
        ))}
      </div>

      {sortedScores.length > 0 && (
        <div className={styles.scoreboard}>
          <h3 className={styles.scoreTitle}>Scores</h3>
          {sortedScores.map(([nickname, score], i) => (
            <div key={nickname} className={styles.scoreRow}>
              <span className={styles.rank}>#{i + 1}</span>
              <span className={styles.scoreName}>{nickname}</span>
              <span className={styles.scoreVal}>{score}</span>
            </div>
          ))}
        </div>
      )}

      <p className={styles.next}>
        Next round starting<span className="blink">...</span>
      </p>
    </div>
  );
}
