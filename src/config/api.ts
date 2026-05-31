/**
 * API Configuration
 * Add your API keys to .env file (see .env.example)
 */

export const config = {
  googleMaps: {
    apiKey: import.meta.env.VITE_GOOGLE_MAPS_API_KEY || '',
  },
  onesignal: {
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
  },
  revenuecat: {
    apiKey: import.meta.env.VITE_REVENUECAT_API_KEY || '',
    entitlementId: import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium',
  },
  stripe: {
    paymentLinkUrl: import.meta.env.VITE_STRIPE_PAYMENT_LINK_URL || '',
  },
  /** Your profile ID - new users auto-follow you so you can mass-message them */
  ownerProfileId: import.meta.env.VITE_OWNER_PROFILE_ID || '',
};

// Validate required config
if (!config.googleMaps.apiKey) {
  console.warn('⚠️ Google Maps API key not found. Add VITE_GOOGLE_MAPS_API_KEY to .env file');
}
