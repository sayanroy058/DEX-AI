import { getWsAuthToken } from "@/lib/wsAuthToken";

export type WSOrder = {
  id: string;
  status: string;
  filled: string;
  // Owning account, present on events from engines new enough to serialize
  // the full order. Lets consumers ignore other accounts' churn (the MM
  // desks generate a constant stream of fills visible to every client)
  // without any server round-trip. Optional so a legacy engine payload
  // still type-checks; consumers must treat "absent" as "unknown".
  accountId?: string;
};
export type WSTrade = {
  id: string;
  symbol: string;
  market: string;
  price: string;
  quantity: string;
  makerSide: "BUY" | "SELL";
  executedAt: string;
};
export type WSFunding = {
  accountId: string;
  symbol: string;
  rate: string;
  payment: string;
};
export type WSTicker = {
  symbol: string;
  market: string;
  bestBid: string;
  bestAsk: string;
  midPrice: string;
  markPrice: string;
  indexPrice?: string;
  spread: string;
  fundingRatePct?: string;
  makerFeePct?: string;
  takerFeePct?: string;
  maintenanceMarginRatePct?: string;
  change24hPct?: string;
  volume24h?: string;
  has24hData?: boolean;
};

export type WSEvent = {
  type: string; // ORDER_OPEN | ORDER_PARTIALLY_FILLED | ORDER_FILLED | ORDER_CANCELLED | ORDER_REJECTED | TRADE | FUNDING | TICKER | ...
  symbol: string;
  market: string;
  sequenceNumber: number;
  order?: WSOrder;
  trade?: WSTrade;
  funding?: WSFunding;
  // Present only on type === "TICKER": the engine's 1s all-symbols snapshot.
  tickers?: WSTicker[];
  timestamp?: number;
};

type Listener = (evt: WSEvent) => void;
/** Fired when a sequence gap is detected on a stream, meaning we dropped events
 *  and any local view built from the stream may be stale — consumers should
 *  refetch authoritative state (e.g. re-GET open orders). */
type GapListener = (stream: string) => void;
/** Fired on connection state changes so the UI can show a status indicator. */
export type WSStatus = "connecting" | "open" | "closed";
type StatusListener = (status: WSStatus) => void;

const WS_URL = import.meta.env.VITE_WS_URL ?? "ws://localhost:8080/ws";
const MAX_RECONNECT_DELAY = 30_000;
const BASE_RECONNECT_DELAY = 1_000;

// The engine numbers most events with a per-symbol, gapless, incrementing
// sequence (starting near 1) — that's what checkSequence below tracks
// per-stream to detect drops. A handful of event kinds instead use a
// process-wide "out-of-band" counter (matching-engine's
// events.Bus.NextOutOfBandSequence, based at 1<<62) for events that don't
// belong to any single symbol's book-sequenced stream: funding payments,
// liquidations, realized PnL, and — critically — pre-book order
// rejections (e.g. "insufficient opposing liquidity", a rejected market
// order with no counterparty). Both numbering spaces share the
// sequenceNumber field, but they have no "earlier/later" relationship to
// each other.
//
// Before this constant existed, checkSequence compared them as if they
// did: once ANY out-of-band event landed for a symbol (lastSeq set to a
// ~4.6e18 value), every subsequent NORMAL, real order/trade event for
// that same symbol satisfied `sequenceNumber <= prev` and was silently
// dropped for the rest of the connection's lifetime — a real trade could
// fill and settle correctly while Order History / Trade History simply
// stopped live-updating for that symbol until the next reconnect (which
// clears lastSeq) or a manual page refresh. Confirmed live 2026-09-14: a
// rejected order (e.g. a market SELL with no resting liquidity) silently
// broke live updates for every later order on the same symbol.
//
// JS numbers can't exactly represent 1n<<62n (over Number.MAX_SAFE_INTEGER,
// 2^53-1) — JSON.parse already rounds it on the way in — so this uses a
// much lower, still-astronomically-unreachable threshold for a real
// per-symbol book sequence rather than the exact Go constant: no symbol
// will realistically emit anywhere near 10^15 book events in this
// platform's lifetime, so anything at or above this is unambiguously
// out-of-band regardless of float rounding.
const OUT_OF_BAND_SEQ_THRESHOLD = 1e15;

/** Server control frame: declare which "symbol|market" streams this
 *  connection wants, so the hub stops broadcasting every market's churn to
 *  every client. Unsubscribing is deliberately unsupported by the server —
 *  wants only ever accumulate over a tab's lifetime, which matches how the
 *  UI actually behaves (markets get visited, rarely "unvisited"). */
