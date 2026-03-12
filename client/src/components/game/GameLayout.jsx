import ChatPanel from '../chat/ChatPanel.jsx';
import PlayerList from '../lobby/PlayerList.jsx';
import { useGame } from '../../context/GameContext.jsx';
import styles from './GameLayout.module.css';

export default function GameLayout({ children }) {
  const { state } = useGame();

  return (
    <div className={styles.layout}>
      <div className={styles.sidebar}>
        <PlayerList />
      </div>
      <div className={styles.main}>
        {children}
      </div>
      <div className={styles.chat}>
        <ChatPanel />
      </div>
    </div>
  );
}
