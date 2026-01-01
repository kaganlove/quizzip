"use client";

import { useEffect, useState } from "react";
import { supabaseBrowser } from "../../../lib/supabaseClient";

export default function AuthCallbackPage() {
  const [msg, setMsg] = useState("Finishing sign in...");

  useEffect(() => {
    const run = async () => {
      const supabase = supabaseBrowser();

      const { error } = await supabase.auth.exchangeCodeForSession(window.location.href);

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
