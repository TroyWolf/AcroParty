import RoomManager from '../game/RoomManager.js';
import { createPlayer, serializeRoom, serializePlayer } from '../game/Room.js';
import { sanitizeNickname } from '../utils/sanitize.js';
import { broadcastSystemChat, handleDisconnect, checkMinPlayers } from '../game/GameEngine.js';
import { GAME } from '../config.js';
import { log, roomLabel } from '../logger.js';

export function registerRoomHandlers(io, socket) {
  // ── Create room ────────────────────────────────────────────────────────────
  socket.on('room:create', ({ nickname, name, isPublic } = {}) => {
    const clean = sanitizeNickname(nickname ?? '');
    if (!clean) return socket.emit('room:error', { message: 'Invalid nickname.' });

    const cleanName = typeof name === 'string'
      ? name.replace(/[<>&"']/g, '').trim().slice(0, 30) || null
      : null;

    const room = RoomManager.createRoom(socket.id, cleanName, isPublic === true);
    const player = createPlayer({ socketId: socket.id, nickname: clean, isHost: true });
    room.players.set(socket.id, player);

    socket.roomCode = room.code;
    socket.join(room.code);

    socket.emit('room:created', {
      room: serializeRoom(room),
      you: serializePlayer(player),
    });
    log('CREATE', { room: roomLabel(room), player: clean, ...(room.name && { name: room.name }) });
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

    // Check if game is in progress
    const inProgress = !['lobby', 'game_over'].includes(room.phase);

    if (inProgress) {
      if (room.players.size >= GAME.MAX_PLAYERS && !asSpectator) {
        return socket.emit('room:error', { message: 'Room is full.' });
      }

      socket.roomCode = room.code;
      socket.join(room.code);
      const phasePayload = buildPhaseSnapshot(room);

      if (asSpectator) {
        room.spectators.set(socket.id, clean);
        socket.emit('room:joined', {
          room: serializeRoom(room),
          you: { socketId: socket.id, nickname: clean, isSpectator: true },
          chat: room.chat.slice(-50),
          currentPhase: phasePayload,
        });
        broadcastSystemChat(room, `${clean} joined as a spectator.`);
        io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
        log('JOIN_SPECTATOR', { room: roomLabel(room), player: clean });
      } else {
        room.pendingPlayers.set(socket.id, clean);
        socket.emit('room:joined', {
          room: serializeRoom(room),
          you: { socketId: socket.id, nickname: clean, isPending: true },
          chat: room.chat.slice(-50),
          currentPhase: phasePayload,
        });
        broadcastSystemChat(room, `${clean} will join next round.`);
        io.to(room.code).emit('room:pending_updated', { pendingPlayers: serializePendingPlayers(room) });
      }
      return;
    }

    // Lobby — spectator
    if (asSpectator) {
      socket.roomCode = room.code;
      socket.join(room.code);
      room.spectators.set(socket.id, clean);
      socket.emit('room:joined', {
        room: serializeRoom(room),
        you: { socketId: socket.id, nickname: clean, isSpectator: true },
        chat: room.chat.slice(-50),
      });
      broadcastSystemChat(room, `${clean} joined as a spectator.`);
      io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
      RoomManager.touch(room);
      log('JOIN_SPECTATOR', { room: roomLabel(room), player: clean });
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
    log('JOIN', { room: roomLabel(room), player: clean });
  });

  // ── Leave room ─────────────────────────────────────────────────────────────
  socket.on('room:leave', () => {
    leaveRoom(io, socket);
  });

  // ── Host: update config ────────────────────────────────────────────────────
  socket.on('host:change_config', ({ totalRounds, isPublic, profanityFilter } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room || room.phase !== 'lobby') return;
    if (room.hostSocketId !== socket.id) return;

    if (typeof totalRounds === 'number') {
      room.config.totalRounds = Math.min(GAME.MAX_ROUNDS, Math.max(GAME.MIN_ROUNDS, totalRounds));
    }
    if (typeof isPublic === 'boolean') {
      room.isPublic = isPublic;
    }
    if (typeof profanityFilter === 'boolean') {
      room.config.profanityFilter = profanityFilter;
    }

    io.to(room.code).emit('room:config_updated', { config: room.config, isPublic: room.isPublic });
  });

  // ── Host: kick player or spectator ────────────────────────────────────────
  socket.on('host:kick', ({ targetSocketId } = {}) => {
    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;
    if (room.hostSocketId !== socket.id) return;
    if (targetSocketId === socket.id) return;

    // Kick pending player (allowed at any time)
    if (room.pendingPlayers.has(targetSocketId)) {
      const nickname = room.pendingPlayers.get(targetSocketId);
      room.pendingPlayers.delete(targetSocketId);
      io.to(targetSocketId).emit('room:kicked');
      io.to(room.code).emit('room:pending_updated', { pendingPlayers: serializePendingPlayers(room) });
      broadcastSystemChat(room, `${nickname} was kicked.`);
      return;
    }

    // Kick spectator (allowed at any time)
    if (room.spectators.has(targetSocketId)) {
      const nickname = room.spectators.get(targetSocketId);
      room.spectators.delete(targetSocketId);
      io.to(targetSocketId).emit('room:kicked');
      io.to(room.code).emit('room:spectators_updated', { spectators: serializeSpectators(room) });
      broadcastSystemChat(room, `${nickname} was kicked.`);
      return;
    }

    // Kick active player
    const target = room.players.get(targetSocketId);
    if (!target) return;

    room.players.delete(targetSocketId);
    io.to(targetSocketId).emit('room:kicked');
    io.to(room.code).emit('room:player_left', { socketId: targetSocketId, nickname: target.nickname });
    broadcastSystemChat(room, `${target.nickname} was kicked.`);
    checkMinPlayers(room);
  });

  // ── List public rooms ──────────────────────────────────────────────────────
  socket.on('rooms:get_public', () => {
    const list = [...RoomManager.rooms.values()]
      .filter(r => r.isPublic && r.phase === 'lobby')
      .map(r => ({
        code: r.code,
        name: r.name,
        playerCount: [...r.players.values()].filter(p => p.disconnectedAt === null).length,
        totalRounds: r.config.totalRounds,
      }));
    socket.emit('rooms:public_list', { rooms: list });
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
  } else if (room.pendingPlayers.has(socket.id)) {
    room.pendingPlayers.delete(socket.id);
    io.to(room.code).emit('room:pending_updated', { pendingPlayers: serializePendingPlayers(room) });
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

function serializePendingPlayers(room) {
  return [...room.pendingPlayers.entries()].map(([socketId, nickname]) => ({ socketId, nickname }));
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
