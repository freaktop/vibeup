import { useState } from 'react';
import { storage } from '../utils/storage';
import { seedMockProfilesIfEmpty, upsertMyProfile } from '../firestore';
import './Onboarding.css';

interface OnboardingProps {
  onComplete: () => void;
}

export default function Onboarding({ onComplete }: OnboardingProps) {
  const enableMockSeed = import.meta.env.VITE_ENABLE_MOCK_SEED === 'true';
  const [step, setStep] = useState(1);
  const totalSteps = 3;
  const intentOptions = ['Friends', 'Events', 'Dating', 'Just Browsing'];
  const vibeOptions = ['Chill', 'Wild', 'Dom', 'Sub', 'Artistic', 'Techie'];
  const [intent, setIntent] = useState('');
  const [vibeStyle, setVibeStyle] = useState('');
  const [photoRulesAccepted, setPhotoRulesAccepted] = useState(false);
  const [allowBlurredBody, setAllowBlurredBody] = useState(true);

  const handleNext = () => {
    if (step < totalSteps) {
      setStep(step + 1);
      return;
    }

    const existingProfile = storage.getUserProfile() || {};
    const nextProfile = {
      ...existingProfile,
      intent,
      vibeStyle,
      photoRulesAccepted,
      allowBlurredBody,
    };
    storage.saveUserProfile(nextProfile);
    storage.setOnboardingComplete(true);

    upsertMyProfile(nextProfile).catch((err) => {
      console.error('Onboarding: failed to create profile', err);
    });
    if (enableMockSeed) {
      seedMockProfilesIfEmpty().catch(() => null);
    }

    onComplete();
  };

  const handleSkip = () => {
    storage.setOnboardingComplete(true);

    const existingProfile = storage.getUserProfile() || {};
    upsertMyProfile(existingProfile).catch((err) => {
      console.error('Onboarding: failed to create profile on skip', err);
    });
    if (enableMockSeed) {
      seedMockProfilesIfEmpty().catch(() => null);
    }

    onComplete();
  };

  return (
    <div className="onboarding-container">
      <div className="onboarding-progress">
        <div className="progress-bar">
          <div
            className="progress-fill"
            style={{ width: `${(step / totalSteps) * 100}%` }}
          />
        </div>
        <button className="skip-button" onClick={handleSkip}>
          Skip
        </button>
      </div>

      <div className="onboarding-content">
        {step === 1 && (
          <div className="onboarding-slide">
            <div className="onboarding-icon">🎯</div>
            <h1>Your Intent</h1>
            <p>Tell us what you’re looking for so we can match your energy.</p>
            <div className="onboarding-options">
              {intentOptions.map((option) => (
                <button
                  key={option}
                  className={`onboarding-option ${intent === option ? 'active' : ''}`}
                  onClick={() => setIntent(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 2 && (
          <div className="onboarding-slide">
            <div className="onboarding-icon">✨</div>
            <h1>Vibe Check</h1>
            <p>Pick the vibe that feels most like you.</p>
            <div className="onboarding-options">
              {vibeOptions.map((option) => (
                <button
                  key={option}
                  className={`onboarding-option ${vibeStyle === option ? 'active' : ''}`}
                  onClick={() => setVibeStyle(option)}
                >
                  {option}
                </button>
              ))}
            </div>
          </div>
        )}

        {step === 3 && (
          <div className="onboarding-slide">
            <div className="onboarding-icon">📸</div>
            <h1>Photo Rules</h1>
            <p>We keep the space safe and real.</p>
            <div className="onboarding-rules">
              <label className="rule-checkbox">
                <input
                  type="checkbox"
                  checked={photoRulesAccepted}
                  onChange={(e) => setPhotoRulesAccepted(e.target.checked)}
                />
                <span>Face photo required for your profile</span>
              </label>
              <label className="rule-checkbox">
                <input
                  type="checkbox"
                  checked={allowBlurredBody}
                  onChange={(e) => setAllowBlurredBody(e.target.checked)}
                />
                <span>Allow blurred body photos (optional)</span>
              </label>
              <div className="rule-note">You can update this later in Profile.</div>
            </div>
          </div>
        )}
      </div>

      <div className="onboarding-footer">
        <div className="onboarding-dots">
          {Array.from({ length: totalSteps }).map((_, index) => (
            <span
              key={index}
              className={`dot ${index + 1 === step ? 'active' : ''}`}
            />
          ))}
        </div>
        <button
          className="next-button"
          onClick={handleNext}
          disabled={
            (step === 1 && !intent) ||
            (step === 2 && !vibeStyle) ||
            (step === 3 && !photoRulesAccepted)
          }
        >
          {step === totalSteps ? 'Get Started' : 'Next'}
        </button>
      </div>
    </div>
  );
}
