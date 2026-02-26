import React, { useState, useEffect, useRef } from 'react';
import { ChatMessage, LinkUpRequest } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getProfile, listenChatMessages, matchIdFor, sendChatMessage } from '../firestore';
import { useToast } from '../hooks/useToast';
import './Chat.css';

interface ChatProps {
  profileId: string;
}

const REACTIONS = ['❤️', '😂', '😮', '😢', '🔥', '👍'];

export default function Chat({ profileId }: ChatProps) {
  const { showToast, ToastContainer } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const [isTyping, setIsTyping] = useState(false);
  const [showReactions, setShowReactions] = useState<string | null>(null);
  const [linkUps, setLinkUps] = useState<LinkUpRequest[]>([]);
  const [showLinkUpModal, setShowLinkUpModal] = useState(false);
  const [linkUpForm, setLinkUpForm] = useState({
    intent: '',
    place: '',
    time: '',
    message: '',
    expiresInHours: '3',
  });
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);
  const [profile, setProfile] = useState<any>(null);
  const [matchId, setMatchId] = useState<string | null>(null);

  useEffect(() => {
    if (profileId) {
      setIsTyping(false);
    }
  }, [profileId]);

  useEffect(() => {
    scrollToBottom();
  }, [messages, isTyping]);

  useEffect(() => {
    let unsubMessages: (() => void) | null = null;
    let cancelled = false;

    const unsubAuth = onAuthStateChanged(auth, async (user) => {
      unsubMessages?.();
      if (!user || !profileId) {
        setMessages([]);
        setMatchId(null);
        setProfile(null);
        return;
      }

      const mId = matchIdFor(user.uid, profileId);
      setMatchId(mId);

      const p = await getProfile(profileId);
      if (!cancelled) setProfile(p);

      unsubMessages = listenChatMessages(mId, (msgs) => {
        setMessages(msgs);
      });
    });

    return () => {
      cancelled = true;
      unsubAuth();
      unsubMessages?.();
    };
  }, [profileId]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async (type: 'text' | 'image' | 'voice' = 'text', content?: string, fileUrl?: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid || !profileId || !matchId) return;
    if (type === 'text' && !inputText.trim()) return;

    await sendChatMessage({
      matchId,
      senderId: uid,
      text: type === 'text' ? inputText.trim() : content,
      imageUrl: type === 'image' ? fileUrl : undefined,
      voiceNoteUrl: type === 'voice' ? fileUrl : undefined,
      messageType: type,
    });

    setInputText('');
  };

  const handleImageUpload = (e: React.ChangeEvent<HTMLInputElement>) => {
    const file = e.target.files?.[0];
    if (file && file.type.startsWith('image/')) {
      const reader = new FileReader();
      reader.onloadend = () => {
        sendMessage('image', undefined, reader.result as string);
      };
      reader.readAsDataURL(file);
    }
  };

  const handleVoiceNote = () => {
    // Simulate voice note recording
    const voiceNoteUrl = 'data:audio/wav;base64,UklGRnoGAABXQVZFZm10IBAAAAABAAEAQB8AAEAfAAABAAgAZGF0YQoGAACBhYqFbF1fdJivrJBhNjVgodDbq2EcBj+a2/LDciUFLIHO8tiJNwgZaLvt559NEAxQp+PwtmMcBjiR1/LMeSwFJHfH8N2QQAoUXrTp66hVFApGn+DyvmwhBSuBzvLZiTYIGGW57+OeTQ8MT6Xh8LZjHAY4kdfyzHksBSR3x/DdkEAKFF606euoVRQKRp/g8r5sIQUrgc7y2Yk2CBhlue/jnk0PDE+l4fC2YxwGOJHX8sx5LAUkd8fw3ZBAC';
    sendMessage('voice', 'Voice note', voiceNoteUrl);
  };

  const addReaction = (messageId: string, emoji: string) => {
    setMessages(messages.map(msg => {
      if (msg.id !== messageId) return msg;
      const reactions = { ...(msg.reactions || {}) };
      if (!reactions[emoji]) reactions[emoji] = [];
      if (!reactions[emoji].includes('me')) {
        reactions[emoji].push('me');
      } else {
        reactions[emoji] = reactions[emoji].filter(id => id !== 'me');
        if (reactions[emoji].length === 0) {
          delete reactions[emoji];
        }
      }
      return { ...msg, reactions };
    }));
    setShowReactions(null);
  };

  const handleCreateLinkUp = () => {
    if (!profileId) return;
    if (!linkUpForm.intent || !linkUpForm.place || !linkUpForm.time) {
      showToast('Please add a time, place, and intent.', 'info');
      return;
    }

    const timeValue = new Date(linkUpForm.time).getTime();
    if (Number.isNaN(timeValue)) {
      showToast('Please choose a valid date and time.', 'info');
      return;
    }

    const expiresIn = parseInt(linkUpForm.expiresInHours, 10);
    const newRequest: LinkUpRequest = {
      id: `linkup-${Date.now()}`,
      profileId,
      createdBy: 'me',
      intent: linkUpForm.intent,
      place: linkUpForm.place,
      time: timeValue,
      message: linkUpForm.message.trim() || undefined,
      status: 'pending',
      createdAt: Date.now(),
      expiresAt: Date.now() + expiresIn * 3600000,
    };

    const updated = [newRequest, ...linkUps];
    setLinkUps(updated);
    setShowLinkUpModal(false);
    setLinkUpForm({
      intent: '',
      place: '',
      time: '',
      message: '',
      expiresInHours: '3',
    });
  };

  const updateLinkUpStatus = (requestId: string, status: LinkUpRequest['status']) => {
    if (!profileId) return;
    const updated = linkUps.map(request =>
      request.id === requestId ? { ...request, status } : request
    );
    setLinkUps(updated);
  };

  const formatDateTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleString([], { month: 'short', day: 'numeric', hour: 'numeric', minute: '2-digit' });
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  if (!profile) {
    return (
      <div className="chat-error">
        <div>Profile not found</div>
      </div>
    );
  }

  return (
    <div className="chat-container">
      <ToastContainer />
      <div className="chat-header">
        <img src={profile.photo} alt={profile.name} className="chat-header-avatar" />
        <div className="chat-header-info">
          <div className="chat-header-name">{profile.name}</div>
          <div className="chat-header-status">
            {isTyping ? 'Typing...' : 'Online'}
          </div>
        </div>
        <button className="chat-linkup-btn" onClick={() => setShowLinkUpModal(true)}>
          📅 LinkUp
        </button>
      </div>

      <div className="chat-messages">
        {linkUps.length > 0 && (
          <div className="linkup-section">
            {linkUps.slice(0, 3).map((request) => (
              <div key={request.id} className={`linkup-card ${request.status}`}>
                <div className="linkup-card-header">
                  <span className="linkup-title">LinkUp Request</span>
                  <span className={`linkup-status ${request.status}`}>{request.status}</span>
                </div>
                <div className="linkup-details">
                  <div><strong>Intent:</strong> {request.intent}</div>
                  <div><strong>When:</strong> {formatDateTime(request.time)}</div>
                  <div><strong>Where:</strong> {request.place}</div>
                  {request.message && <div className="linkup-message">“{request.message}”</div>}
                </div>
                {request.status === 'pending' && (
                  <div className="linkup-actions">
                    {request.createdBy === 'me' ? (
                      <button className="linkup-btn secondary" onClick={() => updateLinkUpStatus(request.id, 'canceled')}>
                        Cancel
                      </button>
                    ) : (
                      <>
                        <button className="linkup-btn" onClick={() => updateLinkUpStatus(request.id, 'accepted')}>
                          Accept
                        </button>
                        <button className="linkup-btn secondary" onClick={() => updateLinkUpStatus(request.id, 'declined')}>
                          Decline
                        </button>
                      </>
                    )}
                  </div>
                )}
              </div>
            ))}
          </div>
        )}
        {messages.length === 0 && (
          <div className="chat-empty">
            <div>Start the conversation!</div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`chat-message ${message.senderId === 'me' ? 'sent' : 'received'}`}
          >
            <div className="chat-message-bubble">
              {message.messageType === 'image' && message.imageUrl && (
                <img src={message.imageUrl} alt="Shared" className="chat-message-image" />
              )}
              {message.messageType === 'voice' && (
                <div className="chat-voice-note">
                  <span className="voice-icon">🎤</span>
                  <span>Voice note</span>
                  <audio controls src={message.voiceNoteUrl} className="voice-player" />
                </div>
              )}
              {message.text && (
                <div className="chat-message-text">{message.text}</div>
              )}
              <div className="chat-message-footer">
                <div className="chat-message-time">{formatTime(message.timestamp)}</div>
                {message.senderId === 'me' && (
                  <div className="read-receipt">
                    {message.isRead ? '✓✓' : '✓'}
                  </div>
                )}
              </div>
              {Object.keys(message.reactions || {}).length > 0 && (
                <div className="message-reactions">
                  {Object.entries(message.reactions || {}).map(([emoji, users]) => (
                    <span
                      key={emoji}
                      className="reaction-badge"
                      onClick={() => addReaction(message.id, emoji)}
                    >
                      {emoji} {users.length}
                    </span>
                  ))}
                </div>
              )}
              <button
                className="reaction-btn"
                onClick={() => setShowReactions(showReactions === message.id ? null : message.id)}
              >
                +
              </button>
            </div>
            {showReactions === message.id && (
              <div className="reactions-picker">
                {REACTIONS.map(emoji => (
                  <button
                    key={emoji}
                    className="reaction-emoji-btn"
                    onClick={() => addReaction(message.id, emoji)}
                  >
                    {emoji}
                  </button>
                ))}
              </div>
            )}
          </div>
        ))}
        {isTyping && (
          <div className="chat-message received">
            <div className="chat-message-bubble typing-indicator">
              <span></span>
              <span></span>
              <span></span>
            </div>
          </div>
        )}
        <div ref={messagesEndRef} />
      </div>

      <div className="chat-input-container">
        <input
          ref={fileInputRef}
          type="file"
          accept="image/*"
          onChange={handleImageUpload}
          style={{ display: 'none' }}
        />
        <button className="chat-attach-btn" onClick={() => fileInputRef.current?.click()}>
          📷
        </button>
        <button className="chat-voice-btn" onClick={handleVoiceNote}>
          🎤
        </button>
        <input
          type="text"
          className="chat-input"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
        <button className="chat-send-btn" onClick={() => sendMessage()} disabled={!inputText.trim()}>
          ➤
        </button>
      </div>
      {showLinkUpModal && (
        <div className="modal-overlay" onClick={() => setShowLinkUpModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Send LinkUp Request</h2>
            <select
              className="modal-input"
              value={linkUpForm.intent}
              onChange={(e) => setLinkUpForm(prev => ({ ...prev, intent: e.target.value }))}
            >
              <option value="">Select Intent</option>
              <option value="Friends">Friends</option>
              <option value="Events">Events</option>
              <option value="Dating">Dating</option>
              <option value="Just Browsing">Just Browsing</option>
            </select>
            <input
              type="text"
              className="modal-input"
              placeholder="Place (e.g., Rooftop Lounge)"
              value={linkUpForm.place}
              onChange={(e) => setLinkUpForm(prev => ({ ...prev, place: e.target.value }))}
            />
            <input
              type="datetime-local"
              className="modal-input"
              value={linkUpForm.time}
              onChange={(e) => setLinkUpForm(prev => ({ ...prev, time: e.target.value }))}
            />
            <textarea
              className="modal-input"
              rows={3}
              placeholder="Optional message"
              value={linkUpForm.message}
              onChange={(e) => setLinkUpForm(prev => ({ ...prev, message: e.target.value }))}
            />
            <select
              className="modal-input"
              value={linkUpForm.expiresInHours}
              onChange={(e) => setLinkUpForm(prev => ({ ...prev, expiresInHours: e.target.value }))}
            >
              <option value="1">Expires in 1 hour</option>
              <option value="3">Expires in 3 hours</option>
              <option value="24">Expires in 24 hours</option>
            </select>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLinkUpModal(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleCreateLinkUp}>Send Request</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
