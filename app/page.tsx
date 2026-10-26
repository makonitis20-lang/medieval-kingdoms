"use client";

import { useEffect, useState } from "react";
import type { FormEvent, CSSProperties } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Screen = "home" | "login" | "register";

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [user, setUser] = useState<User | null>(null);
  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);

  useEffect(() => {
    supabase.auth.getUser().then(({ data, error }) => {
      setUser(data.user);
      if (error) setMessage(error.message);
      setChecking(false);
    });

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        setUser(session?.user ?? null);
      }
    );

    return () => {
      listener.subscription.unsubscribe();
    };
  }, []);

  async function handleAuth(e: FormEvent<HTMLFormElement>) {
    e.preventDefault();
    setLoading(true);
    setMessage("");

    try {
      if (screen === "register") {
        const { data, error } = await supabase.auth.signUp({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        if (data.session) {
          setScreen("home");
          setMessage("Account created successfully!");
        } else {
          setMessage(
            "Check your email to confirm your account, then log in."
          );
        }
      } else {
        const { error } = await supabase.auth.signInWithPassword({
          email: email.trim(),
          password,
        });

        if (error) throw error;

        setScreen("home");
        setMessage("Welcome back to Medieval Kingdoms!");
      }

      setPassword("");
    } catch (err) {
      setMessage(
        err instanceof Error ? err.message : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function handleLogout() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setUser(null);
      setScreen("home");
      setMessage("You have logged out.");
    }

    setLoading(false);
  }

  function changeScreen(next: Screen) {
    setScreen(next);
    setMessage("");
    setPassword("");
  }

  return (
    <main
      style={{
        minHeight: "100vh",
        background:
          "radial-gradient(ellipse at center, #23362a 0%, #101a16 70%)",
        color: "#f4e5c6",
        fontFamily: "Georgia, serif",
        display: "flex",
        justifyContent: "center",
        alignItems: "center",
        padding: 24,
        boxSizing: "border-box",
      }}
    >
      <div
        style={{
          width: "100%",
          maxWidth: 650,
          textAlign: "center",
        }}
      >
        <div style={{ fontSize: 62, marginBottom: 12 }}>♛</div>

        <div
          style={{
            color: "#c6a76d",
            letterSpacing: 5,
            fontSize: 12,
          }}
        >
          THE AGE OF KINGDOMS
        </div>

        <h1
          style={{
            fontSize: "clamp(42px, 8vw, 76px)",
            lineHeight: 1.1,
            margin: "20px 0",
            textShadow: "0 4px 20px #000",
          }}
        >
          Medieval
          <br />
          Kingdoms
        </h1>

        <p
          style={{
            color: "#c6a76d",
            fontSize: 17,
            marginBottom: 36,
          }}
        >
          Build your kingdom. Command your armies. Conquer the world.
        </p>

        {checking ? (
          <p>Checking your account...</p>
        ) : user ? (
          <div style={panelStyle}>
            <h2 style={{ color: "#e0bd79" }}>
              Welcome, Ruler!
            </h2>

            <p style={{ overflowWrap: "anywhere" }}>
              {user.email}
            </p>

            <p style={{ color: "#aab8a8" }}>
              Your account is ready. Kingdoms and seasons are
              coming next.
            </p>

            <button
              style={{
                ...buttonGold,
                width: "100%",
                marginTop: 16,
              }}
              onClick={() =>
                setMessage("The kingdom system is coming next!")
              }
            >
              ⚔ Play Game
            </button>

            <button
              style={{
                ...buttonDark,
                width: "100%",
                marginTop: 12,
              }}
              disabled={loading}
              onClick={handleLogout}
            >
              Logout
            </button>
          </div>
        ) : screen === "home" ? (
          <div
            style={{
              display: "grid",
              gap: 14,
              maxWidth: 330,
              margin: "auto",
            }}
          >
            <button
              onClick={() => changeScreen("login")}
              style={buttonGold}
            >
              ⚔ Play Game
            </button>

            <button
              onClick={() => changeScreen("login")}
              style={buttonDark}
            >
              Login
            </button>

            <button
              onClick={() => changeScreen("register")}
              style={buttonDark}
            >
              Create Account
            </button>
          </div>
        ) : (
          <div style={panelStyle}>
            <h2>
              {screen === "login" ? "Login" : "Create Account"}
            </h2>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(e) => setEmail(e.target.value)}
                style={inputStyle}
              />

              <input
                type="password"
                required
                minLength={6}
                autoComplete={
                  screen === "register"
                    ? "new-password"
                    : "current-password"
                }
                placeholder="Password"
                value={password}
                onChange={(e) => setPassword(e.target.value)}
                style={inputStyle}
              />

              <button
                type="submit"
                disabled={loading}
                style={{
                  ...buttonGold,
                  width: "100%",
                  marginTop: 16,
                }}
              >
                {loading
                  ? "Please wait..."
                  : screen === "login"
                  ? "Login"
                  : "Register"}
              </button>
            </form>

            <button
              onClick={() => changeScreen("home")}
              style={{
                ...buttonDark,
                width: "100%",
                marginTop: 12,
              }}
            >
              ← Back
            </button>
          </div>
        )}

        {message && (
          <p
            role="status"
            style={{
              color: "#e0bd79",
              marginTop: 24,
              overflowWrap: "anywhere",
            }}
          >
            {message}
          </p>
        )}

        <p
          style={{
            color: "#748476",
            fontSize: 12,
            marginTop: 55,
          }}
        >
          MULTIPLAYER GRAND STRATEGY · MEDIEVAL KINGDOMS
        </p>
      </div>
    </main>
  );
}

const panelStyle: CSSProperties = {
  maxWidth: 360,
  margin: "auto",
  padding: 25,
  border: "1px solid #78613b",
  background: "#101a16dd",
  borderRadius: 12,
};

const buttonGold: CSSProperties = {
  background: "linear-gradient(135deg, #e0bd79, #a77935)",
  border: "1px solid #e9ce91",
  color: "#211b12",
  padding: "16px 24px",
  fontFamily: "Georgia, serif",
  fontSize: 18,
  fontWeight: "bold",
  cursor: "pointer",
  borderRadius: 6,
};

const buttonDark: CSSProperties = {
  background: "#19271f",
  border: "1px solid #8d7347",
  color: "#f4e5c6",
  padding: "15px 24px",
  fontFamily: "Georgia, serif",
  fontSize: 17,
  cursor: "pointer",
  borderRadius: 6,
};

const inputStyle: CSSProperties = {
  width: "100%",
  boxSizing: "border-box",
  padding: 14,
  marginTop: 12,
  background: "#1b2a22",
  border: "1px solid #78613b",
  borderRadius: 6,
  color: "#fff",
  fontSize: 16,
};
