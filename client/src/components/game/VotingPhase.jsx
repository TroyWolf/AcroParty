import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import Countdown from './Countdown.jsx';
import styles from './VotingPhase.module.css';

export default function VotingPhase() {
  const { state } = useGame();
  const { round, hasVoted, me } = state;

  const isSpectator = me?.isSpectator;
  const canVote = !isSpectator && !hasVoted;

  function vote(anonId) {
    if (!canVote) return;
    socket.emit(EVENTS.GAME_VOTE, { anonId });
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
        <span className={styles.category}>{round.category?.label}</span>
      </div>

      <p className={styles.instructions}>
        {isSpectator
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
        {round.answers?.map((answer) => (
          <button
            key={answer.anonId}
            className={styles.answerCard}
            onClick={() => vote(answer.anonId)}
            disabled={hasVoted || isSpectator}
          >
            <span className={styles.answerText}>{answer.text}</span>
          </button>
        ))}
      </div>
    </div>
  );
}
