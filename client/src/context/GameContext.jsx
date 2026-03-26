import { createContext, useContext, useReducer, useEffect } from 'react';
import { gameReducer, initialState } from '../reducers/gameReducer.js';
import socket from '../socket/socketClient.js';
import { EVENTS } from '../socket/events.js';

const GameContext = createContext(null);

export function GameProvider({ children }) {
  const [state, dispatch] = useReducer(gameReducer, initialState);

  useEffect(() => {
    socket.connect();

    const on = (event, handler) => socket.on(event, handler);

    on('connect',    () => dispatch({ type: 'CONNECTED' }));
    on('disconnect', () => dispatch({ type: 'DISCONNECTED' }));

    on(EVENTS.ROOM_CREATED, payload =>
      dispatch({ type: 'ROOM_CREATED', payload }));

    on(EVENTS.ROOM_JOINED, payload =>
      dispatch({ type: 'ROOM_JOINED', payload }));

    on(EVENTS.ROOM_ERROR, payload =>
      dispatch({ type: 'ROOM_ERROR', payload }));

    on(EVENTS.ROOM_PLAYER_JOINED, payload =>
      dispatch({ type: 'PLAYER_JOINED', payload }));

    on(EVENTS.ROOM_PLAYER_LEFT, payload =>
      dispatch({ type: 'PLAYER_LEFT', payload }));

    on(EVENTS.ROOM_HOST_CHANGED, payload =>
      dispatch({ type: 'HOST_CHANGED', payload }));

    on(EVENTS.ROOM_KICKED, () =>
      dispatch({ type: 'KICKED' }));

    on(EVENTS.ROOM_CONFIG_UPDATED, payload =>
      dispatch({ type: 'CONFIG_UPDATED', payload }));

    on(EVENTS.ROOM_SPECTATORS_UPDATED, payload =>
      dispatch({ type: 'SPECTATORS_UPDATED', payload }));

    on(EVENTS.GAME_PHASE_CHANGE, payload =>
      dispatch({ type: 'PHASE_CHANGE', payload }));

    on(EVENTS.GAME_SUBMISSION_ACK, () =>
      dispatch({ type: 'SUBMISSION_ACK' }));

    on(EVENTS.GAME_SUBMISSION_COUNT, payload =>
      dispatch({ type: 'SUBMISSION_COUNT', payload }));

    on(EVENTS.GAME_VOTE_ACK, () =>
      dispatch({ type: 'VOTE_ACK' }));

    on(EVENTS.GAME_VOTE_COUNT, payload =>
      dispatch({ type: 'VOTE_COUNT', payload }));

    on(EVENTS.CHAT_MESSAGE_IN, payload =>
      dispatch({ type: 'CHAT_MESSAGE', payload }));

    return () => {
      socket.removeAllListeners();
      socket.disconnect();
    };
  }, []);

  return (
    <GameContext.Provider value={{ state, dispatch }}>
      {children}
    </GameContext.Provider>
  );
}

export function useGame() {
  const ctx = useContext(GameContext);
  if (!ctx) throw new Error('useGame must be used within GameProvider');
  return ctx;
}
