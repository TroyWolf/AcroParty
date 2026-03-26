import { useState, useEffect, useRef, useCallback } from 'react';
import ChatPanel from '../chat/ChatPanel.jsx';
import PlayerList from '../lobby/PlayerList.jsx';
import { useGame } from '../../context/GameContext.jsx';
import styles from './GameLayout.module.css';

function useIsDesktop() {
  const [isDesktop, setIsDesktop] = useState(
    () => window.matchMedia('(min-width: 768px)').matches
  );
  useEffect(() => {
    const mq = window.matchMedia('(min-width: 768px)');
    const handler = (e) => setIsDesktop(e.matches);
    mq.addEventListener('change', handler);
    return () => mq.removeEventListener('change', handler);
  }, []);
  return isDesktop;
}

export default function GameLayout({ children }) {
  const { state } = useGame();
  const isDesktop = useIsDesktop();
  const [activeTab, setActiveTab] = useState('game');
  const [unreadCount, setUnreadCount] = useState(0);
  const prevMsgCount = useRef(state.chatMessages.length);
  const prevPhase = useRef(state.phase);

  // Reset to game tab on every phase change
  useEffect(() => {
    if (state.phase !== prevPhase.current) {
      prevPhase.current = state.phase;
      setActiveTab('game');
    }
  }, [state.phase]);

  // Increment unread badge only for player (non-system) messages when chat isn't active
  useEffect(() => {
    const newCount = state.chatMessages.length;
    if (newCount > prevMsgCount.current && activeTab !== 'chat') {
      const newMessages = state.chatMessages.slice(prevMsgCount.current);
      const playerMessages = newMessages.filter(m => !m.isSystem).length;
      if (playerMessages > 0) setUnreadCount(c => c + playerMessages);
    }
    prevMsgCount.current = newCount;
  }, [state.chatMessages.length, activeTab]);

  // Clear unread when chat tab is opened
  useEffect(() => {
    if (activeTab === 'chat') setUnreadCount(0);
  }, [activeTab]);

  const [urlCopied, setUrlCopied] = useState(false);
  const copyUrl = useCallback(() => {
    const url = `${window.location.origin}/${state.roomCode}`;
    navigator.clipboard?.writeText(url).then(() => {
      setUrlCopied(true);
      setTimeout(() => setUrlCopied(false), 1500);
    });
  }, [state.roomCode]);

  const topBar = (
    <div className={styles.topBar}>
      <span className={styles.topBarBrand}>ACROPARTY</span>
      {state.roomCode && (
        <button className={styles.topBarCopy} onClick={copyUrl} title="Copy join link">
          {urlCopied ? 'Copied!' : `acroparty.com/${state.roomCode}`}
        </button>
      )}
    </div>
  );

  // Desktop: always show 3-column layout (sidebar | main | chat)
  if (isDesktop) {
    return (
      <div className={styles.desktopWrapper}>
        {topBar}
        <div className={styles.desktopLayout}>
          <div className={styles.sidebar}><PlayerList /></div>
          <div className={styles.main}>{children}</div>
          <div className={styles.desktopChat}><ChatPanel /></div>
        </div>
      </div>
    );
  }

  // Mobile: tab-based layout with bottom nav (all phases, including lobby)
  return (
    <div className={styles.mobileLayout}>
      {topBar}
      <div className={styles.tabContent}>
        <div className={activeTab === 'game' ? styles.tabPane : styles.tabPaneHidden}>
          {children}
        </div>
        <div className={activeTab === 'players' ? styles.tabPane : styles.tabPaneHidden}>
          <div className={styles.playersTabInner}><PlayerList /></div>
        </div>
        <div className={activeTab === 'chat' ? styles.tabPaneFull : styles.tabPaneHidden}>
          <ChatPanel />
        </div>
      </div>

      <nav className={styles.bottomNav}>
        <button
          className={`${styles.navBtn} ${activeTab === 'game' ? styles.navBtnActive : ''}`}
          onClick={() => setActiveTab('game')}
        >
          <span className={styles.navLabel}>Game</span>
        </button>
        <button
          className={`${styles.navBtn} ${activeTab === 'players' ? styles.navBtnActive : ''}`}
          onClick={() => setActiveTab('players')}
        >
          <span className={styles.navLabel}>Players ({state.players.length})</span>
        </button>
        <button
          className={`${styles.navBtn} ${activeTab === 'chat' ? styles.navBtnActive : ''}`}
          onClick={() => setActiveTab('chat')}
        >
          <span className={styles.navLabel}>Chat</span>
          {unreadCount > 0 && (
            <span className={styles.badge}>{unreadCount > 9 ? '9+' : unreadCount}</span>
          )}
        </button>
      </nav>
    </div>
  );
}
