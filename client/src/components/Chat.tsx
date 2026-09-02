import { useState, useRef, useEffect } from 'react';
import { ChatMessage } from '../types';

interface Props {
  messages: ChatMessage[];
  onSend: (message: string) => void;
  myId: string;
}

const ROLE_TAG: Record<string, string> = {
  host: '👑',
  moderator: '🛡',
  participant: '',
};

export default function Chat({ messages, onSend, myId }: Props) {
  const [input, setInput] = useState('');
  const bottomRef = useRef<HTMLDivElement>(null);

  // Auto-scroll to bottom when new messages arrive
  useEffect(() => {
    bottomRef.current?.scrollIntoView({ behavior: 'smooth' });
  }, [messages]);

  const handleSend = () => {
    const msg = input.trim();
    if (!msg) return;
    onSend(msg);
    setInput('');
  };

  return (
    <div className="chat-panel">
      <h3>💬 Chat</h3>
      <div className="chat-messages">
        {messages.length === 0 && (
          <p className="chat-empty">No messages yet. Say hi! 👋</p>
        )}
        {messages.map((m, i) => (
          <div key={i} className={`chat-msg ${m.userId === myId ? 'chat-msg-me' : ''}`}>
            <span className="chat-author">
              {ROLE_TAG[m.role]} {m.username}
            </span>
            <span className="chat-text">{m.message}</span>
            <span className="chat-time">
              {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
            </span>
          </div>
        ))}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message…"
          value={input}
          maxLength={500}
          onChange={(e) => setInput(e.target.value)}
          onKeyDown={(e) => e.key === 'Enter' && handleSend()}
        />
        <button className="btn-primary" onClick={handleSend}>Send</button>
      </div>
    </div>
  );
}
