import { createRoom, createPlayer, serializeRoom } from './Room.js';
import { generateCode } from '../utils/codeGenerator.js';
import { GAME } from '../config.js';

class RoomManager {
  constructor() {
    /** @type {Map<string, import('./Room.js').Room>} */
    this.rooms = new Map();

    // Periodic cleanup of stale rooms
    setInterval(() => this._cleanup(), 60_000);
  }

  createRoom(hostSocketId, name = null, isPublic = false) {
    const code = generateCode(new Set(this.rooms.keys()));
    const room = createRoom({ code, hostSocketId, name, isPublic });
    this.rooms.set(code, room);
    return room;
  }

  getRoom(code) {
    return this.rooms.get(code?.toUpperCase()) ?? null;
  }

  deleteRoom(code) {
    this.rooms.delete(code);
  }

  touch(room) {
    room.lastActivityAt = Date.now();
  }

  _cleanup() {
    const now = Date.now();
    for (const [code, room] of this.rooms) {
      const activePlayers = [...room.players.values()].filter(
        p => p.disconnectedAt === null
      );
      if (activePlayers.length === 0) {
        const idleMs = now - room.lastActivityAt;
        if (idleMs > GAME.ROOM_EMPTY_CLEANUP_MS) {
          this.deleteRoom(code);
        }
      } else if (room.phase === 'game_over') {
        const idleMs = now - room.lastActivityAt;
        if (idleMs > GAME.ROOM_IDLE_CLEANUP_MS) {
          this.deleteRoom(code);
        }
      }
    }
  }
}

export default new RoomManager();
