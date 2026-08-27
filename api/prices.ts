// Server-side proxy for the hosted price-fetcher's /healthz endpoint.
// price-fetcher itself sends no Access-Control-Allow-Origin header, so
// browsers block direct fetches to it with a CORS error; this Vercel
// function fetches it server-side (no CORS involved) and re-serves the
// same JSON with permissive CORS headers for our own frontend.
export default async function handler(req: Request): Promise<Response> {
  try {
    const upstream = await fetch("https://price-fetcher-api.onrender.com/healthz", {
      // Render free-tier instances can cold-start; give it real headroom.
      signal: AbortSignal.timeout(15000),
    });
    const body = await upstream.text();
    return new Response(body, {
      status: upstream.status,
      headers: {
        "content-type": "application/json",
        "access-control-allow-origin": "*",
        "cache-control": "no-store",
      },
    });
  } catch (err) {
    return new Response(
      JSON.stringify({ ok: false, error: err instanceof Error ? err.message : "fetch failed" }),
      {
        status: 502,
        headers: {
          "content-type": "application/json",
          "access-control-allow-origin": "*",
        },
      }
    );
  }
}

export const config = { runtime: "edge" };
