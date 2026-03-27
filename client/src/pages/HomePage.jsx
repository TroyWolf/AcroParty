import { useState } from 'react';
import { useGame } from '../context/GameContext.jsx';
import socket from '../socket/socketClient.js';
import { EVENTS } from '../socket/events.js';
import styles from './HomePage.module.css';

export default function HomePage({ urlCode = null }) {
  const { state, dispatch } = useGame();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(urlCode ?? '');
  const [mode, setMode] = useState(urlCode ? 'join' : 'create');
  const [asSpectator, setAsSpectator] = useState(false);

  function clearError() {
    dispatch({ type: 'CLEAR_ERROR' });
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    clearError();
    socket.emit(EVENTS.ROOM_CREATE, { nickname: nickname.trim() });
  }

  function handleJoin(e) {
    e.preventDefault();
    if (!nickname.trim() || !code.trim()) return;
    clearError();
    socket.emit(EVENTS.ROOM_JOIN, {
      nickname: nickname.trim(),
      code: code.trim().toUpperCase(),
      asSpectator,
    });
  }

  return (
    <div className={styles.page}>
      <div className={styles.panel}>
        <h1 className={styles.title}>ACROPARTY</h1>
        <p className={styles.subtitle}>The Acronym Party Game</p>

        {urlCode && mode === 'join' && (
          <p className={styles.urlBanner}>
            Joining room <strong>{urlCode}</strong>
          </p>
        )}

        <div className={styles.tabs}>
          <button
            className={mode === 'create' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('create'); clearError(); }}
          >
            Create Room
          </button>
          <button
            className={mode === 'join' ? styles.tabActive : styles.tab}
            onClick={() => { setMode('join'); clearError(); }}
          >
            Join Room
          </button>
        </div>

        {mode === 'create' ? (
          <form onSubmit={handleCreate} className={styles.form}>
            <label className={styles.label}>Your Nickname</label>
            <input
              className={styles.input}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Enter nickname..."
              autoFocus
            />
            <button type="submit" className="primary" disabled={!nickname.trim() || !state.connected}>
              Create Room
            </button>
          </form>
        ) : (
          <form onSubmit={handleJoin} className={styles.form}>
            <label className={styles.label}>Your Nickname</label>
            <input
              className={styles.input}
              value={nickname}
              onChange={e => setNickname(e.target.value)}
              maxLength={20}
              placeholder="Enter nickname..."
              autoFocus
            />
            <label className={styles.label}>Room Code</label>
            <input
              className={styles.input}
              value={code}
              onChange={e => setCode(e.target.value.toUpperCase())}
              maxLength={4}
              placeholder="XXXX"
              style={{ letterSpacing: '4px', fontWeight: 'bold' }}
            />
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={asSpectator}
                onChange={e => setAsSpectator(e.target.checked)}
              />
              &nbsp;Join as spectator
            </label>
            <button
              type="submit"
              className="primary"
              disabled={!nickname.trim() || !code.trim() || !state.connected}
            >
              Join Room
            </button>
          </form>
        )}

        {state.error && <p className="error-msg">{state.error}</p>}
        {!state.connected && (
          <p className={styles.connecting}>Connecting to server<span className="blink">_</span></p>
        )}
      </div>

      <div className={styles.howto}>
        <h3>How to Play</h3>
        <ol>
          <li>Get a random acronym (e.g. <strong>BFHT</strong>)</li>
          <li>Make up what it stands for in 60 seconds</li>
          <li>Everyone votes for their favorite answer</li>
          <li>Score points for getting votes!</li>
        </ol>
      </div>
    </div>
  );
}
