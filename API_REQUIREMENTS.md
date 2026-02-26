# API & Service Requirements for VibeUp

## Currently Working (Offline Mode) ✅
- All features work offline with localStorage
- Mock data for profiles, messages, events
- No external dependencies required for basic functionality

---

## Required for Production (Optional but Recommended)

### 1. **Map API** 🗺️ (HIGH PRIORITY)
**Status:** Currently using simple grid visualization (works but limited)

**Options:**
- **Google Maps JavaScript API**
  - Cost: $200 free credits/month, then pay-as-you-go
  - Setup: Need API key from Google Cloud Console
  - Best for: Full feature set, excellent documentation
  - Install: `npm install @googlemaps/js-api-loader`
  
- **Mapbox GL JS** (Recommended)
  - Cost: Free tier: 50,000 map loads/month, then $5/1000 loads
  - Setup: Need access token from Mapbox account
  - Best for: Beautiful customizable maps, better pricing
  - Install: `npm install mapbox-gl`
  
- **Leaflet** (Free & Open Source)
  - Cost: Free (uses OpenStreetMap)
  - Setup: No API key needed (uses OpenStreetMap)
  - Best for: Simple maps, no API keys, completely free
  - Install: `npm install leaflet react-leaflet`

**Implementation:**
- Replace `MapView.tsx` grid with real map
- Show profile markers at actual lat/lng coordinates
- Enable map panning, zooming, clustering
- Show user's current location

**Capacitor Plugin Needed:**
```bash
npm install @capacitor/geolocation
```

---

### 2. **Supabase** 🔐 (MEDIUM PRIORITY - for backend features)
**Status:** Not integrated (app works offline)

**What Supabase Provides:**
- **Authentication:** Email/password, OAuth (Google, Apple, etc.)
- **Database:** PostgreSQL (profiles, messages, matches)
- **Real-time:** Live chat, notifications
- **Storage:** User photos, media files
- **Push Notifications:** Via Supabase + FCM

**Why You Need It:**
- User authentication (currently localStorage only)
- Sync data across devices
- Real-time messaging
- Profile photo storage
- Match notifications
- "Who Viewed You" feature

**Setup Steps:**
1. Create Supabase project at https://supabase.com
2. Install: `npm install @supabase/supabase-js`
3. Add environment variables:
   ```env
   VITE_SUPABASE_URL=your-project-url
   VITE_SUPABASE_ANON_KEY=your-anon-key
   ```

---

### 3. **Geolocation API** 📍 (HIGH PRIORITY)
**Status:** Not implemented (using mock coordinates)

**Capacitor Plugin:**
```bash
npm install @capacitor/geolocation
npx cap sync android
```

**Android Permissions Required:**
Add to `AndroidManifest.xml`:
```xml
<uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
<uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
```

**Usage:**
- Get user's current location
- Calculate distance to profiles
- Show user on map
- Filter by distance

---

### 4. **Push Notifications** 🔔 (OPTIONAL)
**Status:** Not implemented

**Options:**
- **Firebase Cloud Messaging (FCM)**
  - Free
  - Works with Supabase
  - Requires Google Services JSON
  
- **OneSignal**
  - Free tier: 10,000 subscribers
  - Easier setup
  - Cross-platform

**Capacitor Plugin:**
```bash
npm install @capacitor/push-notifications
```

---

### 5. **Image Upload/Storage** 📸 (MEDIUM PRIORITY)
**Status:** Works locally (FileReader), but images are base64 (large)

**Options:**
- **Supabase Storage** (Recommended if using Supabase)
- **Firebase Storage**
- **AWS S3**
- **Cloudinary**

**Benefits:**
- Smaller app size
- Faster loading
- Better performance
- CDN delivery

---

### 6. **Payment Processing** 💳 (FOR PREMIUM FEATURES)
**Status:** Mocked (no real payments)

**Options:**
- **Google Play Billing** (for Android)
  - Native Android integration
  - Handles subscriptions
  - 30% Google fee
  
- **RevenueCat** (Recommended)
  - Unified API for iOS + Android
  - Handles subscriptions
  - Analytics built-in
  - Free tier available

**Capacitor Plugin:**
```bash
npm install @capacitor/in-app-purchases
# or
npm install @revenuecat/purchases-capacitor
```

---

### 7. **Analytics** 📊 (OPTIONAL)
**Status:** Not implemented

**Options:**
- **Google Analytics** (Free)
- **Mixpanel** (Free tier: 100K events/month)
- **Amplitude** (Free tier: 10M events/month)
- **Firebase Analytics** (Free)

---

## Implementation Priority

### Phase 1: Core Features (Can do now)
1. ✅ **Map API** - Replace grid with real map
2. ✅ **Geolocation** - Get user's real location
3. ✅ **Image Storage** - Upload photos to cloud storage

### Phase 2: Backend Integration (When ready)
4. **Supabase Setup** - Authentication + Database
5. **Real-time Messaging** - Via Supabase Realtime
6. **Push Notifications** - User engagement

### Phase 3: Monetization (Later)
7. **Payment Processing** - Premium subscriptions
8. **Analytics** - User behavior tracking

---

## Quick Start: Map API Integration

### Option 1: Google Maps (Recommended for beginners)
```bash
npm install @googlemaps/js-api-loader
```

Add to `capacitor.config.ts`:
```typescript
server: {
  androidScheme: 'https', // Required for Google Maps
}
```

### Option 2: Mapbox (Better pricing)
```bash
npm install mapbox-gl
npm install @types/mapbox-gl --save-dev
```

### Option 3: Leaflet (Free, no API key)
```bash
npm install leaflet react-leaflet
npm install @types/leaflet --save-dev
```

---

## Current State vs Production Needs

| Feature | Current (Offline) | Production Needs |
|---------|------------------|------------------|
| **Maps** | Simple grid | Real map API (Google/Mapbox/Leaflet) |
| **Location** | Mock coordinates | Geolocation API |
| **Auth** | localStorage only | Supabase Auth |
| **Data Storage** | localStorage | Supabase Database |
| **Photos** | Base64 in localStorage | Cloud Storage (Supabase/Firebase) |
| **Messaging** | Local only | Supabase Realtime |
| **Notifications** | None | Push Notifications (FCM) |
| **Payments** | Mocked | In-App Purchases |
| **Analytics** | None | Google Analytics/Mixpanel |

---

## Minimum Viable Production Setup

To go from offline demo to basic production, you need:

1. **Map API Key** (Google Maps or Mapbox)
2. **Supabase Project** (for auth + database)
3. **Geolocation Plugin** (for user location)

Everything else is optional but recommended for scale.

---

## Next Steps

1. Choose a Map API provider
2. Get API key/token
3. Install Capacitor Geolocation plugin
4. Replace grid map with real map
5. (Optional) Set up Supabase for backend

**The app works great offline, but these APIs will unlock production features!**
