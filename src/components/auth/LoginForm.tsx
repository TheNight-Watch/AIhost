"use client";

import { useState } from "react";
import { useRouter } from "next/navigation";
import { createClient } from "@/lib/supabase/client";
import type { Locale } from "@/types";

interface Props {
  locale: Locale;
  initialMode?: "login" | "register";
}

export default function LoginForm({ locale, initialMode = "login" }: Props) {
  const router = useRouter();
  const [mode, setMode] = useState<"login" | "register">(initialMode);
  const [name, setName] = useState("");
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [confirm, setConfirm] = useState("");
  const [errors, setErrors] = useState<Record<string, string>>({});
  const [status, setStatus] = useState<{ msg: string; type: "success" | "error" } | null>(null);
  const [loading, setLoading] = useState(false);

  function validate(): boolean {
    const newErrors: Record<string, string> = {};

    if (mode === "register" && !name.trim()) {
      newErrors.name = "ERROR: Username is required";
    }
    if (!email || !/^[^\s@]+@[^\s@]+\.[^\s@]+$/.test(email)) {
      newErrors.email = "ERROR: Invalid email format";
    }
    if (!password || password.length < 6) {
      newErrors.password = "ERROR: Min 6 characters required";
    }
    if (mode === "register") {
      if (!confirm) newErrors.confirm = "ERROR: Please confirm password";
      else if (confirm !== password) newErrors.confirm = "ERROR: Passwords do not match";
    }

    setErrors(newErrors);
    return Object.keys(newErrors).length === 0;
  }

  async function handleSubmit(e: React.FormEvent) {
    e.preventDefault();
    setStatus(null);
    if (!validate()) return;

    setLoading(true);
    try {
      const supabase = createClient();

      if (mode === "login") {
        const { error } = await supabase.auth.signInWithPassword({ email, password });
        if (error) {
          setStatus({ msg: error.message.includes("Invalid") ? "ACCESS DENIED. Check credentials." : error.message, type: "error" });
          return;
        }
        setStatus({ msg: "ACCESS GRANTED. Redirecting to dashboard...", type: "success" });
        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
          router.refresh();
        }, 1000);
      } else {
        const { error } = await supabase.auth.signUp({ email, password });
        if (error) {
          setStatus({ msg: error.message, type: "error" });
          return;
        }
        setStatus({ msg: "ACCOUNT CREATED. Redirecting...", type: "success" });
        setTimeout(() => {
          router.push(`/${locale}/dashboard`);
          router.refresh();
        }, 1200);
      }
    } catch {
      setStatus({ msg: "Cannot connect to server.", type: "error" });
    } finally {
      setLoading(false);
    }
  }

  const inputStyle = (hasError: boolean): React.CSSProperties => ({
    width: "100%",
    padding: "12px 14px",
    fontFamily: "var(--font-mono)",
    fontSize: "13px",
    background: "#fff",
    border: hasError ? "2px dashed #FF6B6B" : "2px solid #333",
    borderRadius: "10px",
    color: "#333",
    outline: "none",
    transition: "all 0.2s",
  });

  return (
    <main
      style={{
        minHeight: "100vh",
        display: "flex",
        alignItems: "center",
        justifyContent: "center",
        position: "relative",
        overflow: "hidden",
        background: "#FFF8E7",
        fontFamily: "var(--font-mono)",
      }}
    >
      {/* Grid background */}
      <div
        style={{
          position: "fixed",
          inset: 0,
          pointerEvents: "none",
          zIndex: 0,
          backgroundImage: "linear-gradient(rgba(45,106,92,0.06) 1px, transparent 1px), linear-gradient(90deg, rgba(45,106,92,0.06) 1px, transparent 1px)",
          backgroundSize: "32px 32px",
        }}
      />

      <div style={{ position: "relative", zIndex: 10, width: "100%", maxWidth: 460, padding: "0 20px" }}>
        {/* Logo */}
        <div style={{ textAlign: "center", marginBottom: 32 }}>
          <img src="/logo.png" alt="AI Host" style={{ width: 72, height: 72, borderRadius: 16, marginBottom: 16 }} />
          <div style={{ fontFamily: "var(--font-serif)", fontSize: 36, color: "#2D6A5C" }}>AI Host</div>
          <div style={{ fontSize: 11, letterSpacing: "0.15em", textTransform: "uppercase", marginTop: 4, color: "#999" }}>
            Intelligent Event Hosting Platform
            <span style={{ display: "inline-block", width: 8, height: 14, marginLeft: 4, verticalAlign: "middle", background: "#2D6A5C", animation: "blink 1s infinite" }} />
          </div>
        </div>

        {/* Window */}
        <div style={{ border: "2px solid #333", borderRadius: 14, overflow: "hidden", background: "#FFF8E7", boxShadow: "6px 6px 0px rgba(45,106,92,0.15)" }}>
          {/* Window bar */}
          <div
            style={{
              display: "flex",
              alignItems: "center",
              gap: 8,
              padding: "0 12px",
              height: 36,
              borderBottom: "2px solid #333",
              background: "#E8E0D0",
            }}
          >
            <div style={{ display: "flex", gap: 6 }}>
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #333", background: "#FF6B6B" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #333", background: "#FFDA6B" }} />
              <div style={{ width: 10, height: 10, borderRadius: "50%", border: "1.5px solid #333", background: "#6BD4AF" }} />
            </div>
            <span style={{ flex: 1, textAlign: "center", fontSize: 11, fontWeight: 600, letterSpacing: "0.08em", textTransform: "uppercase", color: "#333" }}>
              AI_HOST // {mode === "login" ? "LOGIN" : "REGISTER"}
            </span>
          </div>

          <div style={{ padding: 32 }}>
            {/* Tab switcher */}
            <div style={{ display: "flex", borderBottom: "2px dashed #ddd", marginBottom: 28 }}>
              {(["login", "register"] as const).map((tab) => (
                <button
                  key={tab}
                  onClick={() => { setMode(tab); setErrors({}); setStatus(null); }}
                  style={{
                    flex: 1,
                    padding: "12px 0",
                    fontSize: 12,
                    fontWeight: 700,
                    letterSpacing: "0.08em",
                    textTransform: "uppercase",
                    border: "none",
                    background: "transparent",
                    cursor: "pointer",
                    transition: "all 0.2s",
                    color: mode === tab ? "#2D6A5C" : "#999",
                    fontFamily: "var(--font-mono)",
                    position: "relative",
                  }}
                >
                  {tab.charAt(0).toUpperCase() + tab.slice(1)}
                  {mode === tab && (
                    <span style={{ position: "absolute", bottom: -2, left: "10%", width: "80%", height: 3, borderRadius: 2, background: "#98E4C9" }} />
                  )}
                </button>
              ))}
            </div>

            {/* Pixel divider */}
            <div style={{ display: "flex", gap: 4, justifyContent: "center", marginBottom: 28 }}>
              {["#98E4C9","#FFD4B8","#2D6A5C","#FFF8E7","#98E4C9","#FFD4B8","#2D6A5C","#98E4C9","#FFD4B8","#FFF8E7","#2D6A5C","#98E4C9","#FFD4B8","#98E4C9","#2D6A5C","#FFD4B8"].map((c, i) => (
                <div key={i} style={{ width: 6, height: 6, borderRadius: 2, background: c, opacity: 0.6 }} />
              ))}
            </div>

            <form onSubmit={handleSubmit}>
              <div style={{ display: "flex", flexDirection: "column", gap: 20 }}>
                {mode === "register" && (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, color: "#2D6A5C" }}>
                      Name // username
                    </label>
                    <input
                      type="text"
                      value={name}
                      onChange={(e) => setName(e.target.value)}
                      placeholder="your_name_here"
                      style={inputStyle(!!errors.name)}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = errors.name ? "#FF6B6B" : "#333"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    {errors.name && <p style={{ fontSize: 11, marginTop: 4, color: "#FF6B6B" }}>&gt; {errors.name}</p>}
                  </div>
                )}

                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, color: "#2D6A5C" }}>
                    Email // address
                  </label>
                  <input
                    type="email"
                    value={email}
                    onChange={(e) => setEmail(e.target.value)}
                    placeholder="user@example.com"
                    autoComplete="email"
                    style={inputStyle(!!errors.email)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = errors.email ? "#FF6B6B" : "#333"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  {errors.email && <p style={{ fontSize: 11, marginTop: 4, color: "#FF6B6B" }}>&gt; {errors.email}</p>}
                </div>

                <div>
                  <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, color: "#2D6A5C" }}>
                    Password // access_key
                  </label>
                  <input
                    type="password"
                    value={password}
                    onChange={(e) => setPassword(e.target.value)}
                    placeholder="********"
                    autoComplete={mode === "login" ? "current-password" : "new-password"}
                    style={inputStyle(!!errors.password)}
                    onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                    onBlur={(e) => { e.currentTarget.style.borderColor = errors.password ? "#FF6B6B" : "#333"; e.currentTarget.style.boxShadow = "none"; }}
                  />
                  {errors.password && <p style={{ fontSize: 11, marginTop: 4, color: "#FF6B6B" }}>&gt; {errors.password}</p>}
                </div>

                {mode === "register" && (
                  <div>
                    <label style={{ display: "block", fontSize: 10, fontWeight: 700, letterSpacing: "0.1em", textTransform: "uppercase", marginBottom: 8, color: "#2D6A5C" }}>
                      Confirm // verify_key
                    </label>
                    <input
                      type="password"
                      value={confirm}
                      onChange={(e) => setConfirm(e.target.value)}
                      placeholder="********"
                      autoComplete="new-password"
                      style={inputStyle(!!errors.confirm)}
                      onFocus={(e) => { e.currentTarget.style.borderColor = "#2D6A5C"; e.currentTarget.style.borderStyle = "solid"; e.currentTarget.style.boxShadow = "0 0 0 3px rgba(152,228,201,0.3)"; }}
                      onBlur={(e) => { e.currentTarget.style.borderColor = errors.confirm ? "#FF6B6B" : "#333"; e.currentTarget.style.boxShadow = "none"; }}
                    />
                    {errors.confirm && <p style={{ fontSize: 11, marginTop: 4, color: "#FF6B6B" }}>&gt; {errors.confirm}</p>}
                  </div>
                )}
              </div>

              <button
                type="submit"
                disabled={loading}
                style={{
                  width: "100%",
                  padding: "14px 24px",
                  fontFamily: "var(--font-mono)",
                  fontSize: 14,
                  fontWeight: 700,
                  letterSpacing: "0.1em",
                  textTransform: "uppercase",
                  background: "#98E4C9",
                  color: "#2D6A5C",
                  border: "2px solid #333",
                  borderRadius: 10,
                  cursor: loading ? "not-allowed" : "pointer",
                  transition: "all 0.15s",
                  boxShadow: "0 4px 0 #2D6A5C, 0 6px 0 #333",
                  position: "relative",
                  top: 0,
                  marginTop: 16,
                  opacity: loading ? 0.7 : 1,
                }}
              >
                {loading ? "PROCESSING..." : mode === "login" ? "LOGIN" : "REGISTER"}
              </button>
            </form>

            <div style={{ display: "flex", alignItems: "center", gap: 12, margin: "24px 0", fontSize: 10, letterSpacing: "0.1em", textTransform: "uppercase", color: "#aaa" }}>
              <span style={{ flex: 1, borderTop: "2px dashed #ddd" }} />
              or
              <span style={{ flex: 1, borderTop: "2px dashed #ddd" }} />
            </div>

            <div style={{ textAlign: "center", fontSize: 12, color: "#888" }}>
              {mode === "login" ? (
                <>Don&apos;t have an account?{" "}
                  <button
                    onClick={() => setMode("register")}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, borderBottom: "2px dashed #98E4C9", color: "#2D6A5C", fontFamily: "var(--font-mono)", fontSize: 12 }}
                  >
                    Register
                  </button>
                </>
              ) : (
                <>Already have an account?{" "}
                  <button
                    onClick={() => setMode("login")}
                    style={{ border: "none", background: "transparent", cursor: "pointer", fontWeight: 600, borderBottom: "2px dashed #98E4C9", color: "#2D6A5C", fontFamily: "var(--font-mono)", fontSize: 12 }}
                  >
                    Login
                  </button>
                </>
              )}
            </div>

            {status && (
              <div
                style={{
                  marginTop: 16,
                  padding: 10,
                  borderRadius: 8,
                  textAlign: "center",
                  fontSize: 11,
                  background: status.type === "success" ? "#C8F0E2" : "#FFE0E0",
                  color: status.type === "success" ? "#2D6A5C" : "#CC4444",
                  border: status.type === "success" ? "2px solid #6BD4AF" : "2px dashed #FF6B6B",
                }}
              >
                {status.msg}
              </div>
            )}
          </div>
        </div>

        <div style={{ textAlign: "center", fontSize: 9, letterSpacing: "0.1em", textTransform: "uppercase", marginTop: 20, color: "#bbb" }}>
          SYS.HOST.V2 // Retro Edition // 2026
        </div>
      </div>
    </main>
  );
}
