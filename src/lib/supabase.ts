import { createBrowserClient } from "@supabase/ssr";

type BrowserClient = ReturnType<typeof createBrowserClient>;

let _supabase: BrowserClient | null = null;

function getInstance(): BrowserClient {
  if (!_supabase) {
    _supabase = createBrowserClient(
      process.env.NEXT_PUBLIC_SUPABASE_URL!,
      process.env.NEXT_PUBLIC_SUPABASE_ANON_KEY!
    );
  }
  return _supabase;
}

export const supabase = new Proxy({} as BrowserClient, {
  get(_t, prop) {
    return getInstance()[prop as keyof BrowserClient];
  },
});
