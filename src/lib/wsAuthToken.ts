// In-memory (never persisted) holder for the session JWT, used only to
// identify this connection to the matching engine's /ws endpoint so it can
// send this account's own AccountID-bearing events unredacted (see the
// engine's internal/wsauth and ws/hub.go's broadcast).
//
// The actual authenticated session for every REST call stays exactly as it
// was: an HttpOnly dex_session cookie, invisible to JS, sent automatically
// by the browser to Dex-Backend. That cookie can't be read here by design
// (XSS protection) and isn't sent cross-origin to the matching engine's own
// port anyway (different origin, no shared cookie domain) — so /auth/login's
// response body, which already returns the same token separately, is
// captured here purely for the WS handshake's query param. Kept in a plain
// module variable (not localStorage/sessionStorage) so it never outlives the
// page and is never written to disk.
let token: string | null = null;

export function setWsAuthToken(t: string | null) {
  token = t;
}

export function getWsAuthToken(): string | null {
  return token;
}
