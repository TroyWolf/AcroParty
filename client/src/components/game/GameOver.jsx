import { useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './GameOver.module.css';

export default function GameOver() {
  const { state } = useGame();
  const { round, me } = state;

  useEffect(() => {
    const sfx = new Audio('/sounds/winner.mp3');
    sfx.play().catch(() => {});
  }, []);

  // game_over payload is in round for finalScores and mvp
  const finalScores = state.finalScores ?? [];
  const mvp = state.mvp ?? null;

  function playAgain() {
    socket.emit(EVENTS.GAME_PLAY_AGAIN);
  }

  return (
    <div className={styles.wrap}>
      <h1 className={styles.title}>GAME OVER</h1>

      {mvp && (
        <div className={styles.mvp}>
          <span className={styles.mvpLabel}>Champion</span>
          <span className={styles.mvpName}>{mvp.nickname}</span>
          <span className={styles.mvpScore}>{mvp.score} points</span>
        </div>
      )}

      <div className={styles.scoreboard}>
        <h3 className={styles.scoreTitle}>Final Standings</h3>
        {finalScores.map((p, i) => (
          <div
            key={p.socketId}
            className={`${styles.scoreRow} ${p.socketId === me?.socketId ? styles.mine : ''}`}
          >
            <span className={styles.rank}>
              {i === 0 ? '🥇' : i === 1 ? '🥈' : i === 2 ? '🥉' : `#${i + 1}`}
            </span>
            <span className={styles.name}>{p.nickname}</span>
            <span className={styles.score}>{p.score} pts</span>
          </div>
        ))}
      </div>

      {me?.isHost && (
        <button className={`primary ${styles.playAgainBtn}`} onClick={playAgain}>
          PLAY AGAIN
        </button>
      )}

      {!me?.isHost && (
        <p className={styles.waiting}>Waiting for host to start a new game<span className="blink">...</span></p>
      )}
    </div>
  );
}
