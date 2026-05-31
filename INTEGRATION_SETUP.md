# Integration Setup Guide

## ✅ What's Been Integrated

1. **Mapbox** - Real map view (replaces grid)
2. **Geolocation** - Get user's real location
3. **OneSignal** - Push notifications
4. **RevenueCat** - In-app purchases

---

## 🔧 Setup Steps

### 1. Create `.env` File

Create a `.env` file in the root directory (`apps/mobile-web/.env`):

```env
# Mapbox API
VITE_MAPBOX_ACCESS_TOKEN=pk.your_mapbox_token_here

# OneSignal
VITE_ONESIGNAL_APP_ID=your_onesignal_app_id_here

# RevenueCat
VITE_REVENUECAT_API_KEY=your_revenuecat_api_key_here
```

**Important:** Add `.env` to `.gitignore` to keep your keys safe!

### 2. Get Your API Keys

#### Mapbox:
1. Go to https://account.mapbox.com/access-tokens/
2. Copy your default public token (starts with `pk.`)
3. Add to `.env` as `VITE_MAPBOX_ACCESS_TOKEN`

#### OneSignal:
1. Go to https://app.onesignal.com/
2. Create/select your app
3. Go to Settings > Keys & IDs
4. Copy "OneSignal App ID"
5. Add to `.env` as `VITE_ONESIGNAL_APP_ID`

#### RevenueCat:
1. Go to https://app.revenuecat.com/
2. Create/select your project
3. Go to Project Settings > API Keys
4. Copy "Public API Key" (starts with `rc`)
5. Add to `.env` as `VITE_REVENUECAT_API_KEY`

### 3. Rebuild and Sync

```bash
# Rebuild web assets
npm run build

# Sync with Capacitor
npm run android:sync
```

### 4. Test on Device

```bash
# Install on device
cd android
./gradlew installDebug

# Launch app
adb shell am start -n com.perezcode.vibeup/.MainActivity
```

---

## 📱 Features Now Available

### Map View
- ✅ Real Mapbox map (replaces grid)
- ✅ Profile markers on map
- ✅ Click markers to see profiles
- ✅ User location shown
- ✅ Toggle between Map and Grid view

### Geolocation
- ✅ Get user's current location
- ✅ Calculate distances to profiles
- ✅ Auto-center map on user location

### Push Notifications
- ✅ OneSignal initialized on app start
- ✅ Permission request handled
- ✅ Ready to send notifications

### In-App Purchases
- ✅ RevenueCat initialized
- ✅ Ready for premium subscriptions
- ✅ Purchase/restore functions available

---

## 🎯 Next Steps

### For Mapbox:
- Customize map style (dark, light, satellite)
- Add clustering for many markers
- Add custom marker icons

### For OneSignal:
- Set up notification triggers
- Send welcome notification
- Send match notifications

### For RevenueCat:
- Create products in RevenueCat dashboard
- Set up entitlements (premium, boost, etc.)
- Connect to Google Play Console

---

## 🔍 Testing

### Test Map:
1. Open Map tab
2. Should see real map (not grid)
3. Click markers to see profiles
4. Toggle to Grid view to compare

### Test Geolocation:
1. Grant location permission
2. Map should center on your location
3. Profile distances should update

### Test Notifications:
1. Check console for "OneSignal initialized"
2. Permission should be requested
3. Check device notification settings

### Test Purchases:
1. Create test products in RevenueCat
2. Use `getOfferings()` to fetch products
3. Use `purchasePackage()` to test purchase flow

---

## 🐛 Troubleshooting

### Map not showing:
- Check `.env` file exists
- Verify `VITE_MAPBOX_ACCESS_TOKEN` is set
- Check browser console for errors
- Rebuild: `npm run build && npm run android:sync`

### Location not working:
- Check Android permissions in Settings
- Verify `ACCESS_FINE_LOCATION` in AndroidManifest.xml
- Test in browser first (HTTPS required)

### Notifications not working:
- Check OneSignal dashboard for device registration
- Verify app ID is correct
- Check Android notification permissions

### Purchases not working:
- Verify RevenueCat API key
- Check products are configured in dashboard
- Test with RevenueCat sandbox mode

---

## 📝 Code Examples

### Get User Location:
```typescript
import { getCurrentLocation } from './utils/geolocation';

const location = await getCurrentLocation();
console.log(location.latitude, location.longitude);
```

### Send Notification:
```typescript
import { sendLocalNotification } from './utils/notifications';

await sendLocalNotification('New Match!', 'You have a new match');
```

### Check Premium Status:
```typescript
import { checkEntitlement } from './utils/purchases';

const hasPremium = await checkEntitlement('premium');
```

### Purchase Premium:
```typescript
import { getOfferings, purchasePackage } from './utils/purchases';

const offerings = await getOfferings();
const premiumPackage = offerings.current?.availablePackages.find(p => p.identifier === 'premium');
if (premiumPackage) {
  await purchasePackage(premiumPackage);
}
```

---

## ✅ Integration Complete!

All services are integrated and ready to use. Just add your API keys to `.env` and rebuild!
