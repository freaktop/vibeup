import { lazy, Suspense, useEffect, useState } from 'react';
import ErrorBoundary from './components/ErrorBoundary';
import SplashScreen from './components/SplashScreen';
import { storage } from './utils/storage';
import { useAuth } from './contexts/AuthContext';
import { getCurrentUid, isDemoMode } from './auth';
import { listenNotifications, getProfile } from './firestore';
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

type Tab = 'grid' | 'vibeup' | 'map' | 'wall' | 'events' | 'outtonight' | 'messages' | 'profile' | 'notifications' | 'settings' | 'whoviewed' | 'communities';
type View = 'main' | 'chat' | 'onboarding' | 'settings' | 'whoviewed' | 'communities' | 'login' | 'signup' | 'admin';

function App() {
  const { user, authResolved } = useAuth();
  const [activeTab, setActiveTab] = useState<Tab>('grid');
  const [view, setView] = useState<View>('onboarding');
  const [chatProfileId, setChatProfileId] = useState<string | null>(null);
  const [groupChatId, setGroupChatId] = useState<string | null>(null);
  const [minSplashDone, setMinSplashDone] = useState(false);
  const [unreadNotifications, setUnreadNotifications] = useState(0);

  useEffect(() => {
    const splashTimer = setTimeout(() => {
      setMinSplashDone(true);
    }, 900);
    return () => clearTimeout(splashTimer);
  }, []);

  useEffect(() => {
    if (!authResolved) return;
    if (user) {
      // Check if user has completed onboarding via Firestore profile or local storage
      const checkOnboardingStatus = async () => {
        const uid = getCurrentUid();
        if (!uid) return;
        
        // First check local storage for fast feedback
        if (storage.isOnboardingComplete()) {
          setView('main');
          return;
        }
        
        // Then check if user has a profile in Firestore (indicates onboarding was completed)
        try {
          const profile = await getProfile(uid);
          if (profile) {
            // User has a profile, mark onboarding as complete locally
            storage.setOnboardingComplete(true);
            setView('main');
          } else {
            // No profile yet, show onboarding
            setView('onboarding');
          }
        } catch (err) {
          console.error('Error checking profile status:', err);
          // Fallback: show onboarding if we can't check
          setView('onboarding');
        }
      };
      
      checkOnboardingStatus();
    } else {
      setView('login');
    }
  }, [user, authResolved]);

  useEffect(() => {
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
      let tab = event.detail?.tab;
      if (tab === 'discover') tab = 'grid'; // alias
      if (tab) {
        setActiveTab(tab as Tab);
      }
    };
    const handleRightNowToggle = (event: any) => {
      const { isActive } = event.detail;
      if (isActive) {
        setActiveTab('outtonight');
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

    const uid = getCurrentUid();
    if (!uid || isDemoMode()) {
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
          {activeTab === 'grid' && 'Grid'}
          {activeTab === 'vibeup' && 'VibeUp'}
          {activeTab === 'map' && 'Map'}
          {activeTab === 'wall' && 'Wall'}
          {activeTab === 'events' && 'Events'}
          {activeTab === 'outtonight' && 'Out Tonight'}
          {activeTab === 'messages' && 'Messages'}
          {activeTab === 'profile' && 'Profile'}
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
          {activeTab === 'grid' && <Discover />}
          {activeTab === 'vibeup' && <VibeUp />}
          {activeTab === 'map' && <Map />}
          {activeTab === 'wall' && <WallFeed />}
          {activeTab === 'events' && <Events />}
          {activeTab === 'outtonight' && <RightNow />}
          {activeTab === 'messages' && <Messages onOpenChat={openChat} onOpenGroupChat={openGroupChat} />}
          {activeTab === 'profile' && <Profile />}
          {activeTab === 'notifications' && <Notifications />}
        </Suspense>
      </div>

      <div className="tab-bar">
        <button
          className={`tab ${activeTab === 'grid' ? 'active' : ''}`}
          onClick={() => setActiveTab('grid')}
        >
          <span className="tab-icon">▦</span>
          <span className="tab-label">Grid</span>
        </button>
        <button
          className={`tab ${activeTab === 'vibeup' ? 'active' : ''}`}
          onClick={() => setActiveTab('vibeup')}
        >
          <span className="tab-icon">❤️</span>
          <span className="tab-label">VibeUp</span>
        </button>
        <button
          className={`tab ${activeTab === 'map' ? 'active' : ''}`}
          onClick={() => setActiveTab('map')}
        >
          <span className="tab-icon">📍</span>
          <span className="tab-label">Map</span>
        </button>
        <button
          className={`tab ${activeTab === 'wall' ? 'active' : ''}`}
          onClick={() => setActiveTab('wall')}
        >
          <span className="tab-icon">📋</span>
          <span className="tab-label">Wall</span>
        </button>
        <button
          className={`tab ${activeTab === 'events' ? 'active' : ''}`}
          onClick={() => setActiveTab('events')}
        >
          <span className="tab-icon">🎪</span>
          <span className="tab-label">Events</span>
        </button>
        <button
          className={`tab ${activeTab === 'outtonight' ? 'active' : ''}`}
          onClick={() => setActiveTab('outtonight')}
        >
          <span className="tab-icon">🌙</span>
          <span className="tab-label">Out Tonight</span>
        </button>
        <button
          className={`tab ${activeTab === 'messages' ? 'active' : ''}`}
          onClick={() => setActiveTab('messages')}
        >
          <span className="tab-icon">💬</span>
          <span className="tab-label">Messages</span>
        </button>
        <button
          className={`tab ${activeTab === 'profile' ? 'active' : ''}`}
          onClick={() => setActiveTab('profile')}
        >
          <span className="tab-icon">👤</span>
          <span className="tab-label">Profile</span>
        </button>
      </div>
      </div>
    </ErrorBoundary>
  );
}

export default App;
