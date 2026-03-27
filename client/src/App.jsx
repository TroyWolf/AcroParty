import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import IntroScreen from './components/IntroScreen.jsx';

function parseUrlCode() {
  const code = window.location.pathname.slice(1).toUpperCase();
  return /^[A-Z2-9]{4}$/.test(code) ? code : null;
}

function AppInner({ urlCode }) {
  const { state } = useGame();
  if (!state.roomCode) return <HomePage urlCode={urlCode} />;
  return <RoomPage />;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const urlCode = parseUrlCode();
  if (showIntro) return <IntroScreen onDone={() => setShowIntro(false)} />;
  return (
    <GameProvider>
      <AppInner urlCode={urlCode} />
    </GameProvider>
  );
}
