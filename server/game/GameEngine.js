import { createRoundState, serializeRoom } from './Room.js';
import { generateAcronym } from './AcronymGenerator.js';
import { GAME, SCORING } from '../config.js';
import RoomManager from './RoomManager.js';

// io instance — injected at startup
let _io = null;
export function setIo(io) { _io = io; }

// ─── Phase durations ──────────────────────────────────────────────────────────
const PHASE_DURATION = {
  submission: GAME.SUBMISSION_SECONDS * 1000,
  voting:     GAME.VOTING_SECONDS * 1000,
  results:    GAME.RESULTS_SECONDS * 1000,
};

// ─── Helpers ──────────────────────────────────────────────────────────────────

function emit(room, event, data) {
  _io.to(room.code).emit(event, data);
}

function activePlayers(room) {
  return [...room.players.values()].filter(p => !p.isSpectator && p.disconnectedAt === null);
}

function schedulePhase(room, nextPhase, delayMs) {
  if (room.currentRoundState?.timerHandle) {
    clearTimeout(room.currentRoundState.timerHandle);
  }
  room.currentRoundState.timerHandle = setTimeout(() => {
    transitionPhase(room, nextPhase);
  }, delayMs);
}

// ─── Public API ───────────────────────────────────────────────────────────────

export function startGame(room) {
  room.currentRound = 0;
  room.rounds = [];
  // Reset scores
  for (const p of room.players.values()) {
    p.score = 0;
  }
  startNextRound(room);
}

function startNextRound(room) {
  room.currentRound += 1;
  const acronym = generateAcronym();

  room.currentRoundState = createRoundState({
    roundNumber: room.currentRound,
    acronym,
  });

  // Reset per-round player flags
  for (const p of room.players.values()) {
    p.hasSubmitted = false;
    p.hasVoted = false;
  }

  transitionPhase(room, 'submission');
}

export function transitionPhase(room, phase) {
  if (room.currentRoundState?.timerHandle) {
    clearTimeout(room.currentRoundState.timerHandle);
    room.currentRoundState.timerHandle = null;
  }

  room.phase = phase;
  RoomManager.touch(room);

  const rs = room.currentRoundState;
  const now = Date.now();
  const duration = PHASE_DURATION[phase] ?? 0;
  if (rs) {
    rs.phaseStartedAt = now;
    rs.phaseEndsAt = now + duration;
  }

  switch (phase) {
    case 'submission': {
      emit(room, 'game:phase_change', {
        phase: 'submission',
        round: rs.roundNumber,
        totalRounds: room.config.totalRounds,
        acronym: rs.acronym,
        phaseEndsAt: rs.phaseEndsAt,
      });
      schedulePhase(room, 'voting', duration);
      break;
    }

    case 'voting': {
      const subs = [...rs.submissions.entries()];

      if (subs.length === 0) {
        // No submissions — skip voting and results
        emit(room, 'game:phase_change', {
          phase: 'voting',
          round: rs.roundNumber,
          totalRounds: room.config.totalRounds,
          acronym: rs.acronym,
          answers: [],
          noSubmissions: true,
          phaseEndsAt: now,
        });
        return transitionPhase(room, 'results');
      }

      if (subs.length === 1) {
        // Only 1 submission — skip voting, award Winner's Bonus for the round
        const [socketId] = subs[0];
        const p = room.players.get(socketId);
        if (p) p.score += rs.acronym.length * SCORING.WINNERS_BONUS_PER_LETTER;

        emit(room, 'game:phase_change', {
          phase: 'voting',
          round: rs.roundNumber,
          totalRounds: room.config.totalRounds,
          acronym: rs.acronym,
          answers: [],
          singleSubmission: true,
          phaseEndsAt: now,
        });
        return transitionPhase(room, 'results');
      }

      // Shuffle submissions (Fisher-Yates)
      const shuffled = [...subs];
      for (let i = shuffled.length - 1; i > 0; i--) {
        const j = Math.floor(Math.random() * (i + 1));
        [shuffled[i], shuffled[j]] = [shuffled[j], shuffled[i]];
      }

      rs.anonMap.clear();
      const answers = shuffled.map(([socketId, sub], idx) => {
        const anonId = `anon_${idx}`;
        rs.anonMap.set(anonId, socketId);
        return { anonId, text: sub.text };
      });

      emit(room, 'game:phase_change', {
        phase: 'voting',
        round: rs.roundNumber,
        totalRounds: room.config.totalRounds,
        acronym: rs.acronym,
        answers,
        phaseEndsAt: rs.phaseEndsAt,
      });
      schedulePhase(room, 'results', duration);
      break;
    }

    case 'results': {
      const result = calculateScores(room);

      emit(room, 'game:phase_change', {
        phase: 'results',
        round: rs.roundNumber,
        totalRounds: room.config.totalRounds,
        acronym: rs.acronym,
        answers: result.answers,
        scoreDelta: result.scoreDelta,
        currentScores: result.currentScores,
        roundWinner: result.roundWinner,
      });

      room.rounds.push({
        roundNumber: rs.roundNumber,
        acronym: rs.acronym,
        answers: result.answers,
        winner: result.roundWinner,
      });

      const nextPhase = room.currentRound < room.config.totalRounds
        ? 'next_round'
        : 'game_over';

      schedulePhase(room, nextPhase, duration);
      break;
    }

    case 'next_round': {
      startNextRound(room);
      break;
    }

    case 'game_over': {
      room.phase = 'game_over';
      const finalScores = [...room.players.values()]
        .filter(p => !p.isSpectator)
        .sort((a, b) => b.score - a.score)
        .map(p => ({ nickname: p.nickname, score: p.score, socketId: p.socketId }));

      const mvp = finalScores[0] ?? null;

      emit(room, 'game:phase_change', {
        phase: 'game_over',
        finalScores,
        mvp,
      });
      RoomManager.touch(room);
      break;
    }
  }
}

