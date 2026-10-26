"use client";

import { useState } from "react";

export default function Home() {
  const [screen, setScreen] = useState<"home" | "login" | "register">("home");

  return (
    <main style={{
      minHeight: "100vh",
      background: "radial-gradient(ellipse at center, #23362a 0%, #101a16 70%)",
      color: "#f4e5c6",
      fontFamily: "Georgia, serif",
      display: "flex",
      justifyContent: "center",
      alignItems: "center",
      padding: 24,
      boxSizing: "border-box"
    }}>
      <div style={{ width: "100%", maxWidth: 650, textAlign: "center" }}>
        <div style={{ fontSize: 62, marginBottom: 12 }}>♛</div>
        <div style={{ color: "#c6a76d", letterSpacing: 5, fontSize: 12 }}>
          THE AGE OF KINGDOMS
        </div>
        <h1 style={{
          fontSize: "clamp(42px, 8vw, 76px)",
          lineHeight: 1.1,
          margin: "20px 0",
          textShadow: "0 4px 20px #000"
        }}>
          Medieval<br />Kingdoms
        </h1>
        <p style={{ color: "#c6a76d", fontSize: 17, marginBottom: 42 }}>
          Build your kingdom. Command your armies. Conquer the world.
        </p>

        {screen === "home" ? (
          <div style={{ display: "grid", gap: 14, maxWidth: 330, margin: "auto" }}>
            <button onClick={() => setScreen("login")} style={buttonGold}>
              ⚔ Play Game
            </button>
            <button onClick={() => setScreen("login")} style={buttonDark}>
              Login
            </button>
            <button onClick={() => setScreen("register")} style={buttonDark}>
              Create Account
            </button>
          </div>
        ) : (
          <div style={{
            maxWidth: 360, margin: "auto", padding: 25,
            border: "1px solid #78613b", background: "#101a16dd",
            borderRadius: 12
          }}>
            <h2>{screen === "login" ? "Login" : "Create Account"}</h2>
            <form onSubmit={(e) => {
              e.preventDefault();
              alert("Account system coming soon! We will connect Supabase next.");
            }}>
              <input type="email" required placeholder="Email" style={inputStyle} />
              <input type="password" required minLength={6} placeholder="Password" style={inputStyle} />
              <button type="submit" style={{ ...buttonGold, width: "100%", marginTop: 12 }}>
                {screen === "login" ? "Login" : "Register"}
              </button>
            </form>
            <button onClick={() => setScreen("home")} style={{
              ...buttonDark, width: "100%", marginTop: 12
            }}>← Back</button>
          </div>
        )}

        <p style={{ color: "#748476", fontSize: 12, marginTop: 55 }}>
          MULTIPLAYER GRAND STRATEGY · MEDIEVAL KINGDOMS
        </p>
      </div>
    </main>
  );
}

const buttonGold = {
  background: "linear-gradient(135deg, #e0bd79, #a77935)",
  border: "1px solid #e9ce91",
  color: "#211b12",
  padding: "16px 24px",
  fontFamily: "Georgia, serif",
  fontSize: 18,
  fontWeight: "bold" as const,
  cursor: "pointer",
  borderRadius: 6
};

const buttonDark = {
  background: "#19271f",
  border: "1px solid #8d7347",
  color: "#f4e5c6",
  padding: "15px 24px",
  fontFamily: "Georgia, serif",
  fontSize: 17,
  cursor: "pointer",
  borderRadius: 6
};

const inputStyle = {
  width: "100%",
  boxSizing: "border-box" as const,
  padding: 14,
  marginTop: 12,
  background: "#1b2a22",
  border: "1px solid #78613b",
  borderRadius: 6,
  color: "#fff",
  fontSize: 16
};
