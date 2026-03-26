import RoomManager from '../game/RoomManager.js';
import { createPlayer, serializeRoom, serializePlayer } from '../game/Room.js';
import { sanitizeNickname } from '../utils/sanitize.js';
import { broadcastSystemChat, handleDisconnect, checkMinPlayers } from '../game/GameEngine.js';
import { GAME } from '../config.js';

export function registerRoomHandlers(io, socket) {
  // ── Create room ────────────────────────────────────────────────────────────
  socket.on('room:create', ({ nickname } = {}) => {
    const clean = sanitizeNickname(nickname ?? '');
    if (!clean) return socket.emit('room:error', { message: 'Invalid nickname.' });

    const room = RoomManager.createRoom(socket.id);
    const player = createPlayer({ socketId: socket.id, nickname: clean, isHost: true });
    room.players.set(socket.id, player);

    socket.roomCode = room.code;
    socket.join(room.code);

    socket.emit('room:created', {
      room: serializeRoom(room),
      you: serializePlayer(player),
    });
  });

  // ── Join room ──────────────────────────────────────────────────────────────
  socket.on('room:join', ({ nickname, code, asSpectator = false } = {}) => {
    const clean = sanitizeNickname(nickname ?? '');
    if (!clean) return socket.emit('room:error', { message: 'Invalid nickname.' });

    const room = RoomManager.getRoom(code);
    if (!room) return socket.emit('room:error', { message: 'Room not found.' });

    // Check for duplicate nickname
    const taken = [...room.players.values()].some(
      p => p.nickname.toLowerCase() === clean.toLowerCase() && p.disconnectedAt === null
    );
    if (taken) return socket.emit('room:error', { message: 'Nickname already taken.' });

    // Check if game is in progress and they're not rejoining
    const inProgress = !['lobby', 'game_over'].includes(room.phase);

    if (inProgress && !asSpectator) {
      return socket.emit('room:error', {
        message: 'Game in progress. Join as spectator?',
        canSpectate: true,
      });
    }

    if (asSpectator || inProgress) {
      room.spectators.set(socket.id, clean);
      socket.roomCode = room.code;
      socket.join(room.code);

      // Send current phase state snapshot
      const phasePayload = buildPhaseSnapshot(room);

      socket.emit('room:joined', {
        room: serializeRoom(room),
        you: { socketId: socket.id, nickname: clean, isSpectator: true },
        chat: room.chat.slice(-50),
        currentPhase: phasePayload,
      });

      broadcastSystemChat(room, `${clean} joined as a spectator.`);
      io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
      return;
    }

    // Full player — lobby only
    if (room.players.size >= GAME.MAX_PLAYERS) {
      return socket.emit('room:error', { message: 'Room is full.' });
    }

    const player = createPlayer({ socketId: socket.id, nickname: clean });
    room.players.set(socket.id, player);

    socket.roomCode = room.code;
    socket.join(room.code);

    socket.emit('room:joined', {
      room: serializeRoom(room),
      you: serializePlayer(player),
      chat: room.chat.slice(-50),
    });

    io.to(room.code).emit('room:player_joined', { player: serializePlayer(player) });
    broadcastSystemChat(room, `${clean} joined the room.`);
    RoomManager.touch(room);
  });

  // ── Leave room ─────────────────────────────────────────────────────────────
  socket.on('room:leave', () => {
    leaveRoom(io, socket);
  });

  // ── Host: update config ────────────────────────────────────────────────────
  socket.on('host:change_config', ({ totalRounds } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room || room.phase !== 'lobby') return;
    if (room.hostSocketId !== socket.id) return;

    if (typeof totalRounds === 'number') {
      room.config.totalRounds = Math.min(GAME.MAX_ROUNDS, Math.max(GAME.MIN_ROUNDS, totalRounds));
    }

    io.to(room.code).emit('room:config_updated', { config: room.config });
  });

  // ── Host: kick player or spectator ────────────────────────────────────────
  socket.on('host:kick', ({ targetSocketId } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    if (targetSocketId === socket.id) return;

    // Kick spectator (allowed at any time)
    if (room.spectators.has(targetSocketId)) {
      const nickname = room.spectators.get(targetSocketId);
      room.spectators.delete(targetSocketId);
      io.to(targetSocketId).emit('room:kicked');
      io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
      broadcastSystemChat(room, `${nickname} was kicked.`);
      return;
    }

    // Kick player (lobby only)
    if (room.phase !== 'lobby') return;
    const target = room.players.get(targetSocketId);
    if (!target) return;

    room.players.delete(targetSocketId);
    io.to(targetSocketId).emit('room:kicked');
    io.to(room.code).emit('room:player_left', { socketId: targetSocketId, nickname: target.nickname });
    broadcastSystemChat(room, `${target.nickname} was kicked.`);
  });

  // ── Disconnect ─────────────────────────────────────────────────────────────
  socket.on('disconnect', () => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;
    handleDisconnect(room, socket.id);
    RoomManager.touch(room);
  });
}

export function leaveRoom(io, socket) {
  const room = RoomManager.getRoom(socket.roomCode);
  if (!room) return;

  const player = room.players.get(socket.id);
  if (player) {
    room.players.delete(socket.id);
    io.to(room.code).emit('room:player_left', { socketId: socket.id, nickname: player.nickname });
    broadcastSystemChat(room, `${player.nickname} left the room.`);
    checkMinPlayers(room);

    // Transfer host if needed
    if (room.hostSocketId === socket.id) {
      const next = [...room.players.values()].find(p => !p.isSpectator && p.disconnectedAt === null);
      if (next) {
        next.isHost = true;
        room.hostSocketId = next.socketId;
        io.to(room.code).emit('room:host_changed', { newHostSocketId: next.socketId });
        broadcastSystemChat(room, `${next.nickname} is now the host.`);
      } else {
        RoomManager.deleteRoom(room.code);
      }
    }
  } else {
    room.spectators.delete(socket.id);
    io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
  }

  socket.leave(room.code);
  socket.roomCode = null;
  RoomManager.touch(room);
}

function serializeSpectators(room) {
  return [...room.spectators.entries()].map(([socketId, nickname]) => ({ socketId, nickname }));
}

function buildPhaseSnapshot(room) {
  const rs = room.currentRoundState;
  if (!rs) return null;

  const base = {
    phase: room.phase,
    round: rs.roundNumber,
    totalRounds: room.config.totalRounds,
    acronym: rs.acronym,
    phaseEndsAt: rs.phaseEndsAt,
  };

  if (room.phase === 'voting') {
    base.answers = [...rs.anonMap.entries()].map(([anonId]) => {
      const text = rs.submissions.get(rs.anonMap.get(anonId))?.text ?? '';
      return { anonId, text };
    });
  }

  return base;
}
