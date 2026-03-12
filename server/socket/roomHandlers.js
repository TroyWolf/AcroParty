import RoomManager from '../game/RoomManager.js';
import { createPlayer, serializeRoom, serializePlayer } from '../game/Room.js';
import { sanitizeNickname } from '../utils/sanitize.js';
import { broadcastSystemChat, handleDisconnect } from '../game/GameEngine.js';
import { GAME } from '../config.js';
import { CATEGORIES } from '../game/CategoryData.js';

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
      categories: CATEGORIES,
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
      room.spectators.add(socket.id);
      socket.roomCode = room.code;
      socket.join(room.code);

      // Send current phase state snapshot
      const phasePayload = buildPhaseSnapshot(room);

      socket.emit('room:joined', {
        room: serializeRoom(room),
        you: { socketId: socket.id, nickname: clean, isSpectator: true },
        chat: room.chat.slice(-50),
        categories: CATEGORIES,
        currentPhase: phasePayload,
      });

      broadcastSystemChat(room, `${clean} joined as a spectator.`);
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
      categories: CATEGORIES,
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
  socket.on('host:change_config', ({ totalRounds, category } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room || room.phase !== 'lobby') return;
    if (room.hostSocketId !== socket.id) return;

    if (typeof totalRounds === 'number') {
      room.config.totalRounds = Math.min(GAME.MAX_ROUNDS, Math.max(GAME.MIN_ROUNDS, totalRounds));
    }
    if (typeof category === 'string') {
      room.config.category = category;
    }

    io.to(room.code).emit('room:config_updated', { config: room.config });
  });

  // ── Host: kick player ──────────────────────────────────────────────────────
  socket.on('host:kick', ({ targetSocketId } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room || room.phase !== 'lobby') return;
    if (room.hostSocketId !== socket.id) return;
    if (targetSocketId === socket.id) return;

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
  }

  socket.leave(room.code);
  socket.roomCode = null;
  RoomManager.touch(room);
}

function buildPhaseSnapshot(room) {
  const rs = room.currentRoundState;
  if (!rs) return null;

  const base = {
    phase: room.phase,
    round: rs.roundNumber,
    totalRounds: room.config.totalRounds,
    category: rs.category,
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
