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
          <div className="chat-empty">
            <span className="wave">👋</span>
            <p>No messages yet.<br/>Say hi!</p>
          </div>
        )}
        {messages.map((m, i) => {
          const isMe = m.userId === myId;
          return (
            <div key={i} className={`chat-row ${isMe ? 'chat-row-me' : ''} slide-up`}>
              {!isMe && (
                <img 
                  src={`https://api.dicebear.com/7.x/notionists/svg?seed=${m.username}&backgroundColor=transparent`} 
                  alt="avatar" 
                  className="chat-avatar" 
                />
              )}
              <div className={`chat-bubble ${isMe ? 'chat-bubble-me' : ''}`}>
                <div className="chat-header">
                  <span className="chat-author">{ROLE_TAG[m.role]} {m.username}</span>
                  <span className="chat-time">
                    {new Date(m.timestamp).toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' })}
                  </span>
                </div>
                <div className="chat-text">{m.message}</div>
              </div>
            </div>
          );
        })}
        <div ref={bottomRef} />
      </div>
      <div className="chat-input-row">
        <input
          type="text"
          placeholder="Type a message..."
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
