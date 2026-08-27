import { useEffect, useState } from "react";
import { getMarkets, MarketMetadata } from "./apiClient";

let cache: MarketMetadata[] | null = null;
let inFlight: Promise<MarketMetadata[]> | null = null;

function loadMarkets() {
  if (cache) return Promise.resolve(cache);
  if (!inFlight) {
    inFlight = getMarkets()
      .then((markets) => {
        cache = markets;
        return markets;
      })
      .finally(() => { inFlight = null; });
  }
  return inFlight;
}

// Metadata is intentionally fetched from the engine rather than copied into
// the browser, so changes to symbol configuration take effect after a refresh.
export function useMarketMetadata(displaySymbol: string): MarketMetadata | null {
  const [metadata, setMetadata] = useState<MarketMetadata | null>(() =>
    cache?.find((market) => market.displaySymbol === displaySymbol) ?? null
  );

  useEffect(() => {
    let cancelled = false;
    void loadMarkets()
      .then((markets) => {
        if (!cancelled) setMetadata(markets.find((market) => market.displaySymbol === displaySymbol) ?? null);
      })
      .catch(() => { if (!cancelled) setMetadata(null); });
    return () => { cancelled = true; };
  }, [displaySymbol]);

  return metadata;
}
