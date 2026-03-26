import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import IntroScreen from './components/IntroScreen.jsx';

function AppInner() {
  const { state } = useGame();
  if (!state.roomCode) return <HomePage />;
  return <RoomPage />;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  if (showIntro) return <IntroScreen onDone={() => setShowIntro(false)} />;
  return (
    <GameProvider>
      <AppInner />
    </GameProvider>
  );
}