type ServerSubscribeFrame = { action: "subscribe"; streams: string[] };

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private gapListeners = new Set<GapListener>();
  private statusListeners = new Set<StatusListener>();
  /** Latest engine ticker per "symbol|market", updated by 1s TICKER frames.
   *  Shared store so every hook reads one copy instead of polling HTTP. */
  private tickers = new Map<string, WSTicker>();
  private tickListeners = new Set<(tickers: Map<string, WSTicker>) => void>();
  /** "symbol|market" streams this tab has declared interest in, sent to the
   *  engine as subscribe control frames and re-sent after every reconnect.
   *  Hooks call wantStreams() whenever their market set changes; wants only
   *  accumulate over a tab's lifetime, matching how the UI behaves (markets
   *  get visited, rarely "unvisited"). */
  private wantedStreams = new Set<string>();

  private reconnectDelay = BASE_RECONNECT_DELAY;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  /** True once anyone subscribes; false after the last unsubscribe. Guards
   *  against reconnect loops running with no consumers, and against a stray
   *  onclose scheduling a reconnect after we intentionally shut down. */
  private wantConnection = false;
  /** Last seen sequence number per "symbol|market" stream, for gap detection. */
  private lastSeq = new Map<string, number>();
  private onlineHandlerBound = false;

  private status: WSStatus = "closed";

  private setStatus(s: WSStatus) {
    if (this.status === s) return;
    this.status = s;
    this.statusListeners.forEach((l) => l(s));
  }

  getStatus(): WSStatus {
    return this.status;
  }

  private connect() {
    // Only one live/pending socket at a time, and only when wanted.
    if (!this.wantConnection) return;
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    // Don't dial into a known-offline network; the online handler will redial.
    if (typeof navigator !== "undefined" && navigator.onLine === false) {
      this.setStatus("closed");
      this.bindOnline();
      return;
    }

    this.setStatus("connecting");
    // ?token= identifies this connection's account to the engine (see
    // internal/wsauth), so events belonging to this user's own account
    // arrive with a real accountId instead of the redacted "" everyone else
    // gets — see hub.go's broadcast. Omitted entirely when not logged in or
    // the token isn't available (e.g. after a page reload — the token lives
    // only in memory, see wsAuthToken.ts) rather than sent as empty, since
    // the engine treats a missing/invalid token as "unauthenticated" either
    // way and there's no reason to leak that a connection attempted auth.
    const token = getWsAuthToken();
    const url = token ? `${WS_URL}?token=${encodeURIComponent(token)}` : WS_URL;
    let socket: WebSocket;
    try {
      socket = new WebSocket(url);
    } catch {
      this.scheduleReconnect();
      return;
    }
    this.socket = socket;

    socket.onopen = () => {
      // Ownership guard: a stale socket's handler must not touch shared state.
      if (this.socket !== socket) {
        socket.close();
        return;
      }
      this.reconnectDelay = BASE_RECONNECT_DELAY; // reset backoff on success
      // Subscription state lives server-side per connection, so every fresh
      // socket must re-declare what this tab wants.
      this.sendWants(socket);
      this.setStatus("open");
    };

    socket.onmessage = (e) => {
      if (this.socket !== socket) return;
      let evt: WSEvent;
      try {
        evt = JSON.parse(e.data);
      } catch {
        return; // ignore malformed frame
      }
      if (evt.type === "TICKER" && Array.isArray(evt.tickers)) {
        // Periodic snapshot frame: merge into the shared store and notify.
        // Deliberately NOT sequence-checked — it carries no per-symbol
        // sequence number, and a late frame is still fresh market data.
        for (const t of evt.tickers) {
          if (t.symbol && t.market) this.tickers.set(`${t.symbol}|${t.market}`, t);
        }
        this.tickListeners.forEach((l) => l(this.tickers));
        return;
      }
      // checkSequence's own comment always described dropping a stale/
      // duplicate event from delivery ("don't deliver a rewind") — but this
      // call site never actually gated delivery on its return value, so
      // that never happened in practice; every stale/duplicate frame was
      // delivered to listeners anyway. Not the cause of the out-of-band
      // sequence bug above (that was about lastSeq bookkeeping making
      // LATER, valid events look stale — this fixes an unrelated pre-
      // existing gap between this function's stated contract and what the
      // caller actually did with it), but worth closing now that
      // checkSequence's return value means something real.
      if (!this.checkSequence(evt)) return;
      this.listeners.forEach((l) => l(evt));
    };

    socket.onerror = () => {
      // Let onclose drive reconnection; just ensure the socket tears down.
      try {
        socket.close();
      } catch {
        /* noop */
      }
    };

    socket.onclose = () => {
      if (this.socket === socket) this.socket = null;
      this.setStatus("closed");
      // Sequence tracking is per-connection: after a drop we can't assume the
      // next stream continues our old numbering, and consumers were told to
      // resync via the gap signal below.
      this.emitGapForAll();
      this.lastSeq.clear();
      if (this.wantConnection) this.scheduleReconnect();
    };
  }

  // Returns false when the event should be dropped (stale/duplicate); the
  // caller still dispatches to listeners in every other case, including
  // out-of-band events, which this function never drops — it only decides
  // whether to update lastSeq / fire a gap for the per-symbol book stream.
  private checkSequence(evt: WSEvent): boolean {
    if (typeof evt.sequenceNumber !== "number" || !evt.symbol) return true;
    // Out-of-band events (see OUT_OF_BAND_SEQ_THRESHOLD's doc comment) don't
    // belong to this symbol's book-sequenced stream at all — never compare
    // them against lastSeq (they have no earlier/later relationship to it)
    // and never let them advance/pollute it, or every later real book event
    // for this symbol would look "stale" and be dropped forever.
    if (evt.sequenceNumber >= OUT_OF_BAND_SEQ_THRESHOLD) return true;
    const key = `${evt.symbol}|${evt.market}`;
    const prev = this.lastSeq.get(key);
    if (prev !== undefined) {
      if (evt.sequenceNumber <= prev) {
        // Stale or duplicate: drop it (don't advance, don't deliver a rewind).
        return false;
      }
      if (evt.sequenceNumber > prev + 1) {
        // Gap: we missed events. Advance to current and tell consumers to
        // refetch authoritative state for this stream.
        this.lastSeq.set(key, evt.sequenceNumber);
        this.gapListeners.forEach((l) => l(key));
        return true;
      }
    }
    this.lastSeq.set(key, evt.sequenceNumber);
    return true;
  }

  private emitGapForAll() {
    for (const key of this.lastSeq.keys()) {
      this.gapListeners.forEach((l) => l(key));
    }
  }

  private scheduleReconnect() {
    if (this.reconnectTimer || !this.wantConnection) return;
    const delay = this.reconnectDelay;
    // Exponential backoff with jitter, capped, so a downed server doesn't get
    // hammered by a thundering herd of reconnects.
    const jittered = delay + Math.floor(Math.random() * 250);
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      this.reconnectDelay = Math.min(this.reconnectDelay * 2, MAX_RECONNECT_DELAY);
      this.connect();
    }, jittered);
  }

  private bindOnline() {
    if (this.onlineHandlerBound || typeof window === "undefined") return;
    this.onlineHandlerBound = true;
    window.addEventListener("online", () => {
      // Coming back online: reset backoff and redial immediately if wanted.
      this.reconnectDelay = BASE_RECONNECT_DELAY;
      if (this.wantConnection) this.connect();
    });
  }

  subscribe(listener: Listener) {
    this.wantConnection = true;
    this.bindOnline();
    this.listeners.add(listener);
    this.connect();
    return () => {
      this.listeners.delete(listener);
      this.maybeShutdown();
    };
  }

  /** Declare interest in additional "symbol|market" streams so the hub can
   *  stop broadcasting every market's churn to this connection. Fire-and-
   *  forget and additive-only: a failed/lost control frame degrades to the
   *  old full-broadcast behavior, and hooks re-declare on every reconnect
   *  via onopen. Calling with already-wanted streams is a no-op. */
  wantStreams(streams: string[]) {
    let added = false;
    for (const s of streams) {
      const key = s.toUpperCase();
      if (key && !this.wantedStreams.has(key)) {
        this.wantedStreams.add(key);
        added = true;
      }
    }
    if (added && this.socket && this.socket.readyState === WebSocket.OPEN) {
      this.sendWants(this.socket);
    }
  }

  /** Tell the engine which streams this connection wants. Fire-and-forget:
   *  worst case the server keeps sending unfiltered frames and hooks filter
   *  locally, exactly as they did before this protocol existed. */
  private sendWants(socket: WebSocket) {
    if (this.wantedStreams.size === 0) return;
    try {
      const frame: ServerSubscribeFrame = { action: "subscribe", streams: Array.from(this.wantedStreams) };
      socket.send(JSON.stringify(frame));
    } catch {
      /* a failed control frame must never break the socket */
    }
  }

  /** Latest ticker snapshot per "symbol|market" (may be empty before the
   *  first TICKER frame arrives). */
  getTickers(): Map<string, WSTicker> {
    return this.tickers;
  }

  /** Subscribe to 1s all-symbols ticker snapshots. The listener fires
   *  immediately with the current store, then on every TICKER frame. */
  subscribeTickers(listener: (tickers: Map<string, WSTicker>) => void) {
    this.wantConnection = true;
    this.bindOnline();
    this.tickListeners.add(listener);
    this.connect();
    listener(this.tickers);
    return () => {
      this.tickListeners.delete(listener);
      this.maybeShutdown();
    };
  }

  /** Subscribe to sequence-gap notifications (stream needs a resync). */
  onGap(listener: GapListener) {
    this.gapListeners.add(listener);
    // Set.delete returns boolean; the unsubscribe function is handed
    // straight to React effects as their cleanup return value, which must
    // be void — wrapped in a block body so nothing is returned.
    return () => { this.gapListeners.delete(listener); };
  }

  /** Subscribe to connection status changes. */
  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => { this.statusListeners.delete(listener); };
  }

  /** Tear the connection down once nothing is listening, so an unmounted app
   *  doesn't keep a socket (and reconnect loop) alive forever. */
  private maybeShutdown() {
    if (this.listeners.size > 0 || this.tickListeners.size > 0) return;
    this.wantConnection = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectDelay = BASE_RECONNECT_DELAY;
    this.lastSeq.clear();
    this.wantedStreams.clear();
    if (this.socket) {
      const s = this.socket;
      this.socket = null;
      try {
        s.close();
      } catch {
        /* noop */
      }
    }
    this.setStatus("closed");
  }
}

export const wsClient = new WSClient();
