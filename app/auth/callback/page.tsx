"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finishing sign in...");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();
      const url = new URL(window.location.href);

      const next = url.searchParams.get("next") || "/app";

      const oauthError = url.searchParams.get("error_description") || url.searchParams.get("error");
      if (oauthError) {
        setMsg(decodeURIComponent(oauthError));
        return;
      }

      const code = url.searchParams.get("code");

      // If there's no code, we might already be signed in (refresh/back)
      if (!code) {
        const { data } = await supabase.auth.getSession();
        if (data?.session) {
          window.location.replace(next);
          return;
        }
        setMsg("Missing OAuth code in callback URL. Try signing in again.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);
      if (error) {
        setMsg(error.message);
        return;
      }

      window.location.replace(next);
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <p>{msg}</p>
    </main>
  );
}
