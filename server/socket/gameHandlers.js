import RoomManager from '../game/RoomManager.js';
import { startGame, handleSubmit, handleVote, promotePendingPlayers } from '../game/GameEngine.js';
import { sanitizeSubmission } from '../utils/sanitize.js';
import { GAME } from '../config.js';
import { serializeRoom } from '../game/Room.js';

export function registerGameHandlers(io, socket) {
  // ── Start game ────────────────────────────────────────────────────────────
  socket.on('game:start', ({ totalRounds } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    if (room.phase !== 'lobby' && room.phase !== 'game_over') return;

    const activePlayers = [...room.players.values()].filter(
      p => !p.isSpectator && p.disconnectedAt === null
    );
    if (activePlayers.length < GAME.MIN_PLAYERS_TO_START) {
      return socket.emit('room:error', {
        message: `Need at least ${GAME.MIN_PLAYERS_TO_START} players to start.`,
      });
    }

    if (typeof totalRounds === 'number') {
      room.config.totalRounds = Math.min(GAME.MAX_ROUNDS, Math.max(GAME.MIN_ROUNDS, totalRounds));
    }

    startGame(room);
  });

  // ── Submit answer ─────────────────────────────────────────────────────────
  socket.on('game:submit', ({ text } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;

    const sanitized = sanitizeSubmission(text ?? '');
    if (!sanitized) return socket.emit('room:error', { message: 'Empty submission.' });

    const result = handleSubmit(room, socket.id, sanitized);
    if (result.error) {
      socket.emit('room:error', { message: result.error });
    } else {
      socket.emit('game:submission_ack', { submittedAt: Date.now() });
    }
  });

  // ── Cast vote ─────────────────────────────────────────────────────────────
  socket.on('game:vote', ({ anonId } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;

    const result = handleVote(room, socket.id, anonId);
    if (result.error) {
      socket.emit('room:error', { message: result.error });
    } else {
      socket.emit('game:vote_ack');
    }
  });

  // ── Play again (host resets to lobby) ────────────────────────────────────
  socket.on('game:play_again', () => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    if (room.phase !== 'game_over') return;

    room.phase = 'lobby';
    room.currentRound = 0;
    room.currentRoundState = null;
    room.rounds = [];
    promotePendingPlayers(room);
    for (const p of room.players.values()) {
      p.score = 0;
      p.hasSubmitted = false;
      p.hasVoted = false;
    }

    io.to(room.code).emit('game:phase_change', {
      phase: 'lobby',
      room: serializeRoom(room),
    });
    RoomManager.touch(room);
  });
}
