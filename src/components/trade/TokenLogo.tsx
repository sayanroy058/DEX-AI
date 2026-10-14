import { useEffect, useState } from "react";
import { cn } from "@/lib/utils";

// Logos are fetched once, stored as data URLs in localStorage, and reused on
// every later load so refreshes never hit the network. BI2X ships bundled.
const LOCAL_LOGOS: Record<string, string> = { BI2X: "/Bi2X_Logo.png", BI2XUSD: "/Bi2X_Logo.png", TAO: "/Tao_Logo.png" };
// Dark-on-transparent marks need a light disc to stay visible on the dark theme.
const LIGHT_BG = new Set(["TAO"]);
const CDN = (sym: string) =>
  `https://cdn.jsdelivr.net/gh/spothq/cryptocurrency-icons@master/128/color/${sym.toLowerCase()}.png`;
const KEY = (sym: string) => `tokenLogo:v1:${sym.toUpperCase()}`;
const MISSING = "none";

function readCache(sym: string): string | null {
  try { return localStorage.getItem(KEY(sym)); } catch { return null; }
}
function writeCache(sym: string, v: string) {
  try { localStorage.setItem(KEY(sym), v); } catch { /* quota / private mode */ }
}

const inflight = new Map<string, Promise<string>>();
function fetchLogo(sym: string): Promise<string> {
  let p = inflight.get(sym);
  if (!p) {
    p = fetch(CDN(sym))
      .then((r) => (r.ok ? r.blob() : Promise.reject(new Error("no logo"))))
      .then(
        (b) =>
          new Promise<string>((res, rej) => {
            const fr = new FileReader();
            fr.onload = () => res(String(fr.result));
            fr.onerror = () => rej(fr.error);
            fr.readAsDataURL(b);
          }),
      )
      .catch(() => MISSING)
      .then((v) => { writeCache(sym, v); return v; });
    inflight.set(sym, p);
  }
  return p;
}

export function TokenLogo({ symbol, className }: { symbol: string; className?: string }) {
  const sym = symbol.toUpperCase();
  const [src, setSrc] = useState<string | null>(() => LOCAL_LOGOS[sym] ?? readCache(sym));

  useEffect(() => {
    if (LOCAL_LOGOS[sym]) { setSrc(LOCAL_LOGOS[sym]); return; }
    const cached = readCache(sym);
    if (cached) { setSrc(cached); return; }
    setSrc(null);
    let live = true;
    fetchLogo(sym).then((v) => { if (live) setSrc(v); });
    return () => { live = false; };
  }, [sym]);

  if (src && src !== MISSING) {
    return <img src={src} alt={sym} className={cn("h-9 w-9 rounded-full object-cover", LIGHT_BG.has(sym) && "bg-white p-1.5", className)} />;
  }
  return (
    <div className={cn("h-9 w-9 rounded-full bg-gradient-primary flex items-center justify-center font-bold text-xs text-primary-foreground shadow-glow-primary", className)}>
      {sym.slice(0, 3)}
    </div>
  );
}
