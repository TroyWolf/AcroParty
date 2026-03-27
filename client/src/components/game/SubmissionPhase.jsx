import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import AcronymDisplay from './AcronymDisplay.jsx';
import Countdown from './Countdown.jsx';
import { useCountdown } from '../../hooks/useCountdown.js';
import styles from './SubmissionPhase.module.css';

export default function SubmissionPhase() {
  const { state, dispatch } = useGame();
  const { round, hasSubmitted, me } = state;
  const [text, setText] = useState('');
  const inputRef = useRef(null);
  const countdownSfxRef = useRef(null);
  const countdownPlayedRef = useRef(false);
  const remaining = useCountdown(round.phaseEndsAt);

  useEffect(() => {
    countdownSfxRef.current = new Audio('/sounds/countdown-5s.mp3');
  }, []);

  useEffect(() => {
    if (remaining === 6 && !countdownPlayedRef.current) {
      countdownPlayedRef.current = true;
      countdownSfxRef.current?.play().catch(() => {});
    }
    if (remaining === 0) {
      countdownPlayedRef.current = false;
    }
  }, [remaining]);

  useEffect(() => {
    if (!hasSubmitted) inputRef.current?.focus();
  }, [hasSubmitted]);

  function handleSubmit(e) {
    e.preventDefault();
    if (!text.trim() || hasSubmitted || me?.isSpectator) return;
    const trimmed = text.trim();
    dispatch({ type: 'MY_SUBMISSION', payload: trimmed });
    socket.emit(EVENTS.GAME_SUBMIT, { text: trimmed });
  }

  const letters = round.acronym?.split('') ?? [];
  const wordCount = text.trim().split(/\s+/).filter(Boolean).length;
  const wordCountMatch = wordCount === letters.length;

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <Countdown phaseEndsAt={round.phaseEndsAt} total={60} />
      </div>

      <p className={styles.instructions}>Type your answer and press Enter</p>

      <AcronymDisplay acronym={round.acronym} />

      {me?.isSpectator || me?.isPending ? (
        <p className={styles.spectatorNote}>
          {me?.isPending ? 'You\'ll join as a player next round.' : 'Spectators can\'t submit answers.'}
        </p>
      ) : hasSubmitted ? (
        <div className={styles.submitted}>
          <p className={styles.submittedText}>Answer submitted!</p>
          <p className={styles.waiting}>
            Waiting for other players
            <span className="blink">...</span>
          </p>
          {round.submissionCount && (
            <p className={styles.count}>
              {round.submissionCount.count} / {round.submissionCount.total} submitted
            </p>
          )}
        </div>
      ) : (
        <form onSubmit={handleSubmit} className={styles.form}>
          <div className={styles.inputRow}>
            <input
              ref={inputRef}
              className={styles.input}
              value={text}
              onChange={e => setText(e.target.value)}
              placeholder={`${letters.length} words...`}
              maxLength={150}
              autoComplete="off"
            />
            <button
              type="submit"
              className="primary"
              disabled={!wordCountMatch}
            >
              Submit
            </button>
          </div>
          <div className={styles.meta}>
            <span className={wordCountMatch ? styles.matchOk : styles.matchWarn}>
              {wordCount} / {letters.length} words
            </span>
            <span className={styles.charCount}>{text.length}/150</span>
          </div>
        </form>
      )}
    </div>
  );
}
