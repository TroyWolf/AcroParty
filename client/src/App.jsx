import { useState } from 'react';
import { GameProvider, useGame } from './context/GameContext.jsx';
import HomePage from './pages/HomePage.jsx';
import RoomPage from './pages/RoomPage.jsx';
import IntroScreen from './components/IntroScreen.jsx';
import { useAudio } from './hooks/useAudio.js';

function parseUrlCode() {
  const code = window.location.pathname.slice(1).toUpperCase();
  return /^[A-Z2-9]{4}$/.test(code) ? code : null;
}

function AppInner({ urlCode, muted, toggleMute }) {
  const { state } = useGame();
  if (!state.roomCode) return <HomePage urlCode={urlCode} muted={muted} toggleMute={toggleMute} />;
  return <RoomPage muted={muted} toggleMute={toggleMute} />;
}

export default function App() {
  const [showIntro, setShowIntro] = useState(true);
  const { muted, toggleMute } = useAudio('/sounds/intro-music.mp3');
  const urlCode = parseUrlCode();
  return (
    <>
      {showIntro
        ? <IntroScreen onDone={() => setShowIntro(false)} />
        : <GameProvider><AppInner urlCode={urlCode} muted={muted} toggleMute={toggleMute} /></GameProvider>}
    </>
  );
}
