import { randomBytes, randomUUID, scryptSync, timingSafeEqual } from "node:crypto";
import type { NextFunction, Request, Response } from "express";
import { getDb, save, type UserRecord } from "../store.js";

export interface PublicUser {
  id: string;
  email: string;
  createdAt: string;
}

export function sanitizeUser(user: UserRecord): PublicUser {
  return { id: user.id, email: user.email, createdAt: user.createdAt };
}

export function hashPassword(password: string): { hash: string; salt: string } {
  const salt = randomBytes(16).toString("hex");
  const hash = scryptSync(password, salt, 64).toString("hex");
  return { hash, salt };
}

export function verifyPassword(password: string, salt: string, expected: string): boolean {
  const hash = scryptSync(password, salt, 64);
  const expectedBuf = Buffer.from(expected, "hex");
  if (hash.length !== expectedBuf.length) return false;
  return timingSafeEqual(hash, expectedBuf);
}

export function findUserByEmail(email: string): UserRecord | undefined {
  const normalized = email.trim().toLowerCase();
  return getDb().users.find((u) => u.email === normalized);
}

export function createUser(email: string, password: string): UserRecord {
  const { hash, salt } = hashPassword(password);
  const user: UserRecord = {
    id: randomUUID(),
    email: email.trim().toLowerCase(),
    passwordHash: hash,
    salt,
    createdAt: new Date().toISOString(),
  };
  getDb().users.push(user);
  save();
  return user;
}

export function createSession(userId: string): string {
  const token = randomBytes(32).toString("hex");
  getDb().sessions.push({ token, userId, createdAt: new Date().toISOString() });
  save();
  return token;
}

export function destroySession(token: string): void {
  const db = getDb();
  db.sessions = db.sessions.filter((s) => s.token !== token);
  save();
}

export function getUserByToken(token: string | undefined): UserRecord | undefined {
  if (!token) return undefined;
  const session = getDb().sessions.find((s) => s.token === token);
  if (!session) return undefined;
  return getDb().users.find((u) => u.id === session.userId);
}

function tokenFromRequest(req: Request): string | undefined {
  const header = req.headers.authorization;
  if (header?.startsWith("Bearer ")) return header.slice(7).trim();
  return undefined;
}

// Express request augmented with the authenticated user.
export interface AuthedRequest extends Request {
  user?: UserRecord;
  token?: string;
}

export function requireAuth(req: AuthedRequest, res: Response, next: NextFunction): void {
  const token = tokenFromRequest(req);
  const user = getUserByToken(token);
  if (!user) {
    res.status(401).json({ error: "Authentication required." });
    return;
  }
  req.user = user;
  req.token = token;
  next();
}
