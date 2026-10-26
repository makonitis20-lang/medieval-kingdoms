"use client";

import { useCallback, useEffect, useState } from "react";
import type { CSSProperties, FormEvent } from "react";
import type { User } from "@supabase/supabase-js";
import { supabase } from "../lib/supabase";

type Screen = "home" | "login" | "register";

type Profile = {
  id: string;
  username: string | null;
  created_at: string;
};

type Season = {
  id: string;
  name: string;
  created_by: string;
  max_players: number;
  status: string;
  current_turn: number;
  created_at: string;
};

type SeasonPlayer = {
  season_id: string;
  player_id: string;
};

const statusNames: Record<string, string> = {
  open: "Registration Open",
  active: "In Progress",
  paused: "Paused",
  finished: "Finished",
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

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [seasonPlayers, setSeasonPlayers] = useState<SeasonPlayer[]>([]);
  const [seasonName, setSeasonName] = useState("");
  const [maxPlayers, setMaxPlayers] = useState(30);
  const [showCreateSeason, setShowCreateSeason] = useState(false);
  const [seasonsLoading, setSeasonsLoading] = useState(false);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error) setMessage(error.message);

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
          setSeasons([]);
          setSeasonPlayers([]);
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

  const loadSeasons = useCallback(async () => {
    if (!user) return;

    setSeasonsLoading(true);

    const [seasonsResult, playersResult] = await Promise.all([
      supabase
        .from("seasons")
        .select(
          "id, name, created_by, max_players, status, current_turn, created_at"
        )
        .order("created_at", { ascending: false }),

      supabase
        .from("season_players")
        .select("season_id, player_id"),
    ]);

    if (seasonsResult.error) {
      setMessage("Season error: " + seasonsResult.error.message);
    } else {
      setSeasons(seasonsResult.data ?? []);
    }

    if (playersResult.error) {
      setMessage("Players error: " + playersResult.error.message);
    } else {
      setSeasonPlayers(playersResult.data ?? []);
    }

    setSeasonsLoading(false);
  }, [user?.id]);

  useEffect(() => {
    if (user && profile?.username) {
      void loadSeasons();
    }
  }, [user?.id, profile?.username, loadSeasons]);

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
      setMessage(
        error.code === "23505"
          ? "This username is already taken."
          : "Could not save username: " + error.message
      );
    } else {
      setProfile(data);
      setUsername(data.username ?? "");
      setEditingUsername(false);
      setMessage("Username saved successfully!");
    }

    setLoading(false);
  }

  async function createSeason(event: FormEvent<HTMLFormElement>) {
    event.preventDefault();

    if (!user || !profile?.username) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("create_season", {
      p_name: seasonName.trim(),
      p_max_players: maxPlayers,
    });

    if (error) {
      setMessage("Could not create season: " + error.message);
    } else {
      setSeasonName("");
      setShowCreateSeason(false);
      setMessage("Your season has been created!");
      await loadSeasons();
    }

    setLoading(false);
  }

  async function joinSeason(seasonId: string) {
    if (!user) return;

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("join_season", {
      p_season_id: seasonId,
    });

    if (error) {
      setMessage("Could not join season: " + error.message);
    } else {
      setMessage("You have joined the season!");
      await loadSeasons();
    }

    setLoading(false);
  }

  async function manageSeason(
    seasonId: string,
    action: "start" | "pause" | "resume" | "finish"
  ) {
    if (!user) return;

    if (
      action === "finish" &&
      !window.confirm(
        "Are you sure you want to end this season? This cannot be undone."
      )
    ) {
      return;
    }

    setLoading(true);
    setMessage("");

    const { error } = await supabase.rpc("manage_season", {
      p_season_id: seasonId,
      p_action: action,
    });

    if (error) {
      setMessage("Could not manage season: " + error.message);
    } else {
      setMessage("Season updated successfully!");
      await loadSeasons();
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
      setSeasons([]);
      setSeasonPlayers([]);
      setMessage("You have logged out.");
    }

    setLoading(false);
  }

  function changeScreen(next: Screen) {
    setScreen(next);
    setMessage("");
    setPassword("");
  }

  function playerCount(seasonId: string) {
    return seasonPlayers.filter(
      (player) => player.season_id === seasonId
    ).length;
  }

  function hasJoined(seasonId: string) {
    return seasonPlayers.some(
      (player) =>
        player.season_id === seasonId &&
        player.player_id === user?.id
    );
  }

  return (
    <main style={mainStyle}>
      <div style={{ width: "100%", maxWidth: 850, textAlign: "center" }}>
        <div style={{ fontSize: 58, marginBottom: 8 }}>♛</div>

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
          <>
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

                  <form onSubmit={saveUsername}>
                    <input
                      type="text"
                      required
                      minLength={3}
                      maxLength={20}
                      pattern="[A-Za-z0-9_]{3,20}"
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

              <button
                style={{
                  ...buttonDark,
                  width: "100%",
                  marginTop: 14,
                }}
                disabled={loading}
                onClick={handleLogout}
              >
                Logout
              </button>
            </div>

            {profile?.username && (
              <section style={{ marginTop: 35 }}>
                <h2 style={{ color: "#e0bd79", fontSize: 30 }}>
                  ⚔ Multiplayer Seasons
                </h2>

                <p style={{ color: "#aab8a8" }}>
                  Create a kingdom season or join other rulers.
                </p>

                <div
                  style={{
                    display: "flex",
                    justifyContent: "center",
                    gap: 12,
                    flexWrap: "wrap",
                    marginBottom: 24,
                  }}
                >
                  <button
                    style={buttonGold}
                    onClick={() =>
                      setShowCreateSeason(!showCreateSeason)
                    }
                  >
                    + Create Season
                  </button>

                  <button
                    style={buttonDark}
                    disabled={seasonsLoading}
                    onClick={() => void loadSeasons()}
                  >
                    {seasonsLoading ? "Loading..." : "↻ Refresh"}
                  </button>
                </div>

                {showCreateSeason && (
                  <div style={seasonFormStyle}>
                    <h3>Create New Season</h3>

                    <form onSubmit={createSeason}>
                      <input
                        type="text"
                        required
                        minLength={3}
                        maxLength={60}
                        placeholder="Season name"
                        value={seasonName}
                        onChange={(event) =>
                          setSeasonName(event.target.value)
                        }
                        style={inputStyle}
                      />

                      <p style={{ color: "#c6a76d" }}>
                        Maximum Players
                      </p>

                      <select
                        value={maxPlayers}
                        onChange={(event) =>
                          setMaxPlayers(Number(event.target.value))
                        }
                        style={inputStyle}
                      >
                        {[10, 15, 20, 25, 30].map((number) => (
                          <option key={number} value={number}>
                            {number} Players
                          </option>
                        ))}
                      </select>

                      <button
                        type="submit"
                        disabled={loading}
                        style={{
                          ...buttonGold,
                          width: "100%",
                          marginTop: 16,
                        }}
                      >
                        {loading ? "Creating..." : "Create Season"}
                      </button>
                    </form>
                  </div>
                )}

                {seasons.length === 0 ? (
                  <div style={seasonCardStyle}>
                    <p>No seasons available yet.</p>
                    <p style={{ color: "#aab8a8" }}>
                      Be the first ruler to create one!
                    </p>
                  </div>
                ) : (
                  <div style={{ display: "grid", gap: 16 }}>
                    {seasons.map((season) => {
                      const count = playerCount(season.id);
                      const joined = hasJoined(season.id);
                      const owner = season.created_by === user.id;
                      const full = count >= season.max_players;

                      return (
                        <div key={season.id} style={seasonCardStyle}>
                          <h3
                            style={{
                              color: "#e0bd79",
                              fontSize: 23,
                              marginTop: 0,
                            }}
                          >
                            ♛ {season.name}
                          </h3>

                          <p style={{ color: "#aab8a8" }}>
                            {statusNames[season.status] ??
                              season.status}
                          </p>

                          <p style={{ fontSize: 20 }}>
                            👥 {count} / {season.max_players} Players
                          </p>

                          {season.status !== "open" && (
                            <p>Turn: {season.current_turn}</p>
                          )}

                          {owner && (
                            <p style={{ color: "#e0bd79" }}>
                              ★ You are the Season Administrator
                            </p>
                          )}

                          {joined && !owner && (
                            <p style={{ color: "#a9d4a2" }}>
                              ✓ You joined this season
                            </p>
                          )}

                          {!joined &&
                            season.status === "open" &&
                            !full && (
                              <button
                                style={buttonGold}
                                disabled={loading}
                                onClick={() =>
                                  void joinSeason(season.id)
                                }
                              >
                                Join Season
                              </button>
                            )}

                          {!joined &&
                            season.status === "open" &&
                            full && (
                              <p style={{ color: "#c6a76d" }}>
                                Season is full
                              </p>
                            )}

                          {owner && season.status === "open" && (
                            <div style={actionRowStyle}>
                              <button
                                style={buttonGold}
                                disabled={loading || count < 10}
                                onClick={() =>
                                  void manageSeason(season.id, "start")
                                }
                              >
                                Start Season
                              </button>

                              {count < 10 && (
                                <p style={{ color: "#aab8a8", fontSize: 13 }}>
                                  At least 10 players are required to start.
                                </p>
                              )}
                            </div>
                          )}

                          {owner && season.status === "active" && (
                            <div style={actionRowStyle}>
                              <button
                                style={buttonDark}
                                disabled={loading}
                                onClick={() =>
                                  void manageSeason(season.id, "pause")
                                }
                              >
                                Pause Season
                              </button>

                              <button
                                style={buttonDark}
                                disabled={loading}
                                onClick={() =>
                                  void manageSeason(season.id, "finish")
                                }
                              >
                                End Season
                              </button>
                            </div>
                          )}

                          {owner && season.status === "paused" && (
                            <div style={actionRowStyle}>
                              <button
                                style={buttonGold}
                                disabled={loading}
                                onClick={() =>
                                  void manageSeason(season.id, "resume")
                                }
                              >
                                Resume Season
                              </button>

                              <button
                                style={buttonDark}
                                disabled={loading}
                                onClick={() =>
                                  void manageSeason(season.id, "finish")
                                }
                              >
                                End Season
                              </button>
                            </div>
                          )}

                          {season.status === "finished" && (
                            <p style={{ color: "#aab8a8" }}>
                              This season has ended.
                            </p>
                          )}
                        </div>
                      );
                    })}
                  </div>
                )}
              </section>
            )}
          </>
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
              {screen === "login" ? "Login" : "Create Account"}
            </h2>

            <form onSubmit={handleAuth}>
              <input
                type="email"
                required
                autoComplete="email"
                placeholder="Email"
                value={email}
                onChange={(event) => setEmail(event.target.value)}
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
                onChange={(event) => setPassword(event.target.value)}
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

const seasonFormStyle: CSSProperties = {
  maxWidth: 420,
  margin: "0 auto 24px",
  padding: 22,
  background: "#14241b",
  border: "1px solid #a77935",
  borderRadius: 10,
};

const seasonCardStyle: CSSProperties = {
  padding: 24,
  background: "#14241b",
  border: "1px solid #78613b",
  borderRadius: 10,
};

const actionRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "center",
  gap: 12,
  flexWrap: "wrap",
  marginTop: 18,
};

const homeButtonsStyle: CSSProperties = {
  display: "grid",
  gap: 14,
  maxWidth: 330,
  margin: "auto",
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

const footerStyle: CSSProperties = {
  color: "#748476",
  fontSize: 12,
  marginTop: 55,
};
