import { useGame } from '../../context/GameContext.jsx';
import PlayerList from './PlayerList.jsx';
import HostControls from './HostControls.jsx';
import styles from './LobbyRoom.module.css';

export default function LobbyRoom() {
  const { state } = useGame();
  const isHost = state.me?.isHost;
  const isSpectator = state.me?.isSpectator;

  return (
    <div className={styles.lobby}>
      <div className={styles.header}>
        <h2 className={styles.roomCode}>
          Room: <span className={styles.code}>{state.roomCode}</span>
        </h2>
        <p className={styles.hint}>Share this code with friends!</p>
      </div>

      {isSpectator && (
        <div className={styles.spectatorBadge}>SPECTATOR MODE</div>
      )}

      <PlayerList />

      {state.spectatorCount > 0 && (
        <p className={styles.spectators}>
          + {state.spectatorCount} spectator{state.spectatorCount !== 1 ? 's' : ''}
        </p>
      )}

      {isHost ? (
        <HostControls />
      ) : (
        <p className={styles.waiting}>
          Waiting for host to start the game<span className="blink">...</span>
        </p>
      )}

      {state.error && <p className="error-msg">{state.error}</p>}
    </div>
  );
}
