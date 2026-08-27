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

const SESSION_KEY = "dex_session";

export function getSession(): Session | null {
  const raw = sessionStorage.getItem(SESSION_KEY);
  if (!raw) return null;
  try {
    return JSON.parse(raw) as Session;
  } catch {
    sessionStorage.removeItem(SESSION_KEY);
    return null;
  }
}

export function setSession(session: Session) {
  sessionStorage.setItem(SESSION_KEY, JSON.stringify(session));
}

export function updateSessionUser(user: SessionUser) {
  const session = getSession();
  if (!session) return;
  setSession({ ...session, user });
}

export function clearSession() {
  sessionStorage.removeItem(SESSION_KEY);
}

export function isAuthenticated() {
  return Boolean(getSession()?.token);
}

export function authHeader(): HeadersInit {
  const token = getSession()?.token;
  return token ? { Authorization: `Bearer ${token}` } : {};
}
