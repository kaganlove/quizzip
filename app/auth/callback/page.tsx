"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finishing sign in...");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      // Google returns an OAuth "code" in the query string
      const url = new URL(window.location.href);

      // If Google/Supabase sent back an error, show it
      const oauthError =
        url.searchParams.get("error_description") ||
        url.searchParams.get("error");

      if (oauthError) {
        setMsg(decodeURIComponent(oauthError));
        return;
      }

      const code = url.searchParams.get("code");

      if (!code) {
        setMsg("Missing OAuth code in callback URL. Try signing in again.");
        return;
      }

      const { error } = await supabase.auth.exchangeCodeForSession(code);

      if (error) {
        setMsg(error.message);
        return;
      }

      window.location.replace("/");
    };

    run();
  }, []);

  return (
    <main style={{ padding: 24 }}>
      <p>{msg}</p>
    </main>
  );
}
