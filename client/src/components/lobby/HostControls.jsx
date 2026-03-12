import { useState, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './HostControls.module.css';

export default function HostControls() {
  const { state } = useGame();
  const [rounds, setRounds] = useState(state.config.totalRounds);
  const [category, setCategory] = useState(state.config.category);

  // Sync if config changes from server
  useEffect(() => {
    setRounds(state.config.totalRounds);
    setCategory(state.config.category);
  }, [state.config]);

  function updateConfig(newRounds, newCategory) {
    socket.emit(EVENTS.HOST_CHANGE_CONFIG, {
      totalRounds: newRounds,
      category: newCategory,
    });
  }

  function handleRoundsChange(e) {
    const val = Number(e.target.value);
    setRounds(val);
    updateConfig(val, category);
  }

  function handleCategoryChange(e) {
    setCategory(e.target.value);
    updateConfig(rounds, e.target.value);
  }

  function handleStart() {
    socket.emit(EVENTS.GAME_START, { totalRounds: rounds, category });
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

      <div className={styles.row}>
        <label className={styles.label}>Category</label>
        <select value={category} onChange={handleCategoryChange}>
          <option value="random">Random</option>
          {state.categories.map(c => (
            <option key={c.key} value={c.key}>{c.label}</option>
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
