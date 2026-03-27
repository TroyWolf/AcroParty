import { useState } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import HostControls from './HostControls.jsx';
import styles from './LobbyRoom.module.css';

export default function LobbyRoom() {
  const { state } = useGame();
  const isHost = state.me?.isHost;
  const isSpectator = state.me?.isSpectator;
  const [copied, setCopied] = useState(false);

  function copyCode() {
    navigator.clipboard?.writeText(state.roomCode).then(() => {
      setCopied(true);
      setTimeout(() => setCopied(false), 1500);
    });
  }

  return (
    <div className={styles.lobby}>
      <div className={styles.header}>
        <h2 className={styles.roomCode}>
          Room: <span className={`${styles.code} ${styles.codeClickable}`} onClick={copyCode}>{state.roomCode}</span>
        </h2>
        <p className={styles.hint}>
          {copied ? 'Copied!' : 'Tap code to copy — share with friends!'}
        </p>
      </div>

      {isSpectator && (
        <div className={styles.spectatorBadge}>SPECTATOR MODE</div>
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
