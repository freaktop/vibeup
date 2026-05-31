import { useState, useEffect } from 'react';
import PullToRefresh from '../components/PullToRefresh';
import SafeImage from '../components/SafeImage';
import Loading from '../components/Loading';
import ErrorMessage from '../components/ErrorMessage';
import { Message } from '../types';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { getCurrentUid } from '../auth';
import { createRoom, listenMatches, listenMyRooms, listenProfiles, type Room } from '../firestore';
import type { Profile } from '../types';
import { useToast } from '../hooks/useToast';
import './Messages.css';

interface MessagesProps {
  onOpenChat?: (profileId: string) => void;
  onOpenGroupChat?: (groupId: string) => void;
}

export default function Messages({ onOpenChat, onOpenGroupChat }: MessagesProps) {
  const [messages, setMessages] = useState<Message[]>([]);
  const [showCreateGroup, setShowCreateGroup] = useState(false);
  const [isLoading, setIsLoading] = useState(true);
  const [error, setError] = useState<string | null>(null);
  const [allProfiles, setAllProfiles] = useState<Profile[]>([]);
  const [matchRows, setMatchRows] = useState<{ id: string; users: string[]; lastMessage: string | null; lastMessageAt: number | null }[]>([]);
  const [roomRows, setRoomRows] = useState<Room[]>([]);

  useEffect(() => {
    let unsubProfiles: (() => void) | null = null;
    let unsubMatches: (() => void) | null = null;
    let unsubRooms: (() => void) | null = null;

    // If Firebase auth is not available, use demo mode
    if (!auth) {
      console.log('[Messages] Firebase auth not configured, using demo mode');
      const uid = 'demo-user-vibeup';
      unsubProfiles = listenProfiles((p) => setAllProfiles(p));
      unsubMatches = listenMatches(uid, (ms) => {
        setMatchRows(ms);
      });
      unsubRooms = listenMyRooms(uid, (rooms) => {
        setRoomRows(rooms);
      });
      setIsLoading(false);
      return () => {
        unsubProfiles?.();
        unsubMatches?.();
        unsubRooms?.();
      };
    }

    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubMatches?.();
      unsubRooms?.();

      if (!user) {
        setMessages([]);
        setAllProfiles([]);
        setMatchRows([]);
        setRoomRows([]);
        setIsLoading(false);
        return;
      }

      unsubProfiles = listenProfiles((p) => setAllProfiles(p));
      unsubMatches = listenMatches(user.uid, (ms) => {
        setMatchRows(ms);
      });

      unsubRooms = listenMyRooms(user.uid, (rooms) => {
        setRoomRows(rooms);
      });
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubMatches?.();
      unsubRooms?.();
    };
  }, []);

  const handleRefresh = async () => {
    await new Promise(resolve => setTimeout(resolve, 1000));
    buildMessageList();
  };

  const buildMessageList = () => {
    setIsLoading(true);
    setError(null);

    try {
      const uid = getCurrentUid();
      if (!uid) {
        setMessages([]);
        setIsLoading(false);
        return;
      }

      const byId = new Map(allProfiles.map((p) => [p.id, p] as const));

      const directChats: Message[] = matchRows
        .map((m) => {
          const otherId = m.users.find((u) => u !== uid);
          if (!otherId) return null;
          const profile = byId.get(otherId);
          if (!profile) return null;
          return {
            id: m.id,
            profileId: otherId,
            profileName: profile.name ?? 'User',
            profilePhoto: profile.photo ?? '',
            lastMessage: m.lastMessage ?? 'Start the conversation!',
            timestamp: m.lastMessageAt ?? Date.now(),
            unread: 0,
          };
        })
        .filter((x): x is Message => !!x);

      const groupChats: Message[] = roomRows.map((room) => ({
        id: room.id,
        profileId: room.id,
        profileName: room.name,
        profilePhoto: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=200&h=200&fit=crop',
        lastMessage: room.lastMessage || 'Group created',
        timestamp: room.lastMessageAt || room.createdAt || Date.now(),
        unread: 0,
        isGroup: true,
        groupName: room.name,
      }));

      const all = [...directChats, ...groupChats];
      all.sort((a, b) => b.timestamp - a.timestamp);
      setMessages(all);
    } catch (e) {
      console.error('Error loading messages:', e);
      setError('Failed to load messages. Please try again.');
      setMessages([]);
    } finally {
      setIsLoading(false);
    }
  };

  useEffect(() => {
    buildMessageList();
  }, [allProfiles, matchRows, roomRows]);

  const formatTime = (timestamp: number) => {
    const date = new Date(timestamp);
    const now = new Date();
    const diff = now.getTime() - date.getTime();
    const hours = Math.floor(diff / 3600000);
    
    if (hours < 1) return 'Just now';
    if (hours < 24) return `${hours}h ago`;
    const days = Math.floor(hours / 24);
    if (days < 7) return `${days}d ago`;
    return date.toLocaleDateString();
  };

  if (isLoading) {
    return <Loading message="Loading messages..." fullScreen />;
  }

  const uid = getCurrentUid();
  const profileById = new Map(allProfiles.map((p) => [p.id, p] as const));
  const directChatProfiles: Profile[] = uid
    ? matchRows
        .map((m) => m.users.find((u) => u !== uid))
        .filter((id): id is string => !!id)
        .map((id) => profileById.get(id))
        .filter((p): p is Profile => !!p)
    : [];

  return (
    <PullToRefresh onRefresh={handleRefresh}>
      <div className="messages-container">
        {error && (
          <ErrorMessage 
            message={error} 
            onDismiss={() => setError(null)} 
            retry={buildMessageList}
            type="error"
          />
        )}
      <div className="messages-header">
        <button className="create-group-btn" onClick={() => setShowCreateGroup(true)}>
          ➕ Create Group Chat
        </button>
      </div>
      
      {messages.length === 0 ? (
        <div className="messages-empty">
          <div className="empty-icon">💬</div>
          <div className="empty-title">No messages yet</div>
          <div className="empty-text">Start matching to begin conversations.</div>
          <div className="empty-text" style={{ marginTop: '16px', fontSize: '14px', color: '#999' }}>
            You can create group chats to connect with multiple people at once
          </div>
          <div className="messages-empty-actions">
            <button
              className="empty-cta"
              onClick={() => window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'discover' } }))}
            >
              🧭 Go to Discover
            </button>
            <button
              className="empty-cta secondary"
              onClick={() => window.dispatchEvent(new CustomEvent('showCommunities'))}
            >
              👥 Browse Rooms
            </button>
          </div>
        </div>
      ) : (
        <>
          {messages.map((message) => (
            <div
              key={message.id}
              className="message-item"
              onClick={() => {
                if (message.isGroup && onOpenGroupChat) {
                  onOpenGroupChat(message.profileId);
                } else if (onOpenChat) {
                  onOpenChat(message.profileId);
                }
              }}
            >
              <SafeImage src={message.profilePhoto} alt={message.profileName} className="message-avatar" />
              <div className="message-content">
                <div className="message-header">
                  <span className="message-name">
                    {message.isGroup && '👥 '}
                    {message.profileName}
                  </span>
                  <span className="message-time">{formatTime(message.timestamp)}</span>
                </div>
                <div className="message-text">{message.lastMessage}</div>
              </div>
              {message.unread > 0 && (
                <div className="message-unread">{message.unread}</div>
              )}
            </div>
          ))}
        </>
      )}
      
      {showCreateGroup && (
        <CreateGroupModal 
          onClose={() => setShowCreateGroup(false)} 
          availableMembers={directChatProfiles}
        />
      )}
      </div>
    </PullToRefresh>
  );
}

