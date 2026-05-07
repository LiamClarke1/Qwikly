"use client";

import { useEffect, useState } from "react";
import { supabase } from "./supabase";
import type { AuthChangeEvent, Session, User } from "@supabase/supabase-js";

export function useUser() {
  const [user, setUser] = useState<User | null>(null);

  useEffect(() => {
    supabase.auth.getSession().then(({ data }: { data: { session: Session | null } }) => {
      setUser(data.session?.user ?? null);
    });
    const { data: { subscription } } = supabase.auth.onAuthStateChange(
      (_event: AuthChangeEvent, session: Session | null) => {
        setUser(session?.user ?? null);
      }
    );
    return () => subscription.unsubscribe();
  }, []);

  const displayName: string =
    user?.user_metadata?.full_name ??
    user?.user_metadata?.name ??
    "";

  const firstName = displayName.split(" ")[0] || "";

  return { user, displayName, firstName };
}
