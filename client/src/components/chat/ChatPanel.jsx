import { useState, useRef, useEffect } from 'react';
import { useGame } from '../../context/GameContext.jsx';
import socket from '../../socket/socketClient.js';
import { EVENTS } from '../../socket/events.js';
import styles from './ChatPanel.module.css';

export default function ChatPanel() {
  const { state } = useGame();
  const [input, setInput] = useState('');
  const bottomRef = useRef(null);

  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [state.chatMessages]);

  function send(e) {
    e.preventDefault();
    if (!input.trim()) return;
    socket.emit(EVENTS.CHAT_MESSAGE, { text: input.trim() });
    setInput('');
  }

  return (
    <div className={styles.panel}>
      <div className={styles.watermark}>Chat</div>
      <div className={styles.header}>
        <span>Chat</span>
      </div>
      <div className={styles.messages}>
        {state.chatMessages.map(msg => (
          <div
            key={msg.id}
            className={`${styles.msg} ${msg.isSystem ? styles.system : ''} ${
              msg.senderSocketId === state.me?.socketId ? styles.mine : ''
            }`}
          >
            {!msg.isSystem && (
              <span className={styles.nick}>&lt;{msg.nickname}&gt;</span>
            )}
            <span className={styles.text}>{msg.text}</span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <form className={styles.form} onSubmit={send}>
        <input
          className={styles.input}
          value={input}
          onChange={e => setInput(e.target.value)}
          placeholder="Say something..."
          maxLength={200}
          autoComplete="off"
        />
        <button type="submit" disabled={!input.trim()}>Send</button>
      </form>
    </div>
  );
}
