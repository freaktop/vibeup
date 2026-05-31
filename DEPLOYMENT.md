# VibeUp – Production Deployment Checklist

## Pre-Deploy

- [ ] **Firebase Console**
  - Enable **Email/Password** and **Google** sign-in (Authentication > Sign-in method)
  - Add your production domain to **Authorized domains** (Authentication > Settings)
  - Deploy Firestore rules: `npx firebase-tools deploy --only firestore:rules`
  - Deploy Firestore indexes: `npx firebase-tools deploy --only firestore:indexes`

- [ ] **Environment**
  - Copy `.env.example` to `.env` and fill in all values
  - Ensure `VITE_TERMS_URL` and `VITE_PRIVACY_URL` point to your live legal pages

- [ ] **Android release**
  - Create `android/keystore.properties` with release signing config
  - Or use debug signing for testing: `cd android && ./gradlew installDebug`

## Build & Deploy

```bash
npm run build
```

### Web (Vercel / Netlify / Firebase Hosting)

- **Vercel:** Connect repo; `vercel.json` is preconfigured
- **Netlify:** Connect repo; `netlify.toml` is preconfigured
- **Firebase Hosting:** `npx firebase-tools deploy --only hosting`

### Android

```bash
npm run android:sync
cd android
./gradlew bundleRelease   # AAB for Play Store
# or
./gradlew installRelease  # APK for direct install
```

## Post-Deploy

- [ ] Test sign-up and sign-in (email + Google)
- [ ] Confirm Firestore reads/writes work
- [ ] Test map (Mapbox token)
- [ ] Verify PWA install prompt (if applicable)

## Security Notes

- `.env` is gitignored; never commit API keys
- Firebase API keys in frontend are public by design; security is enforced by Firestore rules
- Consider restricting `reports` read access to admins only (requires admin UID list in rules)
