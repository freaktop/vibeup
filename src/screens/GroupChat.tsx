import { useState, useEffect, useRef } from 'react';
import { ChatMessage } from '../types';
import { useToast } from '../hooks/useToast';
import { getCurrentUid } from '../auth';
import { listenRoom, listenRoomMessages, sendRoomMessage, updateRoomMeta } from '../firestore';
import './GroupChat.css';

interface GroupChatProps {
  groupId: string;
  groupName: string;
  groupMembers: string[];
}

export default function GroupChat({ groupId, groupName, groupMembers }: GroupChatProps) {
  const { showToast, ToastContainer } = useToast();
  const [messages, setMessages] = useState<ChatMessage[]>([]);
  const [inputText, setInputText] = useState('');
  const messagesEndRef = useRef<HTMLDivElement>(null);
  const [roomName, setRoomName] = useState(groupName);
  const [members, setMembers] = useState<string[]>(groupMembers);
  const [pinnedMessageId, setPinnedMessageId] = useState<string | null>(null);
  const [mutedMembers, setMutedMembers] = useState<string[]>([]);
  const [kickedMembers, setKickedMembers] = useState<string[]>([]);
  const [showToolsModal, setShowToolsModal] = useState(false);
  const [showMemberModal, setShowMemberModal] = useState(false);
  const [memberAction, setMemberAction] = useState<'mute' | 'kick' | null>(null);

  useEffect(() => {
    setRoomName(groupName);
  }, [groupName]);

  useEffect(() => {
    const unsubRoom = listenRoom(groupId, (room) => {
      if (!room) return;
      setRoomName(room.name || groupName);
      setMembers(room.members || []);
      setPinnedMessageId(room.pinnedMessageId || null);
      setMutedMembers(room.mutedMembers || []);
      setKickedMembers(room.kickedMembers || []);
    });

    const unsubMessages = listenRoomMessages(groupId, (nextMessages) => {
      setMessages(nextMessages);
    });

    return () => {
      unsubRoom();
      unsubMessages();
    };
  }, [groupId, groupName]);

  useEffect(() => {
    scrollToBottom();
  }, [messages]);

  const scrollToBottom = () => {
    messagesEndRef.current?.scrollIntoView({ behavior: 'smooth' });
  };

  const sendMessage = async () => {
    const uid = getCurrentUid();
    if (!uid) {
      showToast('Please sign in first.', 'error');
      return;
    }

    if (!inputText.trim()) return;
    if (mutedMembers.includes(uid)) {
      showToast('You are muted in this room.', 'info');
      return;
    }

    try {
      await sendRoomMessage({
        roomId: groupId,
        senderId: uid,
        text: inputText.trim(),
      });
      setInputText('');
    } catch {
      showToast('Unable to send message right now.', 'error');
    }
  };

  const updateGroupMeta = (updates: Record<string, any>) => {
    updateRoomMeta(groupId, updates).catch(() => {
      showToast('Unable to update room settings right now.', 'error');
    });
  };

  const handleModeration = () => {
    setShowToolsModal(true);
  };

  const handlePinLastMessage = () => {
    const lastMessage = messages[messages.length - 1];
    if (!lastMessage) {
      showToast('No messages to pin yet.', 'info');
      return;
    }
    updateGroupMeta({ pinnedMessageId: lastMessage.id });
    showToast('Pinned latest message.', 'success');
    setShowToolsModal(false);
  };

  const handleClearPinnedMessage = () => {
    updateGroupMeta({ pinnedMessageId: null });
    showToast('Cleared pinned message.', 'success');
    setShowToolsModal(false);
  };

  const openMemberAction = (action: 'mute' | 'kick') => {
    if (members.length === 0) {
      showToast('No members available.', 'info');
      return;
    }
    setMemberAction(action);
    setShowMemberModal(true);
    setShowToolsModal(false);
  };

  const handleSelectMemberAction = (member: string) => {
    if (memberAction === 'mute') {
      const updated = Array.from(new Set([...mutedMembers, member]));
      updateGroupMeta({ mutedMembers: updated });
      showToast(`${member} muted.`, 'success');
    }

    if (memberAction === 'kick') {
      const updatedMembers = members.filter(m => m !== member);
      updateGroupMeta({
        members: updatedMembers,
        kickedMembers: Array.from(new Set([...kickedMembers, member])),
      });
      setMembers(updatedMembers);
      showToast(`${member} removed from room.`, 'success');
    }

    setShowMemberModal(false);
    setMemberAction(null);
  };

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    return date.toLocaleTimeString([], { hour: '2-digit', minute: '2-digit' });
  };

  return (
    <div className="groupchat-container">
      <ToastContainer />
      <div className="groupchat-header">
        <div className="groupchat-info">
          <div className="groupchat-name">{roomName}</div>
          <div className="groupchat-members">{members.length} members</div>
        </div>
        <button className="groupchat-tools-btn" onClick={handleModeration}>
          ⋯
        </button>
      </div>

      <div className="groupchat-messages">
        {pinnedMessageId && (
          <div className="groupchat-pinned">
            📌 {messages.find(m => m.id === pinnedMessageId)?.text || 'Pinned message'}
          </div>
        )}
        {messages.length === 0 && (
          <div className="groupchat-empty">
            <div>Start the conversation!</div>
          </div>
        )}
        {messages.map((message) => (
          <div
            key={message.id}
            className={`groupchat-message ${message.senderId === (getCurrentUid() || 'me') ? 'sent' : 'received'}`}
          >
            {message.senderId !== (getCurrentUid() || 'me') && (
              <div className="message-sender">{message.senderId}</div>
            )}
            <div className="groupchat-message-bubble">
              <div className="groupchat-message-text">{message.text}</div>
              <div className="groupchat-message-time">{formatTime(message.timestamp)}</div>
            </div>
          </div>
        ))}
        <div ref={messagesEndRef} />
      </div>

      <div className="groupchat-input-container">
        <input
          type="text"
          className="groupchat-input"
          placeholder="Type a message..."
          value={inputText}
          onChange={(e) => setInputText(e.target.value)}
          onKeyPress={(e) => {
            if (e.key === 'Enter') {
              sendMessage();
            }
          }}
        />
        <button className="groupchat-send-btn" onClick={sendMessage} disabled={!inputText.trim()}>
          ➤
        </button>
      </div>

      {showToolsModal && (
        <div className="groupchat-modal-overlay" onClick={() => setShowToolsModal(false)}>
          <div className="groupchat-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>Room Tools</h3>
            <button className="groupchat-tool-btn" onClick={handlePinLastMessage}>📌 Pin last message</button>
            <button className="groupchat-tool-btn" onClick={handleClearPinnedMessage}>🧹 Clear pinned message</button>
            <button className="groupchat-tool-btn" onClick={() => openMemberAction('mute')}>🔇 Mute a member</button>
            <button className="groupchat-tool-btn" onClick={() => openMemberAction('kick')}>🚫 Kick a member</button>
            <button className="groupchat-tool-btn secondary" onClick={() => setShowToolsModal(false)}>Close</button>
          </div>
        </div>
      )}

      {showMemberModal && (
        <div className="groupchat-modal-overlay" onClick={() => {
          setShowMemberModal(false);
          setMemberAction(null);
        }}>
          <div className="groupchat-modal-content" onClick={(event) => event.stopPropagation()}>
            <h3>{memberAction === 'mute' ? 'Mute Member' : 'Kick Member'}</h3>
            <div className="groupchat-member-list">
              {members.map((member) => (
                <button
                  key={member}
                  className="groupchat-tool-btn"
                  onClick={() => handleSelectMemberAction(member)}
                >
                  {member}
                </button>
              ))}
            </div>
            <button className="groupchat-tool-btn secondary" onClick={() => {
              setShowMemberModal(false);
              setMemberAction(null);
            }}>Cancel</button>
          </div>
        </div>
      )}
    </div>
  );
}
