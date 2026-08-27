export type WSOrder = { id: string; status: string; filled: string };
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

export type WSEvent = {
  type: string; // ORDER_OPEN | ORDER_PARTIALLY_FILLED | ORDER_FILLED | ORDER_CANCELLED | ORDER_REJECTED | TRADE | FUNDING | LIQUIDATION | ...
  symbol: string;
  market: string;
  sequenceNumber: number;
  order?: WSOrder;
  trade?: WSTrade;
  funding?: WSFunding;
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

class WSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private gapListeners = new Set<GapListener>();
  private statusListeners = new Set<StatusListener>();

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
    let socket: WebSocket;
    try {
      socket = new WebSocket(WS_URL);
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
      this.checkSequence(evt);
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

  private checkSequence(evt: WSEvent) {
    if (typeof evt.sequenceNumber !== "number" || !evt.symbol) return;
    const key = `${evt.symbol}|${evt.market}`;
    const prev = this.lastSeq.get(key);
    if (prev !== undefined) {
      if (evt.sequenceNumber <= prev) {
        // Stale or duplicate: drop it (don't advance, don't deliver a rewind).
        return;
      }
      if (evt.sequenceNumber > prev + 1) {
        // Gap: we missed events. Advance to current and tell consumers to
        // refetch authoritative state for this stream.
        this.lastSeq.set(key, evt.sequenceNumber);
        this.gapListeners.forEach((l) => l(key));
        return;
      }
    }
    this.lastSeq.set(key, evt.sequenceNumber);
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

  /** Subscribe to sequence-gap notifications (stream needs a resync). */
  onGap(listener: GapListener) {
    this.gapListeners.add(listener);
    return () => this.gapListeners.delete(listener);
  }

  /** Subscribe to connection status changes. */
  onStatus(listener: StatusListener) {
    this.statusListeners.add(listener);
    listener(this.status);
    return () => this.statusListeners.delete(listener);
  }

  /** Tear the connection down once nothing is listening, so an unmounted app
   *  doesn't keep a socket (and reconnect loop) alive forever. */
  private maybeShutdown() {
    if (this.listeners.size > 0) return;
    this.wantConnection = false;
    if (this.reconnectTimer) {
      clearTimeout(this.reconnectTimer);
      this.reconnectTimer = null;
    }
    this.reconnectDelay = BASE_RECONNECT_DELAY;
    this.lastSeq.clear();
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
