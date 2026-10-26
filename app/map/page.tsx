"use client";

import { useCallback, useEffect, useRef, useState } from "react";
import type {
  CSSProperties,
  PointerEvent as ReactPointerEvent,
  WheelEvent,
} from "react";
import { supabase } from "../../lib/supabase";
import {
  generateWorld,
  type GeneratedProvince,
  type GeneratedWorld,
  type Point,
  type Terrain,
} from "../../lib/worldGenerator";

type Season = {
  id: string;
  name: string;
  created_by: string;
  status: string;
};

type SeasonWorld = {
  season_id: string;
  generation_seed: number;
  map_width: number;
  map_height: number;
  is_generated: boolean;
};

type DatabaseProvince = {
  province_number: number;
  name: string;
  terrain: Terrain;
  center_x: number;
  center_y: number;
  polygon: Point[];
};

type MapMode = "season" | "preview";

const COLORS: Record<Terrain, string> = {
  plains: "#a6b87b",
  forest: "#477b57",
  hills: "#b4a06c",
  mountains: "#858a88",
  swamp: "#647b65",
};

const TERRAIN_NAMES: Record<Terrain, string> = {
  plains: "Plains",
  forest: "Forest",
  hills: "Hills",
  mountains: "Mountains",
  swamp: "Swamp",
};

const DEFAULT_WIDTH = 1200;
const DEFAULT_HEIGHT = 800;

function makeSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function polygonPoints(points: Point[]): string {
  return points.map(([x, y]) => `${x},${y}`).join(" ");
}

