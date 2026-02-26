# API Keys Setup - Quick Start

## ⚠️ IMPORTANT: Add Your API Keys

Create a `.env` file in `apps/mobile-web/` with your API keys:

```env
# Mapbox (REQUIRED for map to work)
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here

# OneSignal (Optional - for push notifications)
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here

# RevenueCat (Optional - for in-app purchases)
VITE_REVENUECAT_API_KEY=your_revenuecat_api_key_here
```

## Where to Get Keys:

### 1. Mapbox Token
- Go to: https://account.mapbox.com/access-tokens/
- Copy your **default public token** (starts with `pk.`)
- Add to `.env` as `VITE_MAPBOX_ACCESS_TOKEN`

### 2. OneSignal App ID
- Go to: https://app.onesignal.com/
- Create/select your app
- Settings > Keys & IDs > Copy "OneSignal App ID"
- Add to `.env` as `VITE_ONESIGNAL_APP_ID`

### 3. RevenueCat API Key
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

❌ Real Mapbox map (shows error message without token)
❌ Push notifications (won't initialize without OneSignal)
❌ In-app purchases (won't work without RevenueCat)

---

**The app will work fine without keys, but map will show a message asking for Mapbox token!**
