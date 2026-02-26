# VibeUp Setup Guide - APIs & Services

## What You Need to Get Started

### **REQUIRED (For Map Feature)**
1. **Map API Key**
   - Google Maps: https://console.cloud.google.com/google/maps-apis
   - Mapbox: https://account.mapbox.com/access-tokens/
   - Or use Leaflet (free, no key needed)

### **OPTIONAL (For Full Production Features)**
2. **Supabase Account** (for backend/auth): https://supabase.com
3. **Geolocation** (built into Capacitor - just needs permissions)

---

## Quick Setup: Map API

### Option 1: Google Maps (Easiest)

1. **Get API Key:**
   - Go to https://console.cloud.google.com/
   - Create project or select existing
   - Enable "Maps JavaScript API"
   - Create API key
   - Restrict key to your domain (recommended)

2. **Add to your code:**
   ```typescript
   // In MapView.tsx or Map.tsx
   import { Loader } from '@googlemaps/js-api-loader';
   
   const loader = new Loader({
     apiKey: 'YOUR_API_KEY_HERE',
     version: 'weekly',
   });
   ```

3. **Install package:**
   ```bash
   npm install @googlemaps/js-api-loader
   ```

### Option 2: Mapbox (Better pricing)

1. **Get Access Token:**
   - Sign up at https://account.mapbox.com/
   - Get your default public token

2. **Add to your code:**
   ```typescript
   import mapboxgl from 'mapbox-gl';
   import 'mapbox-gl/dist/mapbox-gl.css';
   
   mapboxgl.accessToken = 'YOUR_ACCESS_TOKEN_HERE';
   ```

3. **Install package:**
   ```bash
   npm install mapbox-gl
   npm install @types/mapbox-gl --save-dev
   ```

### Option 3: Leaflet (Free, No API Key)

1. **Install:**
   ```bash
   npm install leaflet react-leaflet
   npm install @types/leaflet --save-dev
   ```

2. **No API key needed!** Uses OpenStreetMap

---

## Setup: Geolocation (Get User Location)

1. **Install Capacitor Plugin:**
   ```bash
   npm install @capacitor/geolocation
   npx cap sync android
   ```

2. **Add Permissions** (already in AndroidManifest.xml):
   ```xml
   <uses-permission android:name="android.permission.ACCESS_FINE_LOCATION" />
   <uses-permission android:name="android.permission.ACCESS_COARSE_LOCATION" />
   ```

3. **Use in Code:**
   ```typescript
   import { Geolocation } from '@capacitor/geolocation';
   
   const getCurrentLocation = async () => {
     const position = await Geolocation.getCurrentPosition();
     console.log(position.coords.latitude, position.coords.longitude);
   };
   ```

---

## Setup: Supabase (Optional - For Backend)

1. **Create Supabase Project:**
   - Go to https://supabase.com
   - Click "New Project"
   - Choose organization
   - Enter project details
   - Wait for database setup (~2 minutes)

2. **Get Credentials:**
   - Go to Project Settings > API
   - Copy "Project URL" and "anon/public key"

3. **Install Supabase:**
   ```bash
   npm install @supabase/supabase-js
   ```

4. **Create .env file:**
   ```env
   VITE_SUPABASE_URL=https://your-project.supabase.co
   VITE_SUPABASE_ANON_KEY=your-anon-key-here
   ```

5. **Initialize in code:**
   ```typescript
   import { createClient } from '@supabase/supabase-js';
   
   const supabaseUrl = import.meta.env.VITE_SUPABASE_URL;
   const supabaseKey = import.meta.env.VITE_SUPABASE_ANON_KEY;
   
   export const supabase = createClient(supabaseUrl, supabaseKey);
   ```

---

## Cost Estimates

### Map APIs:
- **Google Maps:** $200 free/month, then ~$7 per 1000 loads
- **Mapbox:** Free tier: 50K loads/month, then $5 per 1000 loads
- **Leaflet:** FREE (uses OpenStreetMap)

### Supabase:
- **Free Tier:** 
  - 500MB database
  - 1GB file storage
  - 2GB bandwidth
  - 50,000 monthly active users
- **Pro:** $25/month (scales automatically)

### Geolocation:
- **FREE** (native device feature)

### Total Minimum Cost:
- **FREE** if using Leaflet + Supabase Free Tier
- **~$25/month** for Mapbox + Supabase Pro (for scale)

---

## What's Already Working

✅ **No APIs needed for:**
- Profile browsing (localStorage)
- Swiping/liking (localStorage)
- Messaging (localStorage)
- Profile editing (localStorage)
- All UI/UX features

❌ **APIs needed for:**
- Real map view (currently grid)
- User's real location (currently mock)
- Cross-device sync (currently local only)
- Real-time messaging (currently local only)
- Photo storage (currently base64)

---

## Recommendation

**For MVP/Launch:**
1. Start with **Leaflet** (free map, no API key)
2. Add **Geolocation** plugin (free)
3. Add **Supabase** later when you need real auth/sync

**For Production Scale:**
1. Switch to **Mapbox** (better pricing than Google)
2. Use **Supabase Pro** for production
3. Add **Push Notifications** for engagement

**Right now, you only need a Map API if you want to replace the grid view with a real map!**
