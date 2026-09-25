// A partner's session is kept completely separate from the admin session
// (Auth.ts's dex_session key): a partner logging in must never accidentally
// satisfy isAuthenticated()'s check and land on the full admin dashboard —
// the backend's requirePartner would reject every admin-only call anyway,
// but that's a broken-page experience, not a clean redirect. Two disjoint
// localStorage keys keep the two identities from ever overlapping on the
// same browser, and let an admin and a partner be signed in side-by-side in
// the same browser without either session clobbering the other.

export type PartnerSessionUser = {
  loginId: string;
  name: string;
};

export type PartnerSession = {
  token: string;
  user: PartnerSessionUser;
};

type StoredPartnerSession = PartnerSession & { expiresAt: number };

const PARTNER_SESSION_KEY = "dex_partner_session";
const PARTNER_SESSION_TTL_MS = 12 * 60 * 60 * 1000; // 12 hours, matches the admin session's TTL

export function getPartnerSession(): PartnerSession | null {
  const raw = localStorage.getItem(PARTNER_SESSION_KEY);
  if (!raw) return null;
  try {
    const stored = JSON.parse(raw) as StoredPartnerSession;
    if (!stored.expiresAt || Date.now() > stored.expiresAt) {
      localStorage.removeItem(PARTNER_SESSION_KEY);
      return null;
    }
    return { token: stored.token, user: stored.user };
  } catch {
    localStorage.removeItem(PARTNER_SESSION_KEY);
    return null;
  }
}

export function setPartnerSession(session: PartnerSession) {
  const stored: StoredPartnerSession = { ...session, expiresAt: Date.now() + PARTNER_SESSION_TTL_MS };
  localStorage.setItem(PARTNER_SESSION_KEY, JSON.stringify(stored));
}

export function clearPartnerSession() {
  localStorage.removeItem(PARTNER_SESSION_KEY);
}

export function isPartnerAuthenticated() {
  return Boolean(getPartnerSession()?.token);
}

export function partnerAuthHeader(): Record<string, string> {
  const session = getPartnerSession();
  return session ? { Authorization: `Bearer ${session.token}` } : {};
}
