"use client";

import { useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Screen = "home" | "login" | "register";
type Profile = {
  id: string;
  username: string | null;
  created_at: string;
};

export default function Home() {
  const [screen, setScreen] = useState<Screen>("home");
  const [user, setUser] = useState<User | null>(null);
  const [profile, setProfile] = useState<Profile | null>(null);

  const [email, setEmail] = useState("");
  const [password, setPassword] = useState("");
  const [username, setUsername] = useState("");

  const [message, setMessage] = useState("");
  const [loading, setLoading] = useState(false);
  const [checking, setChecking] = useState(true);
  const [editingUsername, setEditingUsername] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error) {
        setMessage(error.message);
      }

      setUser(data.user);
      setChecking(false);
    }

    void loadAccount();

    const { data: listener } = supabase.auth.onAuthStateChange(
      (_event, session) => {
        if (!active) return;

        setUser(session?.user ?? null);

        if (!session?.user) {
          setProfile(null);
          setUsername("");
        }
      }
    );

    return () => {
      active = false;
      listener.subscription.unsubscribe();
    };
  }, []);

  useEffect(() => {
    let active = true;

    async function loadProfile() {
      if (!user) {
        setProfile(null);
        return;
      }

      const { data, error } = await supabase
        .from("profiles")
        .select("id, username, created_at")
        .eq("id", user.id)
        .maybeSingle();

      if (!active) return;

      if (error) {
        setMessage("Profile error: " + error.message);
        return;
      }

      setProfile(data);
      setUsername(data?.username ?? "");
    }

    void loadProfile();

    return () => {
      active = false;
    };
  }, [user?.id]);

  async function handleAuth(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

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
    } catch (error) {
      setMessage(
        error instanceof Error
          ? error.message
          : "Something went wrong."
      );
    } finally {
      setLoading(false);
    }
  }

  async function saveUsername(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user) return;

    const cleanUsername = username.trim();

    if (!/^[A-Za-z0-9_]{3,20}$/.test(cleanUsername)) {
      setMessage(
        "Username must be 3-20 characters using letters, numbers or _."
      );
      return;
    }

    setLoading(true);
    setMessage("");

    const { data, error } = await supabase
      .from("profiles")
      .update({ username: cleanUsername })
      .eq("id", user.id)
      .select("id, username, created_at")
      .single();

    if (error) {
      if (error.code === "23505") {
        setMessage("This username is already taken. Try another.");
      } else {
        setMessage("Could not save username: " + error.message);
      }
    } else {
      setProfile(data);
      setUsername(data.username ?? "");
      setEditingUsername(false);
      setMessage("Username saved successfully!");
    }

    setLoading(false);
  }

  async function handleLogout() {
    setLoading(true);
    setMessage("");

    const { error } = await supabase.auth.signOut();

    if (error) {
      setMessage(error.message);
    } else {
      setUser(null);
      setProfile(null);
      setScreen("home");
      setUsername("");
      setEditingUsername(false);
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
    <main style={mainStyle}>
      <div style={{ width: "100%", maxWidth: 650, textAlign: "center" }}>
        <div style={{ fontSize: 62, marginBottom: 12 }}>♛</div>

        <div style={subtitleStyle}>THE AGE OF KINGDOMS</div>

        <h1 style={titleStyle}>
          Medieval
          <br />
          Kingdoms
        </h1>

        <p style={descriptionStyle}>
          Build your kingdom. Command your armies. Conquer the world.
        </p>

        {checking ? (
          <p>Checking your account...</p>
        ) : user ? (
          <div style={panelStyle}>
            <h2 style={{ color: "#e0bd79" }}>
              Welcome, Ruler!
            </h2>

            <p style={{ color: "#aab8a8" }}>
              Your player account
            </p>

            <p style={{ overflowWrap: "anywhere" }}>
              {user.email}
            </p>

            {profile?.username && !editingUsername ? (
              <div style={usernameCardStyle}>
                <p style={{ color: "#c6a76d", marginBottom: 8 }}>
                  YOUR USERNAME
                </p>

                <h2 style={{ marginTop: 0 }}>
                  ♛ {profile.username}
                </h2>

                <button
                  style={{ ...buttonDark, width: "100%" }}
                  onClick={() => {
                    setEditingUsername(true);
                    setMessage("");
                  }}
                >
                  Change Username
                </button>
              </div>
            ) : (
              <div style={usernameCardStyle}>
                <h3>
                  {profile?.username
                    ? "Change Username"
                    : "Choose Your Username"}
                </h3>

                <p style={{ color: "#aab8a8", fontSize: 14 }}>
                  Choose a unique name for your kingdom adventures.
                </p>

                <form onSubmit={saveUsername}>
                  <input
                    type="text"
                    required
                    minLength={3}
                    maxLength={20}
                    pattern="[A-Za-z0-9_]{3,20}"
                    title="3-20 letters, numbers or underscores"
                    placeholder="Example: KingMaikls"
                    value={username}
                    onChange={(event) =>
                      setUsername(event.target.value)
                    }
                    style={inputStyle}
                  />

                  <button
                    type="submit"
                    disabled={loading}
                    style={{
                      ...buttonGold,
                      width: "100%",
                      marginTop: 14,
                    }}
                  >
                    {loading ? "Saving..." : "Save Username"}
                  </button>
                </form>

                {profile?.username && editingUsername && (
                  <button
                    style={{
                      ...buttonDark,
                      width: "100%",
                      marginTop: 12,
                    }}
                    onClick={() => {
                      setUsername(profile.username ?? "");
                      setEditingUsername(false);
                    }}
                  >
                    Cancel
                  </button>
                )}
              </div>
            )}

            {profile?.username && !editingUsername && (
              <button
                style={{
                  ...buttonGold,
                  width: "100%",
                  marginTop: 16,
                }}
                onClick={() =>
                  setMessage(
                    "The kingdom and season system is coming next!"
                  )
                }
              >
                ⚔ Play Game
              </button>
            )}

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
          <div style={homeButtonsStyle}>
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
              {screen === "login"
                ? "Login"
                : "Create Account"}
            </h2>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) =>
                  setEmail(event.target.value)
                }
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
                onChange={(event) =>
                  setPassword(event.target.value)
                }
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

        <p style={footerStyle}>
          MULTIPLAYER GRAND STRATEGY · MEDIEVAL KINGDOMS
        </p>
      </div>
    </main>
  );
}

const mainStyle: CSSProperties = {
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
};

const subtitleStyle: CSSProperties = {
  color: "#c6a76d",
  letterSpacing: 5,
  fontSize: 12,
};

const titleStyle: CSSProperties = {
  fontSize: "clamp(42px, 8vw, 76px)",
  lineHeight: 1.1,
  margin: "20px 0",
  textShadow: "0 4px 20px #000",
};

const descriptionStyle: CSSProperties = {
  color: "#c6a76d",
  fontSize: 17,
  marginBottom: 36,
};

const panelStyle: CSSProperties = {
  maxWidth: 360,
  margin: "auto",
  padding: 25,
  border: "1px solid #78613b",
  background: "#101a16dd",
  borderRadius: 12,
};

const usernameCardStyle: CSSProperties = {
  marginTop: 24,
  padding: 18,
  border: "1px solid #78613b",
  borderRadius: 8,
  background: "#1b2a22",
};

const homeButtonsStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  maxWidth: 330,
  margin: "auto",
};

const buttonGold: CSSProperties = {
  background:
    "linear-gradient(135deg, #e0bd79, #a77935)",
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

const footerStyle: CSSProperties = {
  color: "#748476",
  fontSize: 12,
  marginTop: 55,
};
