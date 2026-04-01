import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './HostControls.module.css';

export default function HostControls() {
  const { state } = useGame();
  const [rounds, setRounds] = useState(state.config.totalRounds);
  const [isPublic, setIsPublic] = useState(state.roomIsPublic);
  const [profanityFilter, setProfanityFilter] = useState(state.config.profanityFilter ?? true);

  // Sync if config changes from server
  useEffect(() => {
    setRounds(state.config.totalRounds);
    setProfanityFilter(state.config.profanityFilter ?? true);
  }, [state.config]);

  useEffect(() => {
    setIsPublic(state.roomIsPublic);
  }, [state.roomIsPublic]);

  function handleRoundsChange(e) {
    const val = Number(e.target.value);
    setRounds(val);
    socket.emit(EVENTS.HOST_CHANGE_CONFIG, { totalRounds: val });
  }

  function handlePublicChange(e) {
    const val = e.target.checked;
    setIsPublic(val);
    socket.emit(EVENTS.HOST_CHANGE_CONFIG, { isPublic: val });
  }

  function handleProfanityFilterChange(e) {
    const val = e.target.checked;
    setProfanityFilter(val);
    socket.emit(EVENTS.HOST_CHANGE_CONFIG, { profanityFilter: val });
  }

  function handleStart() {
    socket.emit(EVENTS.GAME_START, { totalRounds: rounds });
  }

  const canStart = state.players.filter(p => !p.isSpectator && !p.disconnected).length >= 2;

  return (
    <div className={styles.controls}>
      <div className={styles.row}>
        <label className={styles.label}>Rounds</label>
        <select value={rounds} onChange={handleRoundsChange}>
          {[3,4,5,6,7,8,9,10].map(n => (
            <option key={n} value={n}>{n} rounds</option>
          ))}
        </select>
      </div>

      <div className={styles.row}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={isPublic}
            onChange={handlePublicChange}
          />
          &nbsp;Public room <span className={styles.checkHint}>(visible in room browser)</span>
        </label>
      </div>

      <div className={styles.row}>
        <label className={styles.checkLabel}>
          <input
            type="checkbox"
            checked={profanityFilter}
            onChange={handleProfanityFilterChange}
          />
          &nbsp;Profanity filter <span className={styles.checkHint}>(block offensive words)</span>
        </label>
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
