import { GameProvider, useGame } from './context/GameContext.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';

function AppInner() {
  const { state } = useGame();
  if (!state.roomCode) return <HomePage />;
  return <RoomPage />;
}

export default function App() {
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
