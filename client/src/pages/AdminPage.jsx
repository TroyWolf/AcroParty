import { useState, useEffect, useCallback, useRef } from 'react';
import styles from './AdminPage.module.css';

const PHASE_LABELS = {
  lobby: 'LOBBY',
  submission: 'SUBMITTING',
  voting: 'VOTING',
  results: 'RESULTS',
  game_over: 'GAME OVER',
};

function phaseBadgeClass(phase) {
  switch (phase) {
    case 'submission': return styles.phaseSubmission;
    case 'voting':     return styles.phaseVoting;
    case 'results':    return styles.phaseResults;
    case 'game_over':  return styles.phaseGameOver;
    default:           return styles.phaseLobby;
  }
}

function timeRemaining(phaseEndsAt) {
  const secs = Math.max(0, Math.ceil((phaseEndsAt - Date.now()) / 1000));
  return secs;
}

function formatAge(seconds) {
  if (seconds < 60) return `${seconds}s`;
  const m = Math.floor(seconds / 60);
  const s = seconds % 60;
  return `${m}m ${s}s`;
}

function RoomCard({ room }) {
  const [, forceUpdate] = useState(0);

  // Re-render every second to update timer
  useEffect(() => {
    if (!room.currentRoundState?.phaseEndsAt) return;
    const id = setInterval(() => forceUpdate(n => n + 1), 1000);
    return () => clearInterval(id);
  }, [room.currentRoundState?.phaseEndsAt]);

  const rs = room.currentRoundState;

  return (
    <div className={styles.roomCard}>
      <div className={styles.roomHeader}>
        <span className={styles.roomCode}>{room.code}</span>
        <span className={`${styles.phaseBadge} ${phaseBadgeClass(room.phase)}`}>
          {PHASE_LABELS[room.phase] ?? room.phase}
        </span>
        {room.phase !== 'lobby' && room.phase !== 'game_over' && (
          <span className={styles.roundInfo}>
            Round {room.currentRound}/{room.totalRounds}
          </span>
        )}
        <span className={styles.roomAge}>age {formatAge(room.ageSeconds)}</span>
      </div>

      {rs && (
        <div className={styles.roundBar}>
          <span className={styles.acronym}>{rs.acronym}</span>
          {rs.phaseEndsAt && (
            <span className={styles.timer}>{timeRemaining(rs.phaseEndsAt)}s</span>
          )}
          {room.phase === 'submission' && (
            <span className={styles.progressInfo}>
              {rs.submissionCount}/{room.players.filter(p => p.connected).length} submitted
            </span>
          )}
          {room.phase === 'voting' && (
            <span className={styles.progressInfo}>
              {rs.voteCount}/{room.players.filter(p => p.connected).length} voted
            </span>
          )}
        </div>
      )}

      <table className={styles.playerTable}>
        <thead>
          <tr>
            <th>Player</th>
            <th>Score</th>
            <th>Sub</th>
            <th>Vote</th>
          </tr>
        </thead>
        <tbody>
          {room.players.map(p => (
            <tr key={p.nickname} className={p.connected ? '' : styles.disconnected}>
              <td>
                {p.isHost && <span className={styles.hostStar}>★ </span>}
                {p.nickname}
                {!p.connected && <span className={styles.dcBadge}> [dc]</span>}
              </td>
              <td className={styles.scoreCell}>{p.score}</td>
              <td>{p.hasSubmitted ? '✓' : '·'}</td>
              <td>{p.hasVoted ? '✓' : '·'}</td>
            </tr>
          ))}
          {room.spectatorCount > 0 && (
            <tr className={styles.spectatorsRow}>
              <td colSpan={4} className={styles.textDim}>
                +{room.spectatorCount} spectator{room.spectatorCount !== 1 ? 's' : ''}
              </td>
            </tr>
          )}
        </tbody>
      </table>

      {room.completedRounds.length > 0 && (
        <div className={styles.completedRounds}>
          {room.completedRounds.map(r => (
            <span key={r.roundNumber} className={styles.completedRound}>
              R{r.roundNumber}: <span className={styles.textDim}>{r.acronym}</span>
              {r.winner && <> → <span className={styles.winnerName}>{r.winner.nickname}</span></>}
            </span>
          ))}
        </div>
      )}
    </div>
  );
}

function SecretForm({ onSubmit }) {
  const [value, setValue] = useState('');
  const [error, setError] = useState(false);

  function handleSubmit(e) {
    e.preventDefault();
    if (!value.trim()) return;
    onSubmit(value.trim(), (ok) => {
      if (!ok) setError(true);
    });
  }

  return (
    <div className={styles.secretWall}>
      <div className={styles.secretPanel}>
        <div className={styles.secretTitle}>ACROPARTY ADMIN</div>
        <p className={styles.secretHint}>Enter admin secret to continue</p>
        <form className={styles.secretForm} onSubmit={handleSubmit}>
          <input
            className={`${styles.secretInput}${error ? ` ${styles.secretInputError}` : ''}`}
            type="password"
            placeholder="secret"
            value={value}
            onChange={e => { setValue(e.target.value); setError(false); }}
            autoFocus
          />
          <button className="primary" type="submit">ACCESS</button>
        </form>
        {error && <p className={styles.secretError}>Invalid secret</p>}
      </div>
    </div>
  );
}

