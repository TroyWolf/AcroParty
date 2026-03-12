import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './PlayerList.module.css';

export default function PlayerList() {
  const { state } = useGame();
  const isHost = state.me?.isHost;
  const inLobby = state.phase === 'lobby';

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
            <span className={styles.score}>{p.score} pts</span>
          )}
          {isHost && inLobby && p.socketId !== state.me?.socketId && !p.disconnected && (
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
    </div>
  );
}