function calculateScores(room) {
  const rs = room.currentRoundState;
  const scoreDelta = {};
  const answerList = [];

  // Tally votes per submitter
  const voteCounts = new Map(); // socketId → count
  for (const [, anonId] of rs.votes) {
    const targetSocketId = rs.anonMap.get(anonId);
    if (targetSocketId) {
      voteCounts.set(targetSocketId, (voteCounts.get(targetSocketId) ?? 0) + 1);
    }
  }

  // Find winner(s) — highest vote count
  let maxVotes = 0;
  for (const count of voteCounts.values()) {
    if (count > maxVotes) maxVotes = count;
  }
  const winnerSocketIds = new Set(
    [...voteCounts.entries()]
      .filter(([, c]) => c === maxVotes && maxVotes > 0)
      .map(([id]) => id)
  );

  // Speed bonus: earliest submission that received at least one vote
  let speedBonusRecipient = null;
  let earliestVotedTime = Infinity;
  for (const [socketId, sub] of rs.submissions) {
    if ((voteCounts.get(socketId) ?? 0) > 0 && sub.submittedAt < earliestVotedTime) {
      earliestVotedTime = sub.submittedAt;
      speedBonusRecipient = socketId;
    }
  }

  // Winner's Bonus recipient: most votes; tie → earliest submitter
  // Penalty: if that player didn't vote, they forfeit the Winner's Bonus
  let winnersBonusRecipient = null;
  if (winnerSocketIds.size > 0) {
    let earliest = Infinity;
    for (const socketId of winnerSocketIds) {
      const sub = rs.submissions.get(socketId);
      if (sub && sub.submittedAt < earliest) {
        earliest = sub.submittedAt;
        winnersBonusRecipient = socketId;
      }
    }
    const winner = room.players.get(winnersBonusRecipient);
    if (winner && !winner.hasVoted) {
      winnersBonusRecipient = null; // forfeited for not voting
    }
  }

  // Award points: 1 pt per vote + Speed Bonus + Winner's Bonus
  for (const [socketId, sub] of rs.submissions) {
    const p = room.players.get(socketId);
    if (!p) continue;

    const votes = voteCounts.get(socketId) ?? 0;
    let delta = votes * SCORING.VOTES_PER_VOTE_RECEIVED;

    if (socketId === speedBonusRecipient) {
      delta += SCORING.SPEED_BONUS_POINTS;
    }

    if (socketId === winnersBonusRecipient) {
      delta += rs.acronym.length * SCORING.WINNERS_BONUS_PER_LETTER;
    }

    p.score += delta;
    scoreDelta[p.nickname] = (scoreDelta[p.nickname] ?? 0) + delta;

    // Find the anonId for this socketId to reveal author
    let anonId = null;
    for (const [aid, sid] of rs.anonMap) {
      if (sid === socketId) { anonId = aid; break; }
    }

    answerList.push({
      anonId,
      socketId,
      nickname: p.nickname,
      text: sub.text,
      votes,
      isWinner: winnerSocketIds.has(socketId),
    });
  }

  // Award 1 pt to voters who picked a winner
  for (const [voterSocketId, anonId] of rs.votes) {
    const targetSocketId = rs.anonMap.get(anonId);
    if (targetSocketId && winnerSocketIds.has(targetSocketId)) {
      const voter = room.players.get(voterSocketId);
      if (voter) {
        voter.score += SCORING.VOTED_FOR_WINNER_BONUS;
        scoreDelta[voter.nickname] = (scoreDelta[voter.nickname] ?? 0) + SCORING.VOTED_FOR_WINNER_BONUS;
      }
    }
  }

  // Sort by votes desc, then by submittedAt asc (tie-break)
  answerList.sort((a, b) => {
    if (b.votes !== a.votes) return b.votes - a.votes;
    return (rs.submissions.get(a.socketId)?.submittedAt ?? 0) -
           (rs.submissions.get(b.socketId)?.submittedAt ?? 0);
  });

  const currentScores = Object.fromEntries(
    [...room.players.values()]
      .filter(p => !p.isSpectator)
      .map(p => [p.nickname, p.score])
  );

  const roundWinner = answerList.find(a => a.isWinner) ?? null;

  return { answers: answerList, scoreDelta, currentScores, roundWinner };
}

