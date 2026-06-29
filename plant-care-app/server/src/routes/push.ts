import { randomUUID } from "node:crypto";
import { Router } from "express";
import { requireAuth, type AuthedRequest } from "../services/auth.js";
import { getPublicKey } from "../services/push.js";
import { getDb, save } from "../store.js";

const router = Router();

// Public VAPID key so the browser can create a push subscription.
router.get("/public-key", (_req, res) => {
  res.json({ publicKey: getPublicKey() });
});

router.post("/subscribe", requireAuth, (req: AuthedRequest, res) => {
  const sub = req.body?.subscription ?? req.body;
  if (!sub || typeof sub.endpoint !== "string" || !sub.keys?.p256dh || !sub.keys?.auth) {
    return res.status(400).json({ error: "A valid push subscription is required." });
  }

  const db = getDb();
  // Replace any existing subscription with the same endpoint for this user.
  db.pushSubscriptions = db.pushSubscriptions.filter(
    (s) => !(s.userId === req.user!.id && s.endpoint === sub.endpoint)
  );
  db.pushSubscriptions.push({
    id: randomUUID(),
    userId: req.user!.id,
    endpoint: sub.endpoint,
    keys: { p256dh: sub.keys.p256dh, auth: sub.keys.auth },
    createdAt: new Date().toISOString(),
  });
  save();
  res.status(201).json({ ok: true });
});

router.post("/unsubscribe", requireAuth, (req: AuthedRequest, res) => {
  const endpoint = req.body?.endpoint;
  if (typeof endpoint !== "string") {
    return res.status(400).json({ error: "endpoint is required." });
  }
  const db = getDb();
  db.pushSubscriptions = db.pushSubscriptions.filter(
    (s) => !(s.userId === req.user!.id && s.endpoint === endpoint)
  );
  save();
  res.json({ ok: true });
});

export default router;