export default function MapPage() {
  const [mode, setMode] = useState<MapMode>("season");
  const [userId, setUserId] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  const [worldSettings, setWorldSettings] =
    useState<SeasonWorld | null>(null);

  const [world, setWorld] = useState<GeneratedWorld | null>(
    null
  );

  const [previewSeed, setPreviewSeed] = useState(123456);
  const [selected, setSelected] =
    useState<GeneratedProvince | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const [loading, setLoading] = useState(true);
  const [saving, setSaving] = useState(false);
  const [message, setMessage] = useState("");

  const dragRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  const selectedSeason =
    seasons.find((season) => season.id === selectedSeasonId) ??
    null;

  const isAdmin =
    !!userId && selectedSeason?.created_by === userId;

  const mapWidth = world?.width ?? DEFAULT_WIDTH;
  const mapHeight = world?.height ?? DEFAULT_HEIGHT;

  const resetView = useCallback(() => {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
    setSelected(null);
    dragRef.current = null;
  }, []);

  useEffect(() => {
    let active = true;

    async function loadAccount() {
      const { data, error } = await supabase.auth.getUser();

      if (!active) return;

      if (error || !data.user) {
        setUserId(null);
        setLoading(false);
        setMessage("Please log in to view your season maps.");
        return;
      }

      setUserId(data.user.id);
    }

    void loadAccount();

    return () => {
      active = false;
    };
  }, []);

  useEffect(() => {
    if (!userId) return;

    let active = true;

    async function loadSeasons() {
      setLoading(true);

      const [memberships, seasonResult] = await Promise.all([
        supabase
          .from("season_players")
          .select("season_id")
          .eq("player_id", userId),

        supabase
          .from("seasons")
          .select("id, name, created_by, status")
          .order("created_at", { ascending: false }),
      ]);

      if (!active) return;

      if (memberships.error || seasonResult.error) {
        setMessage(
          memberships.error?.message ??
            seasonResult.error?.message ??
            "Could not load seasons."
        );
        setLoading(false);
        return;
      }

      const joinedIds = new Set(
        (memberships.data ?? []).map((row) => row.season_id)
      );

      const joinedSeasons = (seasonResult.data ?? []).filter(
        (season) => joinedIds.has(season.id)
      );

      setSeasons(joinedSeasons);

      setSelectedSeasonId((previous) =>
        joinedSeasons.some((season) => season.id === previous)
          ? previous
          : joinedSeasons[0]?.id ?? ""
      );

      setLoading(false);
    }

    void loadSeasons();

    return () => {
      active = false;
    };
  }, [userId]);

  const loadSeasonWorld = useCallback(
    async (seasonId: string) => {
      setLoading(true);
      setMessage("");
      setWorld(null);
      setWorldSettings(null);
      resetView();

      const { data: settings, error: settingsError } =
        await supabase
          .from("season_worlds")
          .select(
            "season_id, generation_seed, map_width, map_height, is_generated"
          )
          .eq("season_id", seasonId)
          .maybeSingle();

      if (settingsError || !settings) {
        setMessage(
          settingsError?.message ??
            "World settings were not found."
        );
        setLoading(false);
        return;
      }

      const loadedSettings = settings as SeasonWorld;
      setWorldSettings(loadedSettings);

      if (!loadedSettings.is_generated) {
        setLoading(false);
        return;
      }

      const { data: provinces, error: provincesError } =
        await supabase
          .from("provinces")
          .select(
            "province_number, name, terrain, center_x, center_y, polygon"
          )
          .eq("season_id", seasonId)
          .order("province_number", { ascending: true })
          .limit(300);

      if (provincesError) {
        setMessage(provincesError.message);
        setLoading(false);
        return;
      }

      const { data: neighborRows, error: neighborError } =
        await supabase
          .from("province_neighbors")
          .select(
            "province_id, neighbor_id, provinces!province_neighbors_province_id_fkey(province_number)"
          )
          .eq("season_id", seasonId)
          .limit(10000);

      // Province geometry is authoritative. Neighbor information
      // is reconstructed from the same deterministic generator,
      // avoiding dependence on foreign-key relationship names.
      if (neighborError) {
        console.warn("Neighbor lookup:", neighborError.message);
      }

      void neighborRows;

      const generated = generateWorld(
        loadedSettings.generation_seed,
        loadedSettings.map_width,
        loadedSettings.map_height,
        150
      );

      const neighborsByNumber = new Map(
        generated.provinces.map((province) => [
          province.province_number,
          province.neighbor_numbers,
        ])
      );

      const storedProvinces: GeneratedProvince[] = (
        (provinces ?? []) as DatabaseProvince[]
      ).map((province) => ({
        ...province,
        neighbor_numbers:
          neighborsByNumber.get(province.province_number) ?? [],
      }));

      setWorld({
        width: loadedSettings.map_width,
        height: loadedSettings.map_height,
        seed: loadedSettings.generation_seed,
        provinces: storedProvinces,
      });

      setLoading(false);
    },
    [resetView]
  );

  useEffect(() => {
    if (mode !== "season" || !selectedSeasonId) return;

    void loadSeasonWorld(selectedSeasonId);
  }, [mode, selectedSeasonId, loadSeasonWorld]);

  useEffect(() => {
    if (mode !== "preview") return;

    const generated = generateWorld(
      previewSeed,
      DEFAULT_WIDTH,
      DEFAULT_HEIGHT,
      150
    );

    setWorld(generated);
    resetView();
  }, [mode, previewSeed, resetView]);

  async function generateSeasonMap() {
    if (
      !selectedSeasonId ||
      !worldSettings ||
      !isAdmin ||
      selectedSeason?.status !== "open" ||
      worldSettings.is_generated
    ) {
      return;
    }

    setSaving(true);
    setMessage("");

    try {
      const generated = generateWorld(
        worldSettings.generation_seed,
        worldSettings.map_width,
        worldSettings.map_height,
        150
      );

      const payload = generated.provinces.map((province) => ({
        province_number: province.province_number,
        name: province.name,
        terrain: province.terrain,
        center_x: province.center_x,
        center_y: province.center_y,
        polygon: province.polygon,
        neighbor_numbers: province.neighbor_numbers,
      }));

      const { data, error } = await supabase.rpc(
        "save_season_world",
        {
          p_season_id: selectedSeasonId,
          p_provinces: payload,
        }
      );

      if (error) throw error;

      await loadSeasonWorld(selectedSeasonId);

      setMessage(
        `World successfully saved! ${data} provinces created.`
      );
    } catch (error) {
      setMessage(
        error instanceof Error
          ? `World generation failed: ${error.message}`
          : "World generation failed."
      );
    } finally {
      setSaving(false);
    }
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    setZoom((current) =>
      Math.max(
        0.75,
        Math.min(
          4,
          Number(
            (current + (event.deltaY < 0 ? 0.15 : -0.15)).toFixed(2)
          )
        )
      )
    );
  }

  function handlePointerDown(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    if (event.pointerType === "mouse" && event.button !== 0) {
      return;
    }

    dragRef.current = {
      x: event.clientX,
      y: event.clientY,
      offsetX: offset.x,
      offsetY: offset.y,
      moved: false,
    };

    setDragging(true);
    event.currentTarget.setPointerCapture(event.pointerId);
  }

  function handlePointerMove(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    const drag = dragRef.current;
    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const dx =
      ((event.clientX - drag.x) * mapWidth) / rect.width;

    const dy =
      ((event.clientY - drag.y) * mapHeight) / rect.height;

    if (
      Math.abs(event.clientX - drag.x) +
        Math.abs(event.clientY - drag.y) >
      5
    ) {
      drag.moved = true;
    }

    setOffset({
      x: drag.offsetX + dx,
      y: drag.offsetY + dy,
    });
  }

  function handlePointerUp(
    event: ReactPointerEvent<SVGSVGElement>
  ) {
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }
  }

  function selectProvince(province: GeneratedProvince) {
    if (dragRef.current?.moved) {
      dragRef.current = null;
      return;
    }

    setSelected(province);
  }

  return (
    <main style={pageStyle}>
      <header style={headerStyle}>
        <div>
          <div style={eyebrowStyle}>♛ MEDIEVAL KINGDOMS</div>
          <h1 style={titleStyle}>World Map</h1>
          <p style={mutedStyle}>
            Explore the lands of your kingdom.
          </p>
        </div>

        <a href="/" style={secondaryButtonStyle}>
          ← Home
        </a>
      </header>

      <div style={modeBarStyle}>
        <button
          type="button"
          onClick={() => setMode("season")}
          style={
            mode === "season"
              ? goldButtonStyle
              : secondaryButtonStyle
          }
        >
          🏰 Season World
        </button>

        <button
          type="button"
          onClick={() => setMode("preview")}
          style={
            mode === "preview"
              ? goldButtonStyle
              : secondaryButtonStyle
          }
        >
          🎲 Map Preview
        </button>
      </div>

      {mode === "season" && (
        <section style={seasonPanelStyle}>
          <h2 style={{ color: "#e0bd79", marginTop: 0 }}>
            Your Seasons
          </h2>

          {seasons.length > 0 ? (
            <>
              <select
                value={selectedSeasonId}
                onChange={(event) =>
                  setSelectedSeasonId(event.target.value)
                }
                style={selectStyle}
              >
                {seasons.map((season) => (
                  <option key={season.id} value={season.id}>
                    {season.name} ({season.status})
                  </option>
                ))}
              </select>

              {worldSettings && (
                <div style={{ marginTop: 16 }}>
                  <p style={mutedStyle}>
                    World Seed: {worldSettings.generation_seed}
                  </p>

                  <p style={mutedStyle}>
                    Status:{" "}
                    {worldSettings.is_generated
                      ? "World Generated"
                      : "Not Generated"}
                  </p>

                  {isAdmin &&
                    !worldSettings.is_generated &&
                    selectedSeason?.status === "open" && (
                      <button
                        type="button"
                        onClick={() => void generateSeasonMap()}
                        disabled={saving || loading}
                        style={goldButtonStyle}
                      >
                        {saving
                          ? "Generating World..."
                          : "🌍 Generate Season World"}
                      </button>
                    )}

                  {!isAdmin && !worldSettings.is_generated && (
                    <p style={mutedStyle}>
                      Waiting for the season administrator to
                      generate the world.
                    </p>
                  )}
                </div>
              )}
            </>
          ) : (
            <p style={mutedStyle}>
              {loading
                ? "Loading your seasons..."
                : "You have not joined any seasons yet."}
            </p>
          )}
        </section>
      )}

      {mode === "preview" && (
        <div style={previewBarStyle}>
          <span>Preview Seed: {previewSeed}</span>

          <button
            type="button"
            style={goldButtonStyle}
            onClick={() => setPreviewSeed(makeSeed())}
          >
            🎲 New World
          </button>
        </div>
      )}

      {message && (
        <p role="status" style={messageStyle}>
          {message}
        </p>
      )}

      <section style={layoutStyle}>
        <div style={mapPanelStyle}>
          <div style={mapToolbarStyle}>
            <span>🌍 Fantasy Continent</span>
            <span>
              {world ? `${world.provinces.length} Provinces` : "No Map"}
            </span>
          </div>

          <div style={mapViewportStyle}>
            {world ? (
              <svg
                viewBox={`0 0 ${mapWidth} ${mapHeight}`}
                style={svgStyle}
                onWheel={handleWheel}
                onPointerDown={handlePointerDown}
                onPointerMove={handlePointerMove}
                onPointerUp={handlePointerUp}
                onPointerCancel={handlePointerUp}
              >
                <defs>
                  <pattern
                    id="seaPattern"
                    width="42"
                    height="42"
                    patternUnits="userSpaceOnUse"
                  >
                    <path
                      d="M 0 21 Q 10 15 21 21 T 42 21"
                      fill="none"
                      stroke="#ffffff"
                      strokeOpacity="0.055"
                      strokeWidth="1.5"
                    />
                  </pattern>
                </defs>

                <rect
                  width={mapWidth}
                  height={mapHeight}
                  fill="#234b5b"
                />

                <rect
                  width={mapWidth}
                  height={mapHeight}
                  fill="url(#seaPattern)"
                />

                <g
                  transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}
                >
                  {world.provinces.map((province) => {
                    const isSelected =
                      selected?.province_number ===
                      province.province_number;

                    return (
                      <polygon
                        key={province.province_number}
                        points={polygonPoints(province.polygon)}
                        fill={COLORS[province.terrain]}
                        stroke={
                          isSelected ? "#ffe4a3" : "#354332"
                        }
                        strokeWidth={isSelected ? 3 : 1.15}
                        vectorEffect="non-scaling-stroke"
                        onClick={() => selectProvince(province)}
                        style={{
                          cursor: "pointer",
                          opacity: isSelected ? 1 : 0.96,
                        }}
                      />
                    );
                  })}

                  {world.provinces.map((province) => (
                    <text
                      key={`label-${province.province_number}`}
                      x={province.center_x}
                      y={province.center_y}
                      fontSize="9"
                      textAnchor="middle"
                      fill="#19251a"
                      fontFamily="Georgia, serif"
                      fontWeight="bold"
                      pointerEvents="none"
                    >
                      {province.province_number}
                    </text>
                  ))}
                </g>
              </svg>
            ) : (
              <div style={emptyMapStyle}>
                {loading
                  ? "Loading world..."
                  : mode === "season"
                  ? "The season world has not been generated yet."
                  : "Generating preview..."}
              </div>
            )}

            <div style={zoomControlsStyle}>
              <button
                type="button"
                style={zoomButtonStyle}
                onClick={() =>
                  setZoom((current) => Math.min(4, current + 0.25))
                }
              >
                +
              </button>

              <button
                type="button"
                style={zoomButtonStyle}
                onClick={() =>
                  setZoom((current) =>
                    Math.max(0.75, current - 0.25)
                  )
                }
              >
                −
              </button>

              <button
                type="button"
                style={zoomButtonStyle}
                onClick={resetView}
              >
                ⌂
              </button>
            </div>
          </div>

          <div style={mapFooterStyle}>
            <span>Zoom: {Math.round(zoom * 100)}%</span>
            <span>
              {mode === "season" ? "Saved World" : "Preview"}
            </span>
          </div>
        </div>

        <aside style={sidebarStyle}>
          <h2 style={{ color: "#e0bd79", marginTop: 0 }}>
            🏰 Province Information
          </h2>

          {selected ? (
            <>
              <h3 style={provinceTitleStyle}>{selected.name}</h3>

              <p style={mutedStyle}>
                Province #{selected.province_number}
              </p>

              <div style={detailRowStyle}>
                <span>Terrain</span>
                <strong>
                  {TERRAIN_NAMES[selected.terrain]}
                </strong>
              </div>

              <div style={detailRowStyle}>
                <span>Owner</span>
                <strong>Unclaimed</strong>
              </div>

              <div style={detailRowStyle}>
                <span>Neighbors</span>
                <strong>
                  {selected.neighbor_numbers.length}
                </strong>
              </div>

              <h3 style={{ color: "#e0bd79" }}>
                Neighboring Provinces
              </h3>

              <div style={neighborListStyle}>
                {selected.neighbor_numbers.map((number) => {
                  const neighbor = world?.provinces.find(
                    (province) =>
                      province.province_number === number
                  );

                  return (
                    <button
                      type="button"
                      key={number}
                      style={neighborButtonStyle}
                      onClick={() => {
                        if (neighbor) setSelected(neighbor);
                      }}
                    >
                      {neighbor?.name ?? `Province ${number}`}
                    </button>
                  );
                })}
              </div>
            </>
          ) : (
            <div style={emptySelectionStyle}>
              <div style={{ fontSize: 42 }}>⚔️</div>
              <h3>Select a Province</h3>
              <p style={mutedStyle}>
                Click a territory to inspect its terrain and
                neighboring provinces.
              </p>
            </div>
          )}

          <div style={legendStyle}>
            <h3 style={{ color: "#e0bd79" }}>Map Legend</h3>

            {(
              Object.keys(COLORS) as Terrain[]
            ).map((terrain) => (
              <div key={terrain} style={legendRowStyle}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    background: COLORS[terrain],
                    borderRadius: 3,
                  }}
                />
                <span>{TERRAIN_NAMES[terrain]}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer style={footerStyle}>
        MEDIEVAL KINGDOMS · MULTIPLAYER WORLD MAP
      </footer>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#101a16",
  color: "#f4e5c6",
  fontFamily: "Georgia, serif",
  padding: 24,
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
};

