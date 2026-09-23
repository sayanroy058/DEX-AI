import { PREDICTION_WS_URL, type PredictionTick } from "./predictionApi";

type Listener = (tick: PredictionTick) => void;

// Reconnecting WS client for the prediction-service's live tick stream.
// Modeled on wsClient.ts's backoff pattern but scoped to this one feature —
// the prediction service broadcasts every tick to every client (no
// per-stream subscription protocol like the matching-engine hub), so this
// stays much simpler than wsClient.ts.
class PredictionWSClient {
  private socket: WebSocket | null = null;
  private listeners = new Set<Listener>();
  private reconnectAttempt = 0;
  private reconnectTimer: ReturnType<typeof setTimeout> | null = null;
  private closedByUser = false;

  private ensureConnected() {
    if (this.socket && (this.socket.readyState === WebSocket.OPEN || this.socket.readyState === WebSocket.CONNECTING)) {
      return;
    }
    this.closedByUser = false;
    const socket = new WebSocket(PREDICTION_WS_URL);
    this.socket = socket;

    socket.onopen = () => {
      this.reconnectAttempt = 0;
    };
    socket.onmessage = (event) => {
      try {
        const tick = JSON.parse(event.data as string) as PredictionTick;
        if (tick?.type === "tick") {
          this.listeners.forEach((listener) => listener(tick));
        }
      } catch {
        /* ignore malformed frame */
      }
    };
    socket.onclose = () => {
      if (this.closedByUser) return;
      this.scheduleReconnect();
    };
    socket.onerror = () => {
      socket.close();
    };
  }

  private scheduleReconnect() {
    if (this.reconnectTimer) return;
    const delay = Math.min(1000 * 2 ** this.reconnectAttempt, 15000) + Math.random() * 300;
    this.reconnectAttempt += 1;
    this.reconnectTimer = setTimeout(() => {
      this.reconnectTimer = null;
      if (this.listeners.size > 0) this.ensureConnected();
    }, delay);
  }

  subscribe(listener: Listener): () => void {
    this.listeners.add(listener);
    this.ensureConnected();
    return () => {
      this.listeners.delete(listener);
      if (this.listeners.size === 0) {
        this.closedByUser = true;
        this.socket?.close();
        this.socket = null;
        if (this.reconnectTimer) {
          clearTimeout(this.reconnectTimer);
          this.reconnectTimer = null;
        }
      }
    };
  }
}

export const predictionWsClient = new PredictionWSClient();
