import { useEffect, useState } from 'react';
import { storage } from '../utils/storage';
import { Community } from '../types';
import { useToast } from '../hooks/useToast';
import { auth } from '../firebase';
import { createRoom, joinRoom, leaveRoom, listenRooms, type Room } from '../firestore';
import './Communities.css';

const mockCommunities: Community[] = [
  {
    id: '1',
    name: 'Pride & Joy',
    description: 'A safe space for LGBTQ+ individuals to connect and share',
    photo: 'https://images.unsplash.com/photo-1514525253161-7a46d19cd819?w=400&h=300&fit=crop',
    memberCount: 1250,
    isExclusive: false,
    tags: ['LGBTQ+', 'Community', 'Support'],
    nsfw: false,
  },
  {
    id: '2',
    name: 'Kink & Fetish',
    description: 'Open discussion about kinks, fetishes, and BDSM',
    photo: 'https://images.unsplash.com/photo-1505373877841-8d25f7d46678?w=400&h=300&fit=crop',
    memberCount: 850,
    isExclusive: true,
    tags: ['Kink', 'BDSM', 'Fetish'],
    nsfw: true,
  },
  {
    id: '3',
    name: 'Bear Community',
    description: 'For bears, cubs, and admirers',
    photo: 'https://images.unsplash.com/photo-1478147427282-58a87a120781?w=400&h=300&fit=crop',
    memberCount: 2100,
    isExclusive: false,
    tags: ['Bears', 'Community'],
    nsfw: false,
  },
  {
    id: '4',
    name: 'Leather & Denim',
    description: 'Exclusive community for leather and denim enthusiasts',
    photo: 'https://images.unsplash.com/photo-1566073771259-6a8506099945?w=400&h=300&fit=crop',
    memberCount: 450,
    isExclusive: true,
    tags: ['Leather', 'Denim', 'Exclusive'],
    nsfw: true,
  },
];