const eyebrowStyle: CSSProperties = {
  color: "#c6a76d",
  letterSpacing: 3,
  fontSize: 12,
};

const titleStyle: CSSProperties = {
  color: "#e0bd79",
  fontSize: "clamp(32px, 5vw, 52px)",
  margin: "10px 0",
};

const mutedStyle: CSSProperties = {
  color: "#aab8a8",
  lineHeight: 1.6,
};

const goldButtonStyle: CSSProperties = {
  padding: "12px 20px",
  background: "#c6a76d",
  border: "1px solid #e0bd79",
  color: "#171a13",
  borderRadius: 6,
  fontFamily: "Georgia, serif",
  fontWeight: "bold",
  fontSize: 15,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 20px",
  background: "#1c2c22",
  border: "1px solid #78613b",
  color: "#f4e5c6",
  borderRadius: 6,
  textDecoration: "none",
  fontFamily: "Georgia, serif",
  fontSize: 15,
  cursor: "pointer",
};

const modeBarStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 20px",
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const seasonPanelStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 20px",
  padding: 20,
  background: "#16261f",
  border: "1px solid #78613b",
  borderRadius: 10,
};

const selectStyle: CSSProperties = {
  width: "100%",
  maxWidth: 420,
  padding: 12,
  background: "#25392b",
  color: "#f4e5c6",
  border: "1px solid #78613b",
  borderRadius: 6,
  fontSize: 16,
};

const previewBarStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 20px",
  display: "flex",
  alignItems: "center",
  gap: 18,
  flexWrap: "wrap",
};

const messageStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 20px",
  color: "#e0bd79",
  overflowWrap: "anywhere",
};

const layoutStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "auto",
  display: "grid",
  gridTemplateColumns:
    "repeat(auto-fit, minmax(min(100%, 340px), 1fr))",
  gap: 20,
  alignItems: "start",
};

const mapPanelStyle: CSSProperties = {
  background: "#16261f",
  border: "1px solid #78613b",
  borderRadius: 12,
  overflow: "hidden",
  minWidth: 0,
};

const mapToolbarStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  flexWrap: "wrap",
  padding: 16,
  color: "#e0bd79",
};

const mapViewportStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 2",
  minHeight: 280,
  position: "relative",
  overflow: "hidden",
  background: "#234b5b",
};

const svgStyle: CSSProperties = {
  display: "block",
  width: "100%",
  height: "100%",
  cursor: "grab",
  touchAction: "none",
  userSelect: "none",
};

const emptyMapStyle: CSSProperties = {
  height: "100%",
  display: "grid",
  placeItems: "center",
  textAlign: "center",
  padding: 20,
  boxSizing: "border-box",
  color: "#c6a76d",
};

