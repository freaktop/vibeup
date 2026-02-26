import React from 'react';
import './PremiumModal.css';

interface PremiumModalProps {
  isOpen: boolean;
  onClose: () => void;
  onPurchase: (feature: string) => void;
  feature?: string;
}

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

  const currentFeature = feature ? features[feature as keyof typeof features] : features.premium;

  return (
    <div className="premium-overlay" onClick={onClose}>
      <div className="premium-modal" onClick={(e) => e.stopPropagation()}>
        <button className="premium-close" onClick={onClose}>✕</button>
        
        <div className="premium-header">
          <div className="premium-icon">{currentFeature.icon}</div>
          <h2>{currentFeature.title}</h2>
          <p>{currentFeature.description}</p>
        </div>

        <div className="premium-features">
          {feature === 'premium' || !feature ? (
            <>
              <div className="premium-feature-item">
                <span>✅</span> Unlimited Likes
              </div>
              <div className="premium-feature-item">
                <span>✅</span> 5 Super Likes per day
              </div>
              <div className="premium-feature-item">
                <span>✅</span> Unlimited Undo
              </div>
              <div className="premium-feature-item">
                <span>✅</span> See who liked you
              </div>
              <div className="premium-feature-item">
                <span>✅</span> No ads
              </div>
            </>
          ) : feature === 'vibenow' ? (
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

        <div className="premium-pricing">
          <div className="premium-price">{currentFeature.price}</div>
          {feature === 'premium' && (
            <div className="premium-savings">Save 50% vs buying individually!</div>
          )}
        </div>

        <button
          className="premium-purchase-btn"
          onClick={() => {
            onPurchase(feature || 'premium');
            onClose();
          }}
        >
          Purchase
        </button>

        <div className="premium-note">
          Payment will be processed securely. Cancel anytime.
        </div>
      </div>
    </div>
  );
}
