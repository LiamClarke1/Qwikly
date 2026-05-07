"use client";

// T3.10 — root-level error boundary. Next.js renders this when an error
// escapes the (app) and (landing) segments (or is thrown in the root layout
// itself). Mirrors the (app)/error.tsx pattern but ships its own <html> and
// <body> because it replaces the root layout. Adds a Reload button so users
// have a clear way to recover from a bad render.

export default function GlobalError({
  error,
  reset,
}: {
  error: Error & { digest?: string };
  reset: () => void;
}) {
  return (
    <html>
      <body>
        <div
          style={{
            minHeight: "100vh",
            display: "flex",
            alignItems: "center",
            justifyContent: "center",
            backgroundColor: "#111827",
            fontFamily:
              "system-ui, -apple-system, BlinkMacSystemFont, 'Segoe UI', Roboto, sans-serif",
            padding: "1rem",
          }}
        >
          <div
            style={{
              backgroundColor: "#1f2937",
              border: "1px solid rgba(255,255,255,0.08)",
              borderRadius: "1rem",
              padding: "2rem",
              maxWidth: "28rem",
              width: "100%",
              textAlign: "center",
              boxShadow: "0 20px 25px -5px rgba(0,0,0,0.3)",
            }}
          >
            <h2
              style={{
                fontSize: "1.125rem",
                fontWeight: 600,
                color: "white",
                marginBottom: "0.5rem",
              }}
            >
              Something went wrong
            </h2>
            <p
              style={{
                fontSize: "0.875rem",
                color: "#94a3b8",
                marginBottom: "1.5rem",
              }}
            >
              {error.message ||
                "An unexpected error occurred. Please try reloading."}
            </p>
            <div style={{ display: "flex", gap: "0.5rem", justifyContent: "center" }}>
              <button
                type="button"
                onClick={reset}
                style={{
                  padding: "0.625rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "#E85A2C",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "none",
                  cursor: "pointer",
                }}
              >
                Try again
              </button>
              <button
                type="button"
                onClick={() => {
                  if (typeof window !== "undefined") window.location.reload();
                }}
                style={{
                  padding: "0.625rem 1rem",
                  borderRadius: "0.5rem",
                  backgroundColor: "transparent",
                  color: "white",
                  fontSize: "0.875rem",
                  fontWeight: 500,
                  border: "1px solid rgba(255,255,255,0.2)",
                  cursor: "pointer",
                }}
              >
                Reload
              </button>
            </div>
          </div>
        </div>
      </body>
    </html>
  );
}