// ─── Submission / Vote handling ───────────────────────────────────────────────

export function handleSubmit(room, socketId, text) {
  const rs = room.currentRoundState;
  if (!rs || room.phase !== 'submission') return { error: 'Not in submission phase' };

  const player = room.players.get(socketId);
  if (!player || player.isSpectator) return { error: 'Not a player' };
  if (player.hasSubmitted) return { error: 'Already submitted' };

  rs.submissions.set(socketId, { text, submittedAt: Date.now() });
  player.hasSubmitted = true;

  // Broadcast updated count
  const total = activePlayers(room).length;
  const count = rs.submissions.size;
  emit(room, 'game:submission_count', { count, total });

  // If everyone submitted, advance early
  if (count >= total) {
    transitionPhase(room, 'voting');
  }

  return { ok: true };
}

export function handleVote(room, voterSocketId, anonId) {
  const rs = room.currentRoundState;
  if (!rs || room.phase !== 'voting') return { error: 'Not in voting phase' };

  const voter = room.players.get(voterSocketId);
  if (!voter || voter.isSpectator) return { error: 'Not a player' };
  if (voter.hasVoted) return { error: 'Already voted' };

  const targetSocketId = rs.anonMap.get(anonId);
  if (!targetSocketId) return { error: 'Invalid answer' };
  if (targetSocketId === voterSocketId) return { error: 'Cannot vote for yourself' };

  rs.votes.set(voterSocketId, anonId);
  voter.hasVoted = true;

  const total = activePlayers(room).length;
  const count = rs.votes.size;
  emit(room, 'game:vote_count', { count, total });

  if (count >= activePlayers(room).length) {
    transitionPhase(room, 'results');
  }

  return { ok: true };
}

function returnToLobby(room) {
  if (room.currentRoundState?.timerHandle) {
    clearTimeout(room.currentRoundState.timerHandle);
  }
  room.phase = 'lobby';
  room.currentRound = 0;
  room.currentRoundState = null;
  room.rounds = [];
  for (const p of room.players.values()) {
    p.score = 0;
    p.hasSubmitted = false;
    p.hasVoted = false;
  }
  broadcastSystemChat(room, 'Not enough players to continue. Returning to lobby.');
  emit(room, 'game:phase_change', { phase: 'lobby', room: serializeRoom(room) });
  RoomManager.touch(room);
}

export function checkMinPlayers(room) {
  const inGame = !['lobby', 'game_over'].includes(room.phase);
  if (inGame && activePlayers(room).length < 2) {
    returnToLobby(room);
  }
}

export function handleDisconnect(room, socketId) {
  const player = room.players.get(socketId);
  if (!player) {
    room.spectators.delete(socketId);
    const spectators = [...room.spectators.entries()].map(([sid, nickname]) => ({ socketId: sid, nickname }));
    emit(room, 'room:spectators_updated', { spectators });
    return;
  }

  player.disconnectedAt = Date.now();

  // Transfer host if needed
  if (room.hostSocketId === socketId && room.phase !== 'game_over') {
    const next = [...room.players.values()].find(
      p => p.socketId !== socketId && p.disconnectedAt === null && !p.isSpectator
    );
    if (next) {
      next.isHost = true;
      room.hostSocketId = next.socketId;
      emit(room, 'room:host_changed', { newHostSocketId: next.socketId });
      broadcastSystemChat(room, `${next.nickname} is now the host.`);
    }
  }

  broadcastSystemChat(room, `${player.nickname} lost connection.`);
  emit(room, 'room:player_left', { socketId, nickname: player.nickname });
  checkMinPlayers(room);

  // Schedule removal if they don't reconnect
  setTimeout(() => {
    const p = room.players.get(socketId);
    if (p && p.disconnectedAt !== null) {
      room.players.delete(socketId);
    }
  }, GAME.RECONNECT_WINDOW_MS);
}

export function handleReconnect(room, socketId, nickname) {
  const player = [...room.players.values()].find(
    p => p.nickname === nickname && p.disconnectedAt !== null
  );
  if (!player) return null;

  player.socketId = socketId;
  player.disconnectedAt = null;
  room.players.delete(socketId); // remove old entry if key differs
  room.players.set(socketId, player);

  broadcastSystemChat(room, `${nickname} reconnected.`);
  return player;
}

export function broadcastSystemChat(room, text) {
  const msg = {
    id: `sys_${Date.now()}_${Math.random().toString(36).slice(2)}`,
    senderSocketId: null,
    nickname: 'System',
    text,
    timestamp: Date.now(),
    isSystem: true,
  };
  room.chat.push(msg);
  if (room.chat.length > GAME.CHAT_MAX_HISTORY) room.chat.shift();
  emit(room, 'chat:message', msg);
}
