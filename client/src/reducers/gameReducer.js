export const initialState = {
  // Connection
  connected: false,

  // Room
  roomCode: null,
  phase: null,      // null | 'lobby' | 'submission' | 'voting' | 'results' | 'game_over'

  // Self
  me: null,         // { socketId, nickname, isHost, isSpectator, score }

  // Players
  players: [],
  spectators: [],

  // Game config
  config: { totalRounds: 5 },

  // Current round
  round: {
    roundNumber: 0,
    totalRounds: 0,
    acronym: null,
    phaseEndsAt: null,
    answers: [],          // anonymized during voting, revealed during results
    scoreDelta: {},
    currentScores: {},
    roundWinner: null,
    submissionCount: null,
    voteCount: null,
    noSubmissions: false,
    singleSubmission: false,
  },

  // My round state
  hasSubmitted: false,
  hasVoted: false,
  mySubmission: null,   // text the player submitted this round

  // Chat
  chatMessages: [],

  // Game over
  finalScores: [],
  mvp: null,

  // Error
  error: null,
};

export function gameReducer(state, action) {
  switch (action.type) {
    case 'CONNECTED':
      return { ...state, connected: true };

    case 'DISCONNECTED':
      return { ...state, connected: false };

    case 'ROOM_CREATED':
    case 'ROOM_JOINED': {
      const { room, you, chat = [], currentPhase } = action.payload;
      const newState = {
        ...state,
        roomCode: room.code,
        phase: room.phase,
        me: you,
        players: room.players,
        spectators: room.spectators ?? [],
        config: room.config,
        chatMessages: chat,
        error: null,
      };
      if (currentPhase) {
        newState.round = buildRound(state.round, currentPhase);
        newState.phase = currentPhase.phase;
      }
      return newState;
    }

    case 'ROOM_ERROR':
      return { ...state, error: action.payload.message };

    case 'CLEAR_ERROR':
      return { ...state, error: null };

    case 'PLAYER_JOINED': {
      const { player } = action.payload;
      if (state.players.find(p => p.socketId === player.socketId)) return state;
      return { ...state, players: [...state.players, player] };
    }

    case 'PLAYER_LEFT': {
      const { socketId } = action.payload;
      return {
        ...state,
        players: state.players.filter(p => p.socketId !== socketId),
      };
    }

    case 'HOST_CHANGED': {
      const { newHostSocketId } = action.payload;
      const players = state.players.map(p => ({
        ...p,
        isHost: p.socketId === newHostSocketId,
      }));
      const me = state.me?.socketId === newHostSocketId
        ? { ...state.me, isHost: true }
        : state.me?.isHost
          ? { ...state.me, isHost: false }
          : state.me;
      return { ...state, players, me };
    }

    case 'CONFIG_UPDATED':
      return { ...state, config: action.payload.config };

    case 'PHASE_CHANGE': {
      const payload = action.payload;
      const phase = payload.phase;

      const newState = {
        ...state,
        phase,
        round: buildRound(state.round, payload),
      };

      // Reset per-round player state at start of new round
      if (phase === 'submission') {
        newState.hasSubmitted = false;
        newState.hasVoted = false;
        newState.mySubmission = null;
      }

      // If we're back to lobby after play_again
      if (phase === 'lobby') {
        newState.players = payload.room?.players ?? state.players;
        newState.spectators = payload.room?.spectators ?? state.spectators;
        newState.config = payload.room?.config ?? state.config;
        newState.round = initialState.round;
        newState.hasSubmitted = false;
        newState.hasVoted = false;
      }

      // Update my player record from players list if present
      if (payload.room?.players) {
        const myRecord = payload.room.players.find(p => p.socketId === state.me?.socketId);
        if (myRecord) newState.me = { ...state.me, ...myRecord };
      }

      // Store game_over data
      if (phase === 'game_over') {
        newState.finalScores = payload.finalScores ?? [];
        newState.mvp = payload.mvp ?? null;
      }

      return newState;
    }

    case 'MY_SUBMISSION':
      return { ...state, mySubmission: action.payload };

    case 'SUBMISSION_ACK':
      return { ...state, hasSubmitted: true };

    case 'VOTE_ACK':
      return { ...state, hasVoted: true };

    case 'SUBMISSION_COUNT':
      return {
        ...state,
        round: { ...state.round, submissionCount: action.payload },
      };

    case 'VOTE_COUNT':
      return {
        ...state,
        round: { ...state.round, voteCount: action.payload },
      };

    case 'CHAT_MESSAGE':
      return {
        ...state,
        chatMessages: [...state.chatMessages, action.payload].slice(-200),
      };

    case 'KICKED':
      return { ...initialState };

    default:
      return state;
  }
}

function buildRound(prev, payload) {
  return {
    ...prev,
    roundNumber: payload.round ?? prev.roundNumber,
    totalRounds: payload.totalRounds ?? prev.totalRounds,
    acronym: payload.acronym ?? prev.acronym,
    phaseEndsAt: payload.phaseEndsAt ?? prev.phaseEndsAt,
    answers: payload.answers ?? prev.answers,
    scoreDelta: payload.scoreDelta ?? prev.scoreDelta,
    currentScores: payload.currentScores ?? prev.currentScores,
    roundWinner: payload.roundWinner ?? null,
    noSubmissions: payload.noSubmissions ?? false,
    singleSubmission: payload.singleSubmission ?? false,
    submissionCount: null,
    voteCount: null,
  };
}
