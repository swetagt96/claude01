import { Router } from "express";
import {
  createSession,
  createUser,
  destroySession,
  findUserByEmail,
  requireAuth,
  sanitizeUser,
  verifyPassword,
  type AuthedRequest,
} from "../services/auth.js";

const router = Router();

const EMAIL_RE = /^[^\s@]+@[^\s@]+\.[^\s@]+$/;

router.post("/register", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || !EMAIL_RE.test(email)) {
    return res.status(400).json({ error: "A valid email is required." });
  }
  if (typeof password !== "string" || password.length < 8) {
    return res.status(400).json({ error: "Password must be at least 8 characters." });
  }
  if (findUserByEmail(email)) {
    return res.status(409).json({ error: "An account with that email already exists." });
  }
  const user = createUser(email, password);
  const token = createSession(user.id);
  res.status(201).json({ token, user: sanitizeUser(user) });
});

router.post("/login", (req, res) => {
  const { email, password } = req.body ?? {};
  if (typeof email !== "string" || typeof password !== "string") {
    return res.status(400).json({ error: "Email and password are required." });
  }
  const user = findUserByEmail(email);
  if (!user || !verifyPassword(password, user.salt, user.passwordHash)) {
    return res.status(401).json({ error: "Invalid email or password." });
  }
  const token = createSession(user.id);
  res.json({ token, user: sanitizeUser(user) });
});

router.post("/logout", requireAuth, (req: AuthedRequest, res) => {
  if (req.token) destroySession(req.token);
  res.json({ ok: true });
});

router.get("/me", requireAuth, (req: AuthedRequest, res) => {
  res.json({ user: sanitizeUser(req.user!) });
});

export default router;
