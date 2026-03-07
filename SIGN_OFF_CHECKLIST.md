# VibeUp Sign-Off Checklist

## Build
- [ ] `npm run build` succeeds
- [ ] `.env` has Firebase + Mapbox keys

## Core Flows
- [ ] Auth: signup, login, logout
- [ ] Profile: edit and save
- [ ] Discover: swipe, like, pass
- [ ] Map: loads, Near Me works
- [ ] Messages: chat works
- [ ] Events: create, RSVP, List Your Venue
- [ ] No black screens or crashes

## Deploy
- [ ] Firestore rules: `npx firebase deploy --only firestore:rules`
- [ ] Stripe webhook: see STRIPE_WEBHOOK_SETUP.md
