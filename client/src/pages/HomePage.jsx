import { useState, useEffect, useCallback } from 'react';
import { useGame } from '../context/GameContext.jsx';
import socket from '../socket/socketClient.js';
import { EVENTS } from '../socket/events.js';
import styles from './HomePage.module.css';

export default function HomePage({ urlCode = null, muted, toggleMute }) {
  const { state, dispatch } = useGame();
  const [nickname, setNickname] = useState('');
  const [code, setCode] = useState(urlCode ?? '');
  const [mode, setMode] = useState(urlCode ? 'join' : 'create');
  const [asSpectator, setAsSpectator] = useState(false);
  const [roomName, setRoomName] = useState('');
  const [isPublic, setIsPublic] = useState(false);

  // Public rooms browser
  const [publicRooms, setPublicRooms] = useState([]);
  const [publicLoading, setPublicLoading] = useState(false);

  const fetchPublicRooms = useCallback(() => {
    if (!state.connected) return;
    setPublicLoading(true);
    socket.once(EVENTS.ROOMS_PUBLIC_LIST, ({ rooms }) => {
      setPublicRooms(rooms);
      setPublicLoading(false);
    });
    socket.emit(EVENTS.ROOMS_GET_PUBLIC);
  }, [state.connected]);

  useEffect(() => {
    if (state.connected) {
      fetchPublicRooms();
    }
  }, [state.connected]); // eslint-disable-line react-hooks/exhaustive-deps

  function clearError() {
    dispatch({ type: 'CLEAR_ERROR' });
  }

  function handleCreate(e) {
    e.preventDefault();
    if (!nickname.trim()) return;
    clearError();
    socket.emit(EVENTS.ROOM_CREATE, {
      nickname: nickname.trim(),
      name: roomName.trim() || undefined,
      isPublic,
    });
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

  function handleJoinPublic(room) {
    setCode(room.code);
    setMode('join');
    clearError();
  }

  return (
    <div className={styles.page}>
      {toggleMute && (
        <button
          className={`${styles.muteBtn}${muted ? ` ${styles.muteBtnMuted}` : ''}`}
          onClick={toggleMute}
          title={muted ? 'Unmute music' : 'Mute music'}
        >
          ♫
        </button>
      )}
      <div className={styles.panel}>
        <h1 className={styles.title}>
          <span style={{ color: '#ff2200', textShadow: '0 0 20px rgba(255,34,0,0.7), 2px 2px 0 #660000' }}>ACRO</span>
          <span style={{ color: '#ffff00', textShadow: '0 0 20px rgba(255,255,0,0.7), 2px 2px 0 #666600' }}>PARTY</span>
        </h1>
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
            <label className={styles.label}>Room Name <span className={styles.optional}>(optional)</span></label>
            <input
              className={styles.input}
              value={roomName}
              onChange={e => setRoomName(e.target.value)}
              maxLength={30}
              placeholder="Give your room a name..."
            />
            <label className={styles.checkLabel}>
              <input
                type="checkbox"
                checked={isPublic}
                onChange={e => setIsPublic(e.target.checked)}
              />
              &nbsp;Make this room public
            </label>
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

      {(publicLoading || publicRooms.length > 0) && (
        <div className={styles.publicRooms}>
          <div className={styles.publicRoomsHeader}>
            <h3 className={styles.publicRoomsTitle}>Open Rooms</h3>
            <button
              className={styles.refreshBtn}
              onClick={fetchPublicRooms}
              disabled={publicLoading || !state.connected}
            >
              {publicLoading ? '...' : '↻ Refresh'}
            </button>
          </div>
          {publicLoading ? (
            <p className={styles.publicRoomsEmpty}>Loading<span className="blink">...</span></p>
          ) : publicRooms.length === 0 ? (
            <p className={styles.publicRoomsEmpty}>No open rooms right now.</p>
          ) : (
            <ul className={styles.roomList}>
              {publicRooms.map(room => (
                <li key={room.code} className={styles.roomRow}>
                  <div className={styles.roomInfo}>
                    <span className={styles.roomRowName}>
                      {room.name || <span className={styles.unnamed}>unnamed</span>}
                    </span>
                    <span className={styles.roomRowMeta}>
                      {room.code} · {room.playerCount}/10 players · {room.totalRounds} rounds
                    </span>
                  </div>
                  <button
                    className={styles.joinBtn}
                    onClick={() => handleJoinPublic(room)}
                  >
                    Join
                  </button>
                </li>
              ))}
            </ul>
          )}
        </div>
      )}

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
