export type SessionUser = {
  loginId: string;
  name: string;
  email: string;
  phone: string;
  role: string;
  updatedAt?: string;
};

export type Session = {
  token: string;
  user: SessionUser;
};

type StoredSession = Session & {
  /** epoch ms after which this session is considered expired */
  expiresAt: number;
};

const SESSION_KEY = "dex_session";

// How long a signed-in session (including admin) stays valid without
// re-authenticating. Stored in localStorage so it survives tab/browser
// restarts, rather than sessionStorage which is wiped when the tab closes.
const SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours

export function getSession(): Session | null {
  const raw = localStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredSession;
    if (!stored.expiresAt || Date.now() > stored.expiresAt) {
      localStorage.removeItem(SESSION_KEY);
      return null;
    }
    return { token: stored.token, user: stored.user };
  } catch {
    localStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: Session) {
  const stored: StoredSession = { ...session, expiresAt: Date.now() + SESSION_TTL_MS };
  localStorage.setItem(SESSION_KEY, JSON.stringify(stored));
}

export function updateSessionUser(user: SessionUser) {
  const session = getSession();
  if (!session) return;
  setSession({ ...session, user });
}

export function clearSession() {
  localStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return Boolean(getSession()?.token);
}

export function authHeader(): HeadersInit {
  const token = getSession()?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
