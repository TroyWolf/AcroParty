import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import AdminPage from './pages/AdminPage.jsx';
import IntroScreen from './components/IntroScreen.jsx';
import { useAudio } from './hooks/useAudio.js';

const ADMIN_MODE = window.location.pathname.toLowerCase() === '/admin';

function parseUrlCode() {
  const code = window.location.pathname.slice(1).toUpperCase();
  return /^[A-Z2-9]{4}$/.test(code) ? code : null;
}

function AppInner({ urlCode, muted, toggleMute }) {
  const { state } = useGame();
  if (!state.roomCode) return <HomePage urlCode={urlCode} muted={muted} toggleMute={toggleMute} />;
  return <RoomPage muted={muted} toggleMute={toggleMute} />;
}

function GameApp() {
  const [showIntro, setShowIntro] = useState(true);
  const { muted, toggleMute } = useAudio('/sounds/Floating-in-Bliss.mp3');
  const urlCode = parseUrlCode();
  return (
    <>
      {showIntro
        ? <IntroScreen onDone={() => setShowIntro(false)} />
        : <GameProvider><AppInner urlCode={urlCode} muted={muted} toggleMute={toggleMute} /></GameProvider>}
    </>
  );
}

export default function App() {
  if (ADMIN_MODE) return <AdminPage />;
  return <GameApp />;
}
