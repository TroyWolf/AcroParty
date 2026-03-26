import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './HostControls.module.css';

export default function HostControls() {
  const { state } = useGame();
  const [rounds, setRounds] = useState(state.config.totalRounds);

  // Sync if config changes from server
  useEffect(() => {
    setRounds(state.config.totalRounds);
  }, [state.config]);

  function handleRoundsChange(e) {
    const val = Number(e.target.value);
    setRounds(val);
    socket.emit(EVENTS.HOST_CHANGE_CONFIG, { totalRounds: val });
  }

  function handleStart() {
    socket.emit(EVENTS.GAME_START, { totalRounds: rounds });
  }

  const canStart = state.players.filter(p => !p.isSpectator && !p.disconnected).length >= 2;

  return (
    <div className={styles.controls}>
      <h3 className={styles.title}>Game Settings</h3>

      <div className={styles.row}>
        <label className={styles.label}>Rounds</label>
        <select value={rounds} onChange={handleRoundsChange}>
          {[3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n}>{n} rounds</option>
          ))}
        </select>
      </div>

      <button
        className="primary"
        onClick={handleStart}
        disabled={!canStart}
        style={{ marginTop: 8, width: '100%', fontSize: '18px', padding: '12px' }}
      >
        START GAME
      </button>

      {!canStart && (
        <p className={styles.needMore}>Need at least 2 players to start.</p>
      )}
    </div>
  );
}
