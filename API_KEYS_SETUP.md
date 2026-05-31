# API Keys Setup - Quick Start

## ⚠️ IMPORTANT: Add Your API Keys

Create a `.env` file in the project root with your API keys:

```env
# Firebase (REQUIRED for auth and data)
VITE_FIREBASE_API_KEY=your_api_key
VITE_FIREBASE_AUTH_DOMAIN=your-project.firebaseapp.com
VITE_FIREBASE_PROJECT_ID=your-project-id
VITE_FIREBASE_STORAGE_BUCKET=your-project.firebasestorage.app
VITE_FIREBASE_MESSAGING_SENDER_ID=123456789
VITE_FIREBASE_APP_ID=1:123456789:web:abc123
VITE_FIREBASE_MEASUREMENT_ID=G-XXXXXXXXXX

# Mapbox (REQUIRED for map to work)
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here

# OneSignal (Optional - for push notifications)
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here

# RevenueCat (Optional - for in-app purchases, native builds)
VITE_REVENUECAT_API_KEY=your_revenuecat_api_key_here
VITE_REVENUECAT_ENTITLEMENT_ID=premium

# Stripe (Optional - for web premium purchases)
# Create a Payment Link in Stripe Dashboard, add URL here
VITE_STRIPE_PAYMENT_LINK_URL=https://buy.stripe.com/your_payment_link

# Owner profile ID (Optional - new users auto-follow you for mass messaging)
# Your Firebase Auth UID - add to .env so new signups follow you
VITE_OWNER_PROFILE_ID=your_firebase_auth_uid

# Legal (required for production)
VITE_TERMS_URL=https://yoursite.com/terms
VITE_PRIVACY_URL=https://yoursite.com/privacy
```

## Where to Get Keys:

### 1. Mapbox Token
- Go to: https://account.mapbox.com/access-tokens/
- Copy your **default public token** (starts with `pk.`)
- Add to `.env` as `VITE_MAPBOX_ACCESS_TOKEN`

### 3. OneSignal App ID
- Go to: https://app.onesignal.com/
- Create/select your app
- Settings > Keys & IDs > Copy "OneSignal App ID"
- Add to `.env` as `VITE_ONESIGNAL_APP_ID`

### 4. RevenueCat API Key
- Go to: https://app.revenuecat.com/
- Project Settings > API Keys > Copy "Public API Key"
- Add to `.env` as `VITE_REVENUECAT_API_KEY`

## After Adding Keys:

1. **Rebuild:**
   ```bash
   npm run build
   ```

2. **Sync with Android:**
   ```bash
   npm run android:sync
   ```

3. **Install on device:**
   ```bash
   cd android
   ./gradlew installDebug
   ```

## What Works Without Keys:

✅ All features work offline
✅ Grid map view (fallback)
✅ All other app features

## What Needs Keys:

❌ **Firebase** – Auth and data (required for sign-in/sign-up)
❌ Real Mapbox map (shows error message without token)
❌ Push notifications (won't initialize without OneSignal)
❌ In-app purchases (won't work without RevenueCat)

---

## Production Deployment

1. **Build:** `npm run build`
2. **Deploy Firebase rules and Storage:** `npx firebase deploy --only firestore:rules,storage`
3. **Add authorized domain** in Firebase Console: Authentication > Settings > Authorized domains
4. **Android release:** `npm run android:sync` then `cd android && ./gradlew bundleRelease` (requires keystore in `android/keystore.properties`)
5. **Web hosting:** Deploy `dist/` to any static host (Vercel, Netlify, Firebase Hosting, etc.)
