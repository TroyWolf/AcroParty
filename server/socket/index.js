import { registerRoomHandlers } from './roomHandlers.js';
import { registerGameHandlers } from './gameHandlers.js';
import { registerChatHandlers } from './chatHandlers.js';

export function registerSocketHandlers(io) {
  io.on('connection', (socket) => {
    socket.roomCode = null;

    registerRoomHandlers(io, socket);
    registerGameHandlers(io, socket);
    registerChatHandlers(io, socket);
  });
}
