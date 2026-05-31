/**
 * Stripe webhook for premium subscriptions.
 * Updates Firestore users/{uid}/premium/status when subscription changes.
 */

const { setGlobalOptions } = require("firebase-functions");
const { onRequest } = require("firebase-functions/https");
const { defineSecret } = require("firebase-functions/params");
const logger = require("firebase-functions/logger");
const admin = require("firebase-admin");
const Stripe = require("stripe");
const express = require("express");

admin.initializeApp();

const stripeSecretKey = defineSecret("STRIPE_SECRET_KEY");
const stripeWebhookSecret = defineSecret("STRIPE_WEBHOOK_SECRET");

setGlobalOptions({ maxInstances: 10 });

const app = express();
app.use(express.raw({ type: "application/json" }));

app.post("/", async (req, res) => {
  const sig = req.headers["stripe-signature"];
  const webhookSecret = stripeWebhookSecret.value();
  const secretKey = stripeSecretKey.value();

  if (!sig || !webhookSecret || !secretKey) {
    logger.error("Missing Stripe config");
    res.status(500).send("Webhook misconfigured");
    return;
  }

  const rawBody = req.body ? (Buffer.isBuffer(req.body) ? req.body.toString("utf8") : req.body) : null;
  if (!rawBody) {
    logger.error("No raw body");
    res.status(400).send("Webhook requires raw body");
    return;
  }

  let event;
  try {
    const stripe = new Stripe(secretKey);
    event = stripe.webhooks.constructEvent(rawBody, sig, webhookSecret);
  } catch (err) {
    logger.warn("Webhook signature verification failed", err.message);
    res.status(400).send(`Webhook Error: ${err.message}`);
    return;
  }

  // Payment Link: checkout.session.completed has client_reference_id (Firebase UID)
  if (event.type === "checkout.session.completed") {
    const session = event.data.object;
    const uid = session.client_reference_id;
    if (uid && session.payment_status === "paid") {
      await admin.firestore().doc(`users/${uid}/premium/status`).set({
        hasPremium: true,
        updatedAt: admin.firestore.FieldValue.serverTimestamp(),
      }, { merge: true });
      if (session.subscription) {
        await admin.firestore().doc(`subscriptionToUid/${session.subscription}`).set({ uid });
      }
      logger.info("Premium granted via checkout", { uid });
    }
  }

  if (event.type === "customer.subscription.updated" || event.type === "customer.subscription.deleted") {
    const subscription = event.data.object;
    let uid = subscription.metadata?.firebaseUid || subscription.metadata?.firebase_uid;
    if (!uid && subscription.id) {
      const mapping = await admin.firestore().doc(`subscriptionToUid/${subscription.id}`).get();
      uid = mapping.exists ? mapping.data()?.uid : null;
    }
    if (!uid) {
      res.status(200).send("OK");
      return;
    }

    const isActive = event.type === "customer.subscription.updated"
      ? (subscription.status === "active" || subscription.status === "trialing")
      : false;
    await admin.firestore().doc(`users/${uid}/premium/status`).set({
      hasPremium: isActive,
      updatedAt: admin.firestore.FieldValue.serverTimestamp(),
    }, { merge: true });
    logger.info("Updated premium status", { uid, hasPremium: isActive });
  }

  res.status(200).send("OK");
});

exports.stripeWebhook = onRequest(
  {
    secrets: [stripeSecretKey, stripeWebhookSecret],
    invoker: "public",
  },
  app
);
