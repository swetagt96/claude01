export interface User {
  id: string;
  email: string;
  createdAt: string;
}

const TOKEN_KEY = "plantpal.token.v1";

export function getToken(): string | null {
  try {
    return localStorage.getItem(TOKEN_KEY);
  } catch {
    return null;
  }
}

function setToken(token: string | null): void {
  try {
    if (token) localStorage.setItem(TOKEN_KEY, token);
    else localStorage.removeItem(TOKEN_KEY);
  } catch {
    /* ignore */
  }
}

function authHeaders(): HeadersInit {
  const token = getToken();
  return token ? { Authorization: `Bearer ${token}` } : {};
}

async function parseError(res: Response, fallback: string): Promise<never> {
  const data = await res.json().catch(() => ({}));
  throw new Error(data.error ?? fallback);
}

export async function register(email: string, password: string): Promise<User> {
  const res = await fetch("/api/auth/register", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) await parseError(res, "Could not create account.");
  const data = (await res.json()) as { token: string; user: User };
  setToken(data.token);
  return data.user;
}

export async function login(email: string, password: string): Promise<User> {
  const res = await fetch("/api/auth/login", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ email, password }),
  });
  if (!res.ok) await parseError(res, "Could not sign in.");
  const data = (await res.json()) as { token: string; user: User };
  setToken(data.token);
  return data.user;
}

// Restores the session on app load using a stored token. Returns null if there
// is no valid session.
export async function fetchCurrentUser(): Promise<User | null> {
  if (!getToken()) return null;
  try {
    const res = await fetch("/api/auth/me", { headers: authHeaders() });
    if (!res.ok) {
      setToken(null);
      return null;
    }
    const data = (await res.json()) as { user: User };
    return data.user;
  } catch {
    return null;
  }
}

export async function logout(): Promise<void> {
  try {
    await fetch("/api/auth/logout", { method: "POST", headers: authHeaders() });
  } catch {
    /* ignore network errors on logout */
  }
  setToken(null);
}

export function isLoggedIn(): boolean {
  return getToken() !== null;
}

export { authHeaders };