export default function AdminPage() {
  const [secret, setSecret] = useState(() => sessionStorage.getItem('admin_secret') ?? '');
  const [data, setData] = useState(null);
  const [needsSecret, setNeedsSecret] = useState(false);
  const [lastUpdated, setLastUpdated] = useState(null);
  const [logLines, setLogLines] = useState([]);
  const logTotalRef = useRef(0);
  const logContainerRef = useRef(null);
  const logAtBottomRef = useRef(true);

  function adminUrl(path) {
    return secret ? `/admin/${path}?secret=${encodeURIComponent(secret)}` : `/admin/${path}`;
  }

  const fetchData = useCallback(async () => {
    try {
      const res = await fetch(adminUrl('state'));
      if (res.status === 401) {
        setNeedsSecret(true);
        setData(null);
        return;
      }
      const json = await res.json();
      setData(json);
      setNeedsSecret(false);
      setLastUpdated(new Date());
    } catch {
      // network error — keep stale data
    }
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps

  const fetchLog = useCallback(async () => {
    try {
      const after = logTotalRef.current;
      const path = after > 0 ? `log?after=${after}` : 'log';
      const res = await fetch(adminUrl(path));
      if (!res.ok) return;
      const { lines, total } = await res.json();
      if (lines.length > 0) {
        setLogLines(prev => [...prev, ...lines].slice(-500));
        logTotalRef.current = total;
      }
    } catch {
      // network error — keep stale data
    }
  }, [secret]); // eslint-disable-line react-hooks/exhaustive-deps

  useEffect(() => {
    fetchData();
    fetchLog();
    const id = setInterval(() => { fetchData(); fetchLog(); }, 3000);
    return () => clearInterval(id);
  }, [fetchData, fetchLog]);

  // Auto-scroll log to bottom when new lines arrive, only if already at bottom
  useEffect(() => {
    const el = logContainerRef.current;
    if (!el || !logAtBottomRef.current) return;
    el.scrollTop = el.scrollHeight;
  }, [logLines]);

  function handleLogScroll() {
    const el = logContainerRef.current;
    if (!el) return;
    logAtBottomRef.current = el.scrollHeight - el.scrollTop - el.clientHeight < 50;
  }

  function handleSecretSubmit(value, callback) {
    const newSecret = value;
    const url = `/admin/state?secret=${encodeURIComponent(newSecret)}`;
    fetch(url).then(res => {
      if (res.status === 401) {
        callback(false);
      } else {
        sessionStorage.setItem('admin_secret', newSecret);
        setSecret(newSecret);
        callback(true);
      }
    });
  }

  if (needsSecret) {
    return <SecretForm onSubmit={handleSecretSubmit} />;
  }

  // Build global leaderboard
  const leaderboard = data
    ? data.rooms
        .flatMap(r => r.players.filter(p => p.connected).map(p => ({ ...p, roomCode: r.code })))
        .sort((a, b) => b.score - a.score)
    : [];

  return (
    <div className={styles.page}>
      <div className={styles.header}>
        <span className={styles.title}>ACROPARTY ADMIN</span>
        {lastUpdated && (
          <span className={styles.lastUpdated}>
            updated {lastUpdated.toLocaleTimeString()}
          </span>
        )}
      </div>

      {data && (
        <div className={styles.statsRow}>
          <div className={styles.statsBox}>
            <div className={styles.statsLabel}>ACTIVE ROOMS</div>
            <div className={styles.statsValue}>{data.totalRooms}</div>
          </div>
          <div className={styles.statsBox}>
            <div className={styles.statsLabel}>TOTAL PLAYERS</div>
            <div className={styles.statsValue}>{data.totalActivePlayers}</div>
          </div>
        </div>
      )}

      {!data && (
        <div className={styles.loading}>Loading<span className="blink">_</span></div>
      )}

      {data && data.rooms.length === 0 && (
        <div className={styles.empty}>No active rooms<span className="blink">_</span></div>
      )}

      {data && data.rooms.length > 0 && (
        <>
          <div className={styles.sectionTitle}>ROOMS</div>
          <div className={styles.roomsGrid}>
            {data.rooms.map(room => (
              <RoomCard key={room.code} room={room} />
            ))}
          </div>

          {leaderboard.length > 0 && (
            <>
              <div className={styles.sectionTitle}>GLOBAL LEADERBOARD</div>
              <table className={styles.leaderboard}>
                <thead>
                  <tr>
                    <th>#</th>
                    <th>Player</th>
                    <th>Score</th>
                    <th>Room</th>
                  </tr>
                </thead>
                <tbody>
                  {leaderboard.map((p, i) => (
                    <tr key={`${p.roomCode}-${p.nickname}`}>
                      <td className={styles.rankCell}>{i + 1}</td>
                      <td className={styles.playerName}>{p.nickname}</td>
                      <td className={styles.scoreCell}>{p.score}</td>
                      <td className={styles.roomCodeCell}>{p.roomCode}</td>
                    </tr>
                  ))}
                </tbody>
              </table>
            </>
          )}
        </>
      )}

      <div className={styles.sectionTitle}>SERVER LOG</div>
      <div
        className={styles.logContainer}
        ref={logContainerRef}
        onScroll={handleLogScroll}
      >
        {logLines.length === 0
          ? <span className={styles.textDim}>No log entries yet.</span>
          : logLines.map((line, i) => <div key={i} className={styles.logLine}>{line}</div>)
        }
      </div>
    </div>
  );
}