const zoomControlsStyle: CSSProperties = {
  position: "absolute",
  right: 14,
  bottom: 14,
  display: "grid",
  gap: 6,
};

const zoomButtonStyle: CSSProperties = {
  width: 38,
  height: 38,
  background: "#14241be8",
  border: "1px solid #b99b62",
  borderRadius: 6,
  color: "#f4e5c6",
  fontSize: 23,
  cursor: "pointer",
};

const mapFooterStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  padding: 14,
  color: "#aab8a8",
  fontSize: 13,
};

const sidebarStyle: CSSProperties = {
  background: "#16261f",
  border: "1px solid #78613b",
  borderRadius: 12,
  padding: 22,
  minWidth: 0,
};

const provinceTitleStyle: CSSProperties = {
  fontSize: 27,
  color: "#e0bd79",
};

const detailRowStyle: CSSProperties = {
  display: "flex",
  justifyContent: "space-between",
  gap: 12,
  padding: "13px 0",
  borderBottom: "1px solid #ffffff19",
};

const neighborListStyle: CSSProperties = {
  display: "flex",
  flexWrap: "wrap",
  gap: 8,
};

const neighborButtonStyle: CSSProperties = {
  background: "#25392b",
  border: "1px solid #78613b",
  color: "#e9d6ad",
  padding: "8px 10px",
  borderRadius: 5,
  cursor: "pointer",
};

const emptySelectionStyle: CSSProperties = {
  textAlign: "center",
  padding: "35px 5px",
};

const legendStyle: CSSProperties = {
  marginTop: 30,
  borderTop: "1px solid #78613b",
  paddingTop: 14,
};

const legendRowStyle: CSSProperties = {
  display: "flex",
  alignItems: "center",
  gap: 12,
  marginBottom: 10,
  color: "#d2d8c9",
};

const footerStyle: CSSProperties = {
  textAlign: "center",
  color: "#748476",
  fontSize: 12,
  marginTop: 35,
  letterSpacing: 1,
};
