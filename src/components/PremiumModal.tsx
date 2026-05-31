import './PremiumModal.css';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (feature: string) => void;
  feature?: string;
}

const PAYWALL_FEATURES = [
  'Unlimited Likes',
  '5 Super Likes per day',
  'Unlimited Undo',
  'See who liked you (VibeUp tab)',
  'Who Viewed You',
  'Exclusive Communities',
  'Hide profile from Discover',
  'Navigate to city',
  'No ads',
];

const PRICING_PLANS = [
  { name: 'Premium Monthly', price: '$9.99', period: '/month', popular: false },
  { name: 'Premium Annual', price: '$59.99', period: '/year', popular: true, savings: 'Save 50%' },
];

const ADD_ON_PRICES = [
  { name: 'Profile Boost', price: '$4.99', desc: '10x more views for 30 min' },
  { name: 'Super Like', price: '$0.99', desc: 'Stand out with a Super Like' },
  { name: 'Undo Swipe', price: '$0.99', desc: 'Take back your last swipe' },
  { name: 'VibeNow', price: '$2.99', desc: 'Show you\'re available right now' },
];

export default function PremiumModal({ isOpen, onClose, onPurchase, feature }: PremiumModalProps) {
  if (!isOpen) return null;

  const features = {
    boost: {
      title: 'Boost Your Profile',
      description: 'Get 10x more views for 30 minutes',
      price: '$4.99',
      icon: '🚀',
    },
    hookup: {
      title: 'Hook Up Now',
      description: 'Show you\'re available right now - get seen by profiles looking to hook up',
      price: '$2.99',
      icon: '🔥',
    },
    vibenow: {
      title: 'VibeNow™',
      description: 'Be seen while it matters.',
      price: '$2.99',
      icon: '🔥',
    },
    superlike: {
      title: 'Super Like',
      description: 'Stand out with a Super Like',
      price: '$0.99',
      icon: '⭐',
    },
    undo: {
      title: 'Undo Last Swipe',
      description: 'Take back your last swipe',
      price: '$0.99',
      icon: '↩️',
    },
    premium: {
      title: 'VibeUp Premium',
      description: 'Unlimited likes, 5 Super Likes per day, unlimited Undo, and more!',
      price: '$9.99/month',
      icon: '👑',
    },
  };

  const showFullPricing = feature === 'premium' || !feature;
  const currentFeature = feature ? features[feature as keyof typeof features] : features.premium;

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-modal premium-modal-scroll" onClick={(e) => e.stopPropagation()}>
        <button className="premium-close" onClick={onClose}>✕</button>

        <div className="premium-header">
          <div className="premium-icon">{currentFeature.icon}</div>
          <h2>{currentFeature.title}</h2>
          <p>{currentFeature.description}</p>
        </div>

        {showFullPricing ? (
          <>
            <div className="premium-paywall-section">
              <h3 className="premium-section-title">What&apos;s included</h3>
              <ul className="premium-paywall-list">
                {PAYWALL_FEATURES.map((f) => (
                  <li key={f}><span>✅</span> {f}</li>
                ))}
              </ul>
            </div>

            <div className="premium-pricing-section">
              <h3 className="premium-section-title">Plans</h3>
              <div className="premium-plans">
                {PRICING_PLANS.map((plan) => (
                  <div key={plan.name} className={`premium-plan-card ${plan.popular ? 'popular' : ''}`}>
                    {plan.popular && <span className="plan-badge">Best value</span>}
                    <div className="plan-name">{plan.name}</div>
                    <div className="plan-price">{plan.price}<span className="plan-period">{plan.period}</span></div>
                    {plan.savings && <div className="plan-savings">{plan.savings}</div>}
                  </div>
                ))}
              </div>
              <div className="premium-addons">
                <h4 className="premium-addons-title">Add-ons</h4>
                {ADD_ON_PRICES.map((addon) => (
                  <div key={addon.name} className="premium-addon-row">
                    <div>
                      <strong>{addon.name}</strong>
                      <div className="addon-desc">{addon.desc}</div>
                    </div>
                    <span className="addon-price">{addon.price}</span>
                  </div>
                ))}
              </div>
            </div>
          </>
        ) : (
          <div className="premium-features">
            {feature === 'vibenow' ? (
              <>
                <div className="premium-feature-item">
                  <span>✅</span> {currentFeature.description}
                </div>
                <div className="premium-feature-item" style={{ fontSize: '13px', color: '#999', marginTop: '8px' }}>
                  Get priority visibility in Right Now for a limited time.
                </div>
              </>
            ) : (
              <div className="premium-feature-item">
                <span>✅</span> {currentFeature.description}
              </div>
            )}
          </div>
        )}

        <div className="premium-pricing">
          <div className="premium-price">{currentFeature.price}</div>
          {showFullPricing && (
            <div className="premium-savings">Secure checkout at vibeup.gay</div>
          )}
        </div>

        <button
          className="premium-purchase-btn"
          onClick={() => {
            onPurchase(feature || 'premium');
            onClose();
          }}
        >
          Get Premium
        </button>

        <div className="premium-note">
          Payment processed securely. Cancel anytime. vibeup.gay
        </div>
      </div>
    </div>
  );
}
