import React, { useState, useEffect } from 'react';
import { signOut } from 'firebase/auth';
import { storage } from '../utils/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from '../firebase';
import { useAuth } from '../contexts/AuthContext';
import { createReport, listenBlockedIds, listenProfiles, listenReports, removeSwipe } from '../firestore';
import { legalConfig } from '../config/legal';
import { useToast } from '../hooks/useToast';
import './Settings.css';

export default function Settings() {
  const { showToast, ToastContainer } = useToast();
  const { signOutDemo } = useAuth();
  const [notifications, setNotifications] = useState({
    messages: true,
    matches: true,
    likes: true,
    events: true,
    comments: true,
  });
  const [showLogoutConfirm, setShowLogoutConfirm] = useState(false);
  const [showDeactivateConfirm, setShowDeactivateConfirm] = useState(false);
  const [profileNameById, setProfileNameById] = useState<Record<string, string>>({});
  const [showBlockedUsersModal, setShowBlockedUsersModal] = useState(false);
  const [showReportProblemModal, setShowReportProblemModal] = useState(false);
  const [reportProblemText, setReportProblemText] = useState('');
  const [reportCount, setReportCount] = useState(0);
  const [blockedIds, setBlockedIds] = useState<string[]>([]);

  useEffect(() => {
    const profile = storage.getUserProfile();
    if (profile?.notificationPreferences) {
      setNotifications(profile.notificationPreferences);
    }

    let unsubProfiles: (() => void) | null = null;
    let unsubBlocked: (() => void) | null = null;
    const unsubAuth = onAuthStateChanged(auth, (user) => {
      unsubProfiles?.();
      unsubBlocked?.();

      if (!user) {
        setProfileNameById({});
        setBlockedIds([]);
        return;
      }

      unsubBlocked = listenBlockedIds(user.uid, setBlockedIds);
      unsubProfiles = listenProfiles((profiles) => {
        const next: Record<string, string> = {};
        for (const currentProfile of profiles) {
          next[currentProfile.id] = `${currentProfile.name}, ${currentProfile.age}`;
        }
        setProfileNameById(next);
      });
    });

    const unsubReports = listenReports((reports) => {
      setReportCount(reports.filter((report) => report.status === 'open').length);
    });

    return () => {
      unsubAuth();
      unsubProfiles?.();
      unsubBlocked?.();
      unsubReports();
    };
  }, []);

  const handleNotificationToggle = (key: string) => {
    const updated = { ...notifications, [key]: !notifications[key as keyof typeof notifications] };
    setNotifications(updated);
    const profile = storage.getUserProfile();
    storage.saveUserProfile({ ...profile, notificationPreferences: updated });
  };

  const handleLogout = async () => {
    setShowLogoutConfirm(false);
    signOutDemo(); // Clear demo mode if active
    try {
      await signOut(auth);
    } catch {
      // Ignore if not signed in with Firebase
    }
    storage.logout();
    setTimeout(() => window.location.reload(), 300);
  };

  const handleDeactivate = () => {
    showToast('Account deactivated. You can reactivate within 30 days.', 'info');
    setShowDeactivateConfirm(false);
  };

  const blockedProfiles = blockedIds.map((id) => ({
    id,
    label: profileNameById[id] || `User ${id}`,
  }));

  const handleUnblockUser = async (profileId: string, label: string) => {
    const uid = auth.currentUser?.uid;
    if (!uid) return;
    try {
      await removeSwipe(uid, profileId);
      showToast(`${label} has been unblocked.`, 'success');
    } catch {
      showToast('Could not unblock. Try again.', 'error');
    }
  };

  const handleSubmitProblemReport = () => {
    const issue = reportProblemText.trim();
    if (!issue) {
      showToast('Please describe the issue before submitting.', 'info');
      return;
    }

    createReport({
      type: 'bug',
      details: issue,
    })
      .then(() => {
        setReportProblemText('');
        setShowReportProblemModal(false);
        showToast('Issue reported. Thanks for your feedback!', 'success');
      })
      .catch(() => {
        showToast('Unable to submit report right now.', 'error');
      });
  };

  return (
    <div className="settings-container">
      <ToastContainer />
      <div className="settings-section">
        <h2 className="settings-section-title">Notifications</h2>
        <div className="settings-item">
          <div className="settings-item-content">
            <span className="settings-item-label">Messages</span>
            <span className="settings-item-desc">New messages and chat notifications</span>
          </div>
          <button
            className={`toggle-switch ${notifications.messages ? 'active' : ''}`}
            onClick={() => handleNotificationToggle('messages')}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <span className="settings-item-label">Matches</span>
            <span className="settings-item-desc">When someone likes you back</span>
          </div>
          <button
            className={`toggle-switch ${notifications.matches ? 'active' : ''}`}
            onClick={() => handleNotificationToggle('matches')}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <span className="settings-item-label">Likes</span>
            <span className="settings-item-desc">When someone likes your profile</span>
          </div>
          <button
            className={`toggle-switch ${notifications.likes ? 'active' : ''}`}
            onClick={() => handleNotificationToggle('likes')}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <span className="settings-item-label">Events</span>
            <span className="settings-item-desc">Event invites and RSVPs</span>
          </div>
          <button
            className={`toggle-switch ${notifications.events ? 'active' : ''}`}
            onClick={() => handleNotificationToggle('events')}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
        <div className="settings-item">
          <div className="settings-item-content">
            <span className="settings-item-label">Comments</span>
            <span className="settings-item-desc">Comments on your posts</span>
          </div>
          <button
            className={`toggle-switch ${notifications.comments ? 'active' : ''}`}
            onClick={() => handleNotificationToggle('comments')}
          >
            <div className="toggle-slider"></div>
          </button>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Privacy & Safety</h2>
        <button className="settings-button" onClick={() => {
          // Navigate to Profile tab where Privacy & Safety toggles are
          window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'profile' } }));
          showToast('Opening Privacy Settings in Profile tab...', 'info');
          // Scroll to privacy section (in real app would use navigation)
          setTimeout(() => {
            const privacySection = document.querySelector('.profile-toggle-section');
            if (privacySection) {
              privacySection.scrollIntoView({ behavior: 'smooth', block: 'start' });
            }
          }, 300);
        }}>
          <span>🔒</span>
          <span>Privacy Settings</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          if (blockedIds.length === 0) {
            showToast('No blocked users yet. Use a profile menu to block someone.', 'info');
          } else {
            setShowBlockedUsersModal(true);
          }
        }}>
          <span>🚫</span>
          <span>Blocked Users</span>
          <span>{blockedIds.length > 0 ? blockedIds.length : ''}</span>
        </button>
        <button className="settings-button" onClick={() => {
          showToast('Use profile menu (⋮) → Report. Reports are reviewed within 24 hours.', 'info');
        }}>
          <span>⚠️</span>
          <span>Reported Content</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          window.open(legalConfig.privacyUrl, '_blank');
        }}>
          <span>📄</span>
          <span>Privacy Policy</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          window.open('https://www.termsfeed.com/blog/community-guidelines-template/', '_blank');
        }}>
          <span>📋</span>
          <span>Community Guidelines</span>
          <span>→</span>
        </button>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Support & Help</h2>
        <button className="settings-button" onClick={() => {
          window.dispatchEvent(new CustomEvent('switchTab', { detail: { tab: 'profile' } }));
          showToast('Premium features available in Profile → Upgrade. Get unlimited likes, see who likes you, and more!', 'info');
        }}>
          <span>💎</span>
          <span>Premium Features</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          const email = 'support@vibeup.app';
          const subject = 'Support Request';
          window.location.href = `mailto:${email}?subject=${encodeURIComponent(subject)}`;
        }}>
          <span>📧</span>
          <span>Contact Support</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          showToast('✓ How to stay safe:\n1. Block users you\'re uncomfortable with\n2. Report inappropriate behavior\n3. Check Privacy Settings for visibility controls\n4. Never share financial info in chat', 'info');
        }}>
          <span>🛡️</span>
          <span>Safety Tips</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          setShowReportProblemModal(true);
        }}>
          <span>🐛</span>
          <span>Report a Problem</span>
          <span>→</span>
        </button>
        <button className="settings-button" onClick={() => {
          showToast('FAQ: Check our community guidelines and privacy policy. Most questions are answered there!', 'info');
          window.open('https://www.termsfeed.com/blog/community-guidelines-template/', '_blank');
        }}>
          <span>❓</span>
          <span>FAQ & Help</span>
          <span>→</span>
        </button>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Admin</h2>
        <button className="settings-button" onClick={() => {
          window.dispatchEvent(new CustomEvent('showAdmin'));
        }}>
          <span>🛠️</span>
          <span>Admin Panel</span>
          <span>{reportCount > 0 ? reportCount : '→'}</span>
        </button>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">About</h2>
        <div className="settings-info-item" onClick={() => showToast('App Version 1.0.0 (Build 2024)', 'info')}>
          <span>App Version</span>
          <span>1.0.0</span>
        </div>
        <div className="settings-info-item" onClick={() => {
          window.open(legalConfig.termsUrl, '_blank');
        }}>
          <span>Terms of Service</span>
          <span>→</span>
        </div>
        <div className="settings-info-item" onClick={() => {
          showToast('Open-source licenses are available on request via support.', 'info');
        }}>
          <span>Open Source Licenses</span>
          <span>→</span>
        </div>
      </div>

      <div className="settings-section">
        <h2 className="settings-section-title">Account</h2>
        <button 
          className="settings-button settings-button-danger" 
          onClick={() => setShowLogoutConfirm(true)}
        >
          <span>🚪</span>
          <span>Log Out</span>
          <span>→</span>
        </button>
        <button 
          className="settings-button settings-button-danger" 
          onClick={() => setShowDeactivateConfirm(true)}
        >
          <span>🗑️</span>
          <span>Deactivate Account</span>
          <span>→</span>
        </button>
      </div>

      {showLogoutConfirm && (
        <div className="modal-overlay" onClick={() => setShowLogoutConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Log Out</h3>
            <p>Are you sure you want to log out?</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowLogoutConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn danger" onClick={handleLogout}>
                Log Out
              </button>
            </div>
          </div>
        </div>
      )}

      {showDeactivateConfirm && (
        <div className="modal-overlay" onClick={() => setShowDeactivateConfirm(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Deactivate Account</h3>
            <p>Your account will be deactivated for 30 days. After that, it will be permanently deleted. You can reactivate anytime before deletion.</p>
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowDeactivateConfirm(false)}>
                Cancel
              </button>
              <button className="modal-btn danger" onClick={handleDeactivate}>
                Deactivate
              </button>
            </div>
          </div>
        </div>
      )}

      {showBlockedUsersModal && (
        <div className="modal-overlay" onClick={() => setShowBlockedUsersModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Blocked Users</h3>
            {blockedProfiles.length === 0 ? (
              <p>No blocked users.</p>
            ) : (
              <div className="settings-blocked-list">
                {blockedProfiles.map((blockedProfile) => (
                  <div key={blockedProfile.id} className="settings-blocked-item">
                    <span>{blockedProfile.label}</span>
                    <button
                      className="modal-btn cancel settings-unblock-btn"
                      onClick={() => handleUnblockUser(blockedProfile.id, blockedProfile.label)}
                    >
                      Unblock
                    </button>
                  </div>
                ))}
              </div>
            )}
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowBlockedUsersModal(false)}>
                Close
              </button>
            </div>
          </div>
        </div>
      )}

      {showReportProblemModal && (
        <div className="modal-overlay" onClick={() => setShowReportProblemModal(false)}>
          <div className="modal-content" onClick={(e) => e.stopPropagation()}>
            <h3>Report a Problem</h3>
            <textarea
              className="settings-report-input"
              value={reportProblemText}
              onChange={(event) => setReportProblemText(event.target.value)}
              placeholder="Describe the problem you ran into..."
              rows={5}
            />
            <div className="modal-actions">
              <button className="modal-btn cancel" onClick={() => setShowReportProblemModal(false)}>
                Cancel
              </button>
              <button className="modal-btn danger" onClick={handleSubmitProblemReport}>
                Submit
              </button>
            </div>
          </div>
        </div>
      )}
    </div>
  );
}