export default function Communities() {
  const { showToast, ToastContainer } = useToast();
  const [filter, setFilter] = useState<'all' | 'joined' | 'exclusive'>('all');
  const [joinedCommunities, setJoinedCommunities] = useState<string[]>(storage.getJoinedCommunities());
  const [rooms, setRooms] = useState<Room[]>([]);
  const [showCreateRoom, setShowCreateRoom] = useState(false);
  const [showInviteCodeModal, setShowInviteCodeModal] = useState(false);
  const [pendingRoom, setPendingRoom] = useState<Room | null>(null);
  const [inviteCodeInput, setInviteCodeInput] = useState('');
  const [newRoom, setNewRoom] = useState({ name: '', description: '', tags: '', inviteCode: '' });
  const premiumFeatures = storage.getPremiumFeatures();

  useEffect(() => {
    const unsubscribe = listenRooms((nextRooms) => {
      setRooms(nextRooms);
    });

    return () => unsubscribe();
  }, []);

  const currentUid = auth.currentUser?.uid || null;

  const handleJoinCommunity = (communityId: string) => {
    const community = mockCommunities.find(c => c.id === communityId);
    if (community?.isExclusive && !premiumFeatures.hasPremium) {
      showToast('This is an exclusive community. Upgrade to Premium to join.', 'info');
      return;
    }

    const updated = joinedCommunities.includes(communityId)
      ? joinedCommunities.filter(id => id !== communityId)
      : [...joinedCommunities, communityId];

    setJoinedCommunities(updated);
    storage.saveJoinedCommunities(updated);
    showToast(joinedCommunities.includes(communityId) ? 'Left community.' : 'Joined community successfully.', 'success');
  };

  const handleJoinRoom = (room: Room) => {
    if (!currentUid) {
      showToast('Please sign in first.', 'error');
      return;
    }

    const alreadyJoined = room.members.includes(currentUid);

    if (!room.isPublic && !alreadyJoined) {
      setPendingRoom(room);
      setInviteCodeInput('');
      setShowInviteCodeModal(true);
      return;
    }

    const action = alreadyJoined ? leaveRoom(room.id, currentUid) : joinRoom(room.id, currentUid);
    action
      .then(() => showToast(alreadyJoined ? 'Left room.' : 'Joined room successfully.', 'success'))
      .catch(() => showToast('Unable to update room membership right now.', 'error'));
  };

  const handleSubmitInviteCode = () => {
    if (!pendingRoom || !currentUid) {
      setShowInviteCodeModal(false);
      return;
    }

    if (inviteCodeInput.trim() !== pendingRoom.inviteCode) {
      showToast('Invalid invite code.', 'error');
      return;
    }

    joinRoom(pendingRoom.id, currentUid)
      .then(() => {
        showToast('Joined room successfully.', 'success');
        setShowInviteCodeModal(false);
        setPendingRoom(null);
        setInviteCodeInput('');
      })
      .catch(() => showToast('Unable to join room right now.', 'error'));
  };

  const handleOpenRoom = (roomId: string) => {
    window.dispatchEvent(new CustomEvent('openGroupChat', { detail: { groupId: roomId } }));
    window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'messages' } }));
  };

  const handleCreateRoom = async () => {
    if (!newRoom.name.trim() || !newRoom.description.trim()) {
      showToast('Please add a room name and description.', 'info');
      return;
    }

    if (!currentUid) {
      showToast('Please sign in first.', 'error');
      return;
    }

    const inviteCode = newRoom.inviteCode.trim() || undefined;
    const isPublic = !inviteCode;

    try {
      await createRoom({
        name: newRoom.name.trim(),
        description: newRoom.description.trim(),
        tags: newRoom.tags.split(',').map(tag => tag.trim()).filter(Boolean),
        isPublic,
        inviteCode,
        memberIds: [currentUid],
      });

      setNewRoom({ name: '', description: '', tags: '', inviteCode: '' });
      setShowCreateRoom(false);
      showToast('Room created successfully.', 'success');
    } catch {
      showToast('Unable to create room right now.', 'error');
    }
  };

  const filteredCommunities = mockCommunities.filter(community => {
    if (filter === 'joined') return joinedCommunities.includes(community.id);
    if (filter === 'exclusive') return community.isExclusive;
    return true;
  });

  return (
    <div className="communities-container">
      <ToastContainer />
      <div className="communities-header">
        <h2>Communities</h2>
        <div className="communities-filters">
          <button className={`filter-btn ${filter === 'all' ? 'active' : ''}`} onClick={() => setFilter('all')}>
            All
          </button>
          <button className={`filter-btn ${filter === 'joined' ? 'active' : ''}`} onClick={() => setFilter('joined')}>
            Joined
          </button>
          <button className={`filter-btn ${filter === 'exclusive' ? 'active' : ''}`} onClick={() => setFilter('exclusive')}>
            Exclusive
          </button>
        </div>
      </div>

      <div className="communities-list">
        {filteredCommunities.map((community) => (
          <div key={community.id} className="community-card">
            <img src={community.photo} alt={community.name} className="community-photo" />
            <div className="community-content">
              <div className="community-header">
                <h3 className="community-name">{community.name}</h3>
                {community.isExclusive && <span className="exclusive-badge">👑 Exclusive</span>}
                {community.nsfw && <span className="nsfw-badge">🔞 NSFW</span>}
              </div>
              <p className="community-description">{community.description}</p>
              <div className="community-stats">
                <span>👥 {community.memberCount.toLocaleString()} members</span>
              </div>
              <div className="community-tags">
                {community.tags.map((tag, index) => (
                  <span key={index} className="community-tag">{tag}</span>
                ))}
              </div>
              <button
                className={`join-button ${joinedCommunities.includes(community.id) ? 'joined' : ''}`}
                onClick={() => handleJoinCommunity(community.id)}
              >
                {joinedCommunities.includes(community.id) ? '✓ Joined' : 'Join Community'}
              </button>
            </div>
          </div>
        ))}
      </div>

      <div className="communities-rooms-header">
        <h3>Rooms</h3>
        <button className="create-room-btn" onClick={() => setShowCreateRoom(true)}>
          ➕ Create Room
        </button>
      </div>

      <div className="communities-list">
        {rooms.map((room) => {
          const joined = !!currentUid && room.members.includes(currentUid);
          return (
            <div key={room.id} className="community-card">
              <div className="community-content">
                <div className="community-header">
                  <h3 className="community-name">{room.name}</h3>
                  {!room.isPublic && <span className="exclusive-badge">🔒 Invite Only</span>}
                </div>
                <p className="community-description">{room.description}</p>
                <div className="community-stats">
                  <span>👥 {room.members.length.toLocaleString()} members</span>
                </div>
                <div className="community-tags">
                  {room.tags.map((tag, index) => (
                    <span key={index} className="community-tag">{tag}</span>
                  ))}
                </div>
                {joined ? (
                  <div className="room-actions">
                    <button className="join-button joined" onClick={() => handleOpenRoom(room.id)}>
                      Open Room
                    </button>
                    <button className="join-button secondary" onClick={() => handleJoinRoom(room)}>
                      Leave
                    </button>
                  </div>
                ) : (
                  <button className="join-button" onClick={() => handleJoinRoom(room)}>
                    {room.isPublic ? 'Join Room' : 'Join with Code'}
                  </button>
                )}
              </div>
            </div>
          );
        })}
      </div>

      {showCreateRoom && (
        <div className="modal-overlay" onClick={() => setShowCreateRoom(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Create Room</h2>
            <input
              type="text"
              className="modal-input"
              placeholder="Room name"
              value={newRoom.name}
              onChange={(e) => setNewRoom({ ...newRoom, name: e.target.value })}
            />
            <textarea
              className="modal-input"
              placeholder="Room description"
              rows={3}
              value={newRoom.description}
              onChange={(e) => setNewRoom({ ...newRoom, description: e.target.value })}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Tags (comma separated)"
              value={newRoom.tags}
              onChange={(e) => setNewRoom({ ...newRoom, tags: e.target.value })}
            />
            <input
              type="text"
              className="modal-input"
              placeholder="Invite code (optional)"
              value={newRoom.inviteCode}
              onChange={(e) => setNewRoom({ ...newRoom, inviteCode: e.target.value })}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowCreateRoom(false)}>Cancel</button>
              <button className="modal-btn primary" onClick={handleCreateRoom}>Create</button>
            </div>
          </div>
        </div>
      )}

      {showInviteCodeModal && (
        <div className="modal-overlay" onClick={() => {
          setShowInviteCodeModal(false);
          setPendingRoom(null);
          setInviteCodeInput('');
        }}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h2>Join with Code</h2>
            <p className="invite-code-context">
              Enter the invite code for {pendingRoom?.name || 'this room'}.
            </p>
            <input
              type="text"
              className="modal-input"
              placeholder="Invite code"
              value={inviteCodeInput}
              onChange={(e) => setInviteCodeInput(e.target.value)}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => {
                setShowInviteCodeModal(false);
                setPendingRoom(null);
                setInviteCodeInput('');
              }}>Cancel</button>
              <button className="modal-btn primary" onClick={handleSubmitInviteCode}>Join</button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
