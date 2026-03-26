import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './PlayerList.module.css';

export default function PlayerList() {
  const { state } = useGame();
  const isHost = state.me?.isHost;
  const inLobby = state.phase === 'lobby';
  const scores = state.round?.currentScores ?? {};

  function kick(targetSocketId) {
    socket.emit(EVENTS.HOST_KICK, { targetSocketId });
  }

  return (
    <div className={styles.list}>
      <h3 className={styles.title}>Players ({state.players.length}/10)</h3>
      {state.players.map(p => (
        <div
          key={p.socketId}
          className={`${styles.player} ${p.disconnected ? styles.disconnected : ''}`}
        >
          <span className={styles.name}>
            {p.isHost && <span className={styles.crown}>★ </span>}
            {p.nickname}
            {p.socketId === state.me?.socketId && <span className={styles.you}> (you)</span>}
          </span>
          {state.phase !== 'lobby' && (
            <span className={styles.score}>{scores[p.nickname] ?? 0} pts</span>
          )}
          {isHost && inLobby && p.socketId !== state.me?.socketId && (
            <button
              className={styles.kickBtn}
              onClick={() => kick(p.socketId)}
              title="Kick player"
            >
              ✕
            </button>
          )}
          {p.disconnected && <span className={styles.dc}>disconnected</span>}
        </div>
      ))}

      {state.spectators.length > 0 && (
        <div className={styles.spectatorSection}>
          <h3 className={styles.title}>Spectators ({state.spectators.length})</h3>
          {state.spectators.map(s => (
            <div key={s.socketId} className={styles.player}>
              <span className={`${styles.name} ${styles.spectatorName}`}>
                {s.nickname}
                {s.socketId === state.me?.socketId && <span className={styles.you}> (you)</span>}
              </span>
            </div>
          ))}
        </div>
      )}
    </div>
  );
}
