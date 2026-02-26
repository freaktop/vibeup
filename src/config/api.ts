/**
 * API Configuration
 * Add your API keys to .env file (see .env.example)
 */

export const config = {
  mapbox: {
    accessToken: import.meta.env.VITE_MAPBOX_ACCESS_TOKEN || '',
  },
  onesignal: {
    appId: import.meta.env.VITE_ONESIGNAL_APP_ID || '',
  },
  revenuecat: {
    apiKey: import.meta.env.VITE_REVENUECAT_API_KEY || '',
    entitlementId: import.meta.env.VITE_REVENUECAT_ENTITLEMENT_ID || 'premium',
  },
};

// Validate required config
if (!config.mapbox.accessToken) {
  console.warn('⚠️ Mapbox access token not found. Add VITE_MAPBOX_ACCESS_TOKEN to .env file');
}