function CreateGroupModal({
  onClose,
  availableMembers,
}: {
  onClose: () => void;
  availableMembers: Profile[];
}) {
  const { showToast, ToastContainer } = useToast();
  const [groupName, setGroupName] = useState('');
  const [selectedMembers, setSelectedMembers] = useState<string[]>([]);

  const handleCreate = async () => {
    if (!groupName.trim()) {
      showToast('Please enter a group name.', 'info');
      return;
    }
    
    if (selectedMembers.length === 0 && availableMembers.length === 0) {
      showToast('Like some profiles first to add members to your group.', 'info');
      return;
    }
    
    if (selectedMembers.length === 0 && availableMembers.length > 0) {
      showToast('Please select at least one member for the group.', 'info');
      return;
    }

    const createdGroupName = groupName.trim();

    try {
      await createRoom({
        name: createdGroupName,
        description: 'Private group chat',
        tags: ['Group Chat'],
        isPublic: false,
        memberIds: selectedMembers,
      });

      setGroupName('');
      setSelectedMembers([]);
      showToast(`Group "${createdGroupName}" created successfully!`, 'success');
      onClose();
    } catch {
      showToast('Unable to create group right now.', 'error');
    }
  };

  const toggleMember = (profileId: string) => {
    if (selectedMembers.includes(profileId)) {
      setSelectedMembers(selectedMembers.filter(id => id !== profileId));
    } else {
      setSelectedMembers([...selectedMembers, profileId]);
    }
  };

  return (
    <div className="modal-overlay" onClick={onClose}>
      <div className="modal-content" onClick={(e) => e.stopPropagation()}>
        <ToastContainer />
        <h2>Create Group Chat</h2>
        <input
          type="text"
          placeholder="Group Name"
          value={groupName}
          onChange={(e) => setGroupName(e.target.value)}
          className="modal-input"
        />
        <div className="group-members-list">
          <label>Select Members:</label>
          {availableMembers.length === 0 ? (
            <div style={{ padding: '16px', textAlign: 'center', color: '#999' }}>
              Like some profiles first to add them to groups!
            </div>
          ) : (
            availableMembers.map((member) => (
              <label key={member.id} className="member-checkbox">
                <input
                  type="checkbox"
                  checked={selectedMembers.includes(member.id)}
                  onChange={() => toggleMember(member.id)}
                />
                <SafeImage src={member.photo} alt={member.name} className="member-avatar" />
                <span>{member.name}</span>
              </label>
            ))
          )}
        </div>
        <div className="modal-actions">
          <button className="modal-btn cancel" onClick={onClose}>Cancel</button>
          <button className="modal-btn primary" onClick={handleCreate}>Create</button>
        </div>
      </div>
    </div>
  );
}
