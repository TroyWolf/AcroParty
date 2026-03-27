import { useGame } from '../context/GameContext.jsx';
import GameLayout from '../components/game/GameLayout.jsx';
import LobbyRoom from '../components/lobby/LobbyRoom.jsx';
import SubmissionPhase from '../components/game/SubmissionPhase.jsx';
import VotingPhase from '../components/game/VotingPhase.jsx';
import ResultsPhase from '../components/game/ResultsPhase.jsx';
import GameOver from '../components/game/GameOver.jsx';

export default function RoomPage() {
  const { state } = useGame();

  function renderMain() {
    switch (state.phase) {
      case 'lobby':      return <LobbyRoom />;
      case 'submission': return <SubmissionPhase />;
      case 'voting':     return <VotingPhase />;
      case 'results':    return <ResultsPhase />;
      case 'game_over':  return <GameOver />;
      default:           return <LobbyRoom />;
    }
  }

  return (
    <GameLayout>
      {renderMain()}
    </GameLayout>
  );
}
