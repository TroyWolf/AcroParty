import { sanitizeChat } from '../utils/sanitize.js';
import { GAME } from '../config.js';
import RoomManager from '../game/RoomManager.js';

const lastMessageTime = new Map(); // socketId → timestamp

export function registerChatHandlers(io, socket) {
  socket.on('chat:message', ({ text } = {}) => {
    if (!text) return;

    // Rate limit
    const now = Date.now();
    const last = lastMessageTime.get(socket.id) ?? 0;
    if (now - last < GAME.CHAT_RATE_LIMIT_MS) return;
    lastMessageTime.set(socket.id, now);

    const room = RoomManager.getRoom(socket.roomCode);
    if (!room) return;

    const spectatorNickname = room.spectators.get(socket.id);
    const player = room.players.get(socket.id)
      ?? (spectatorNickname ? { nickname: spectatorNickname } : null);
    if (!player) return;

    const sanitized = sanitizeChat(text);
    if (!sanitized) return;

    const msg = {
      id: `${Date.now()}_${Math.random().toString(36).slice(2)}`,
      senderSocketId: socket.id,
      nickname: player.nickname,
      text: sanitized,
      timestamp: now,
      isSystem: false,
    };

    room.chat.push(msg);
    if (room.chat.length > GAME.CHAT_MAX_HISTORY) room.chat.shift();

    io.to(socket.roomCode).emit('chat:message', msg);
  });

  socket.on('disconnect', () => {
    lastMessageTime.delete(socket.id);
  });
}
