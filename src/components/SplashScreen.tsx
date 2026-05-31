import './SplashScreen.css';

export default function SplashScreen() {
  return (
    <div className="splash-screen" role="status" aria-live="polite">
      <div className="splash-logo-wrap">
        <div className="splash-logo-icon">💚</div>
        <h1 className="splash-logo-text">VibeUp</h1>
        <p className="splash-subtitle">Loading your vibe…</p>
      </div>
    </div>
  );
}
