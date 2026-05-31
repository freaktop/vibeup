# Stripe Webhook Setup for Premium

The app reads premium status from Firestore at `users/{uid}/premium/status`. The Cloud Function `stripeWebhook` updates this when subscriptions change.

## 1. Set Secrets

```bash
firebase functions:secrets:set STRIPE_SECRET_KEY
# Paste your sk_live_... key when prompted

firebase functions:secrets:set STRIPE_WEBHOOK_SECRET
# Paste your whsec_... key when prompted (from Stripe Dashboard after adding webhook)
```

## 2. Deploy the Function

```bash
cd functions
npm install
cd ..
firebase deploy --only functions
```

After deploy, note the URL (e.g. `https://us-central1-vibeup-1b037.cloudfunctions.net/stripeWebhook`).

## 3. Stripe Dashboard

1. **Webhooks** → Add endpoint
2. **URL:** `https://us-central1-vibeup-1b037.cloudfunctions.net/stripeWebhook` (use your actual URL)
3. **Events:** `checkout.session.completed`, `customer.subscription.updated`, `customer.subscription.deleted`
4. Copy the **Signing secret** (whsec_...) → run `firebase functions:secrets:set STRIPE_WEBHOOK_SECRET` if not done yet

## 4. Payment Link (client_reference_id)

The app appends `?client_reference_id={firebaseUid}` to the Payment Link URL when opening it. Stripe passes this to `checkout.session.completed`, so the webhook can update the correct user. No extra setup needed.

## 5. App Flow

- User taps Upgrade → opens Stripe (Payment Link or Checkout)
- On success, Stripe fires webhook → Cloud Function updates Firestore
- App's `listenPremiumFromFirestore` picks up the change → premium UI updates
