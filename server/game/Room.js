export function createPlayer({ socketId, nickname, isHost = false, isSpectator = false }) {
  return {
    socketId,
    nickname,
    isHost,
    isSpectator,
    score: 0,
    hasSubmitted: false,
    hasVoted: false,
    disconnectedAt: null,
  };
}

export function createRoom({ code, hostSocketId }) {
  return {
    code,
    phase: 'lobby',
    hostSocketId,
    createdAt: Date.now(),
    lastActivityAt: Date.now(),

    config: {
      totalRounds: 5,
    },

    // Map<socketId, Player>
    players: new Map(),
    // Map<socketId, nickname>
    spectators: new Map(),

    currentRound: 0,
    currentRoundState: null,

    // Array of completed round summaries
    rounds: [],

    // Chat history
    chat: [],
  };
}

export function createRoundState({ roundNumber, acronym }) {
  return {
    roundNumber,
    acronym,         // string of capital letters e.g. "BFHT"
    phaseStartedAt: null,
    phaseEndsAt: null,
    timerHandle: null,
    // Map<socketId, { text, submittedAt }>
    submissions: new Map(),
    // Map<voterSocketId, anonId>  e.g. "anon_2"
    votes: new Map(),
    // Map<anonId, socketId>
    anonMap: new Map(),
  };
}

/** Serialize room for sending to clients — strips Maps/Sets and server-only fields */
export function serializeRoom(room, viewerSocketId = null) {
  const players = [...room.players.values()]
    .filter(p => p.disconnectedAt === null)
    .map(p => serializePlayer(p));

  return {
    code: room.code,
    phase: room.phase,
    hostSocketId: room.hostSocketId,
    config: { ...room.config },
    players,
    spectatorCount: room.spectators.size,
    currentRound: room.currentRound,
  };
}

export function serializePlayer(p) {
  return {
    socketId: p.socketId,
    nickname: p.nickname,
    isHost: p.isHost,
    isSpectator: p.isSpectator,
    score: p.score,
    hasSubmitted: p.hasSubmitted,
    hasVoted: p.hasVoted,
    disconnected: p.disconnectedAt !== null,
  };
}
