import React, { lazy, Suspense, useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import { storage } from './utils/storage';
import { onAuthStateChanged } from 'firebase/auth';
import { auth } from './firebase';
import { listenNotifications } from './firestore';
import './App.css';

const Discover = lazy(() => import('./screens/Discover'));
const VibeUp = lazy(() => import('./screens/VibeUp'));
const Messages = lazy(() => import('./screens/Messages'));
const Map = lazy(() => import('./screens/Map'));
const Profile = lazy(() => import('./screens/Profile'));
const WallFeed = lazy(() => import('./screens/WallFeed'));
const RightNow = lazy(() => import('./screens/RightNow'));
const Events = lazy(() => import('./screens/Events'));
const Notifications = lazy(() => import('./screens/Notifications'));
const Settings = lazy(() => import('./screens/Settings'));
const AdminPanel = lazy(() => import('./screens/AdminPanel'));
const WhoViewedYou = lazy(() => import('./screens/WhoViewedYou'));
const Communities = lazy(() => import('./screens/Communities'));
const Chat = lazy(() => import('./screens/Chat'));
const GroupChat = lazy(() => import('./screens/GroupChat'));
const Login = lazy(() => import('./screens/Login'));
const SignUp = lazy(() => import('./screens/SignUp'));
const Onboarding = lazy(() => import('./screens/Onboarding'));

type Tab = 'discover' | 'vibeup' | 'messages' | 'map' | 'profile' | 'wallfeed' | 'rightnow' | 'events' | 'notifications' | 'settings' | 'whoviewed' | 'communities';
type View = 'main' | 'chat' | 'onboarding' | 'settings' | 'whoviewed' | 'communities' | 'login' | 'signup' | 'admin';

function App() {
  const [activeTab, setActiveTab] = useState<Tab>('discover');
  const [view, setView] = useState<View>('onboarding');
  const [chatProfileId, setChatProfileId] = useState<string | null>(null);
  const [groupChatId, setGroupChatId] = useState<string | null>(null);
  const [authResolved, setAuthResolved] = useState(false);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
    }, 900);

    const unsub = onAuthStateChanged(auth, (user) => {
      if (user) {
        if (storage.isOnboardingComplete()) {
          setView('main');
        } else {
          setView('onboarding');
        }
      } else {
        setView('login');
      }

      setAuthResolved(true);
    });

    // Listen for custom events
    const handleShowSettings = () => setView('settings');
    const handleShowAdmin = () => setView('admin');
    const handleShowWhoViewed = () => setView('whoviewed');
    const handleShowCommunities = () => setView('communities');
    const handleOpenChat = (event: any) => {
      const profileId = event.detail?.profileId;
      if (profileId) {
        openChat(profileId);
        setActiveTab('messages');
      }
    };
    const handleOpenGroupChat = (event: any) => {
      const groupId = event.detail?.groupId;
      if (groupId) {
        openGroupChat(groupId);
        setActiveTab('messages');
      }
    };
    const handleSwitchTab = (event: any) => {
      const tab = event.detail?.tab;
      if (tab) {
        setActiveTab(tab as Tab);
      }
    };
    const handleRightNowToggle = (event: any) => {
      const { isActive } = event.detail;
      if (isActive) {
        setActiveTab('rightnow'); // Switch to Right Now tab
      }
    };

    window.addEventListener('showSettings', handleShowSettings);
    window.addEventListener('showAdmin', handleShowAdmin);
    window.addEventListener('showWhoViewed', handleShowWhoViewed);
    window.addEventListener('showCommunities', handleShowCommunities);
    window.addEventListener('openChat', handleOpenChat as EventListener);
    window.addEventListener('openGroupChat', handleOpenGroupChat as EventListener);
    window.addEventListener('switchTab', handleSwitchTab as EventListener);
    window.addEventListener('rightNowToggle', handleRightNowToggle as EventListener);

    return () => {
      clearTimeout(splashTimer);
      unsub();
      window.removeEventListener('showSettings', handleShowSettings);
      window.removeEventListener('showAdmin', handleShowAdmin);
      window.removeEventListener('showWhoViewed', handleShowWhoViewed);
      window.removeEventListener('showCommunities', handleShowCommunities);
      window.removeEventListener('openChat', handleOpenChat as EventListener);
      window.removeEventListener('openGroupChat', handleOpenGroupChat as EventListener);
      window.removeEventListener('switchTab', handleSwitchTab as EventListener);
      window.removeEventListener('rightNowToggle', handleRightNowToggle as EventListener);
    };
  }, []);

  useEffect(() => {
    if (!authResolved) return;

    const uid = auth.currentUser?.uid;
    if (!uid) {
      setUnreadNotifications(0);
      return;
    }

    const unsubscribe = listenNotifications(uid, (rows) => {
      setUnreadNotifications(rows.filter((notification) => !notification.read).length);
    });

    return () => unsubscribe();
  }, [authResolved]);

  const openChat = (profileId: string) => {
    setChatProfileId(profileId);
    setGroupChatId(null);
    setView('chat');
  };

  const openGroupChat = (groupId: string) => {
    setGroupChatId(groupId);
    setChatProfileId(null);
    setView('chat');
  };

  const closeChat = () => {
    setView('main');
    setChatProfileId(null);
    setGroupChatId(null);
  };

  const completeOnboarding = () => {
    setView('main');
  };

  const handleLogin = () => {
    if (!storage.isOnboardingComplete()) {
      setView('onboarding');
    } else {
      setView('main');
    }
  };

  const handleSignup = () => {
    setView('onboarding');
  };

  if (!authResolved || !minSplashDone) {
    return <SplashScreen />;
  }

  if (view === 'login') {
    return (
      <Suspense fallback={<SplashScreen />}>
        <Login
          onLogin={handleLogin}
          onSwitchToSignup={() => setView('signup')}
        />
      </Suspense>
    );
  }

  if (view === 'signup') {
    return (
      <Suspense fallback={<SplashScreen />}>
        <SignUp
          onSignup={handleSignup}
          onSwitchToLogin={() => setView('login')}
        />
      </Suspense>
    );
  }

  if (view === 'onboarding') {
    return (
      <Suspense fallback={<SplashScreen />}>
        <Onboarding onComplete={completeOnboarding} />
      </Suspense>
    );
  }

  if (view === 'settings') {
    return (
      <div className="app">
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1 className="header-title">Settings</h1>
        </div>
        <div className="content">
          <Suspense fallback={<SplashScreen />}>
            <Settings />
          </Suspense>
        </div>
      </div>
    );
  }

  if (view === 'whoviewed') {
    return (
      <div className="app">
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1 className="header-title">Who Viewed You</h1>
        </div>
        <div className="content">
          <Suspense fallback={<SplashScreen />}>
            <WhoViewedYou />
          </Suspense>
        </div>
      </div>
    );
  }

  if (view === 'admin') {
    return (
      <div className="app">
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1 className="header-title">Admin Panel</h1>
        </div>
        <div className="content">
          <Suspense fallback={<SplashScreen />}>
            <AdminPanel />
          </Suspense>
        </div>
      </div>
    );
  }

  if (view === 'communities') {
    return (
      <div className="app">
        <div className="header">
          <button className="back-button" onClick={() => setView('main')}>←</button>
          <h1 className="header-title">Communities</h1>
        </div>
        <div className="content">
          <Suspense fallback={<SplashScreen />}>
            <Communities />
          </Suspense>
        </div>
      </div>
    );
  }

  if (view === 'chat') {
    return (
      <div className="app">
        <div className="header">
          <button className="back-button" onClick={closeChat}>←</button>
          <h1 className="header-title">Chat</h1>
        </div>
        <div className="content">
          <Suspense fallback={<SplashScreen />}>
            {groupChatId ? (
              <GroupChat 
                groupId={groupChatId} 
                groupName="Group Chat"
                groupMembers={[]}
              />
            ) : chatProfileId ? (
              <Chat profileId={chatProfileId} />
            ) : null}
          </Suspense>
        </div>
        <div className="tab-bar">
          <button className="tab" onClick={() => { setView('main'); setActiveTab('messages'); }}>
            <span className="tab-icon">💬</span>
            <span className="tab-label">Messages</span>
          </button>
        </div>
      </div>
    );
  }

  return (
    <ErrorBoundary>
      <div className="app">
      <div className="header">
        <h1 className="header-title">
          {activeTab === 'discover' && 'Discover'}
          {activeTab === 'vibeup' && 'VibeUp'}
          {activeTab === 'messages' && 'Messages'}
          {activeTab === 'map' && 'Map'}
          {activeTab === 'profile' && 'My Profile'}
          {activeTab === 'wallfeed' && 'Wall Feed'}
          {activeTab === 'rightnow' && 'Right Now'}
          {activeTab === 'events' && 'Vibes'}
          {activeTab === 'notifications' && 'Notifications'}
        </h1>
        {activeTab !== 'notifications' && (
          <button
            className="notification-bell"
            onClick={() => setActiveTab('notifications')}
          >
            🔔
            {unreadNotifications > 0 && (
              <span className="notification-badge">{unreadNotifications}</span>
            )}
          </button>
        )}
      </div>

      <div className="content">
        <Suspense fallback={<SplashScreen />}>
          {activeTab === 'discover' && <Discover />}
          {activeTab === 'vibeup' && <VibeUp />}
          {activeTab === 'messages' && <Messages onOpenChat={openChat} onOpenGroupChat={openGroupChat} />}
          {activeTab === 'map' && <Map />}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'wallfeed' && <WallFeed />}
          {activeTab === 'rightnow' && <RightNow />}
          {activeTab === 'events' && <Events />}
          {activeTab === 'notifications' && <Notifications />}
        </Suspense>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'discover' ? 'active' : ''}`}
          onClick={() => setActiveTab('discover')}
        >
          <span className="tab-icon">🧭</span>
          <span className="tab-label">Discover</span>
        </button>
        <button
          className={`tab ${activeTab === 'vibeup' ? 'active' : ''}`}
          onClick={() => setActiveTab('vibeup')}
        >
          <span className="tab-icon">💚</span>
          <span className="tab-label">VibeUp</span>
        </button>
        <button
          className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Messages</span>
        </button>
        <button
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">🗺️</span>
          <span className="tab-label">Map</span>
        </button>
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">Profile</span>
        </button>
        <button
          className={`tab ${activeTab === 'wallfeed' ? 'active' : ''}`}
          onClick={() => setActiveTab('wallfeed')}
        >
          <span className="tab-icon">📰</span>
          <span className="tab-label">Wall</span>
        </button>
        <button
          className={`tab ${activeTab === 'rightnow' ? 'active' : ''}`}
          onClick={() => setActiveTab('rightnow')}
        >
          <span className="tab-icon">🔥</span>
          <span className="tab-label">Right Now</span>
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <span className="tab-icon">📅</span>
          <span className="tab-label">Vibes</span>
        </button>
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
