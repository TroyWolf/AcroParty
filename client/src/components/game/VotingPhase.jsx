import { useState } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import Countdown from './Countdown.jsx';
import styles from './VotingPhase.module.css';

export default function VotingPhase() {
  const { state } = useGame();
  const { round, hasVoted, me, mySubmission } = state;
  const [votedAnonId, setVotedAnonId] = useState(null);

  const isSpectator = me?.isSpectator || me?.isPending;
  const canVote = !isSpectator && !hasVoted;

  function vote(anonId) {
    if (!canVote) return;
    setVotedAnonId(anonId);
    socket.emit(EVENTS.GAME_VOTE, { anonId });
    new Audio('/sounds/vote.wav').play().catch(() => {});
  }

  if (round.noSubmissions) {
    return (
      <div className={styles.wrap}>
        <p className={styles.noSubs}>Nobody submitted an answer this round!</p>
        <p className={styles.moving}>Moving on<span className="blink">...</span></p>
      </div>
    );
  }

  if (round.singleSubmission) {
    return (
      <div className={styles.wrap}>
        <p className={styles.noSubs}>Only one player submitted this round.</p>
        <p className={styles.moving}>Moving on<span className="blink">...</span></p>
      </div>
    );
  }

  return (
    <div className={styles.wrap}>
      <div className={styles.header}>
        <span className={styles.phaseLabel}>Voting Round</span>
        <Countdown phaseEndsAt={round.phaseEndsAt} total={30} />
      </div>

      <p className={styles.instructions}>
        {me?.isPending
          ? "You'll join as a player next round."
          : me?.isSpectator
            ? 'Spectators cannot vote.'
            : hasVoted
              ? 'Vote cast! Waiting for others...'
              : 'Vote for your favorite answer!'}
      </p>

      {round.voteCount && (
        <p className={styles.voteCount}>
          {round.voteCount.count} / {round.voteCount.total} voted
        </p>
      )}

      <div className={styles.answers}>
        {[...(round.answers ?? [])].sort((a, b) => {
          const aMine = mySubmission && a.text === mySubmission ? 1 : 0;
          const bMine = mySubmission && b.text === mySubmission ? 1 : 0;
          return bMine - aMine;
        }).map((answer) => {
          const isMine = mySubmission && answer.text === mySubmission;
          const isVoted = answer.anonId === votedAnonId;
          return (
            <button
              key={answer.anonId}
              className={`${styles.answerCard} ${isMine ? styles.mine : ''} ${isVoted ? styles.voted : ''}`}
              onClick={() => vote(answer.anonId)}
              disabled={hasVoted || isSpectator || isMine}
            >
              <span className={styles.answerText}>{answer.text}</span>
              {isMine && <span className={styles.mineTag}>yours</span>}
            </button>
          );
        })}
      </div>
    </div>
  );
}
