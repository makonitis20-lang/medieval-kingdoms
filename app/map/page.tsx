"use client";

import { useEffect, useRef, useState } from "react";
import type { CSSProperties, WheelEvent } from "react";
import {
  generateWorld,
  type GeneratedProvince,
  type GeneratedWorld,
  type Terrain,
} from "../../lib/worldGenerator";

const TERRAIN_COLORS: Record<Terrain, string> = {
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

const MAP_WIDTH = 1200;
const MAP_HEIGHT = 800;

function createSeed(): number {
  return Math.floor(Math.random() * 2147483647);
}

function polygonPoints(
  polygon: [number, number][]
): string {
  return polygon
    .map(([x, y]) => `${x},${y}`)
    .join(" ");
}

export default function MapPage() {
  const [seed, setSeed] = useState(123456);
  const [world, setWorld] = useState<GeneratedWorld | null>(
    null
  );

  const [selected, setSelected] =
    useState<GeneratedProvince | null>(null);

  const [zoom, setZoom] = useState(1);
  const [offset, setOffset] = useState({ x: 0, y: 0 });
  const [dragging, setDragging] = useState(false);

  const dragRef = useRef<{
    x: number;
    y: number;
    offsetX: number;
    offsetY: number;
    moved: boolean;
  } | null>(null);

  useEffect(() => {
    const generated = generateWorld(
      seed,
      MAP_WIDTH,
      MAP_HEIGHT,
      150
    );

    setWorld(generated);
    setSelected(null);
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }, [seed]);

  function newWorld() {
    setSeed(createSeed());
  }

  function zoomIn() {
    setZoom((current) =>
      Math.min(4, Number((current + 0.25).toFixed(2)))
    );
  }

  function zoomOut() {
    setZoom((current) =>
      Math.max(0.75, Number((current - 0.25).toFixed(2)))
    );
  }

  function resetView() {
    setZoom(1);
    setOffset({ x: 0, y: 0 });
  }

  function handleWheel(event: WheelEvent<SVGSVGElement>) {
    event.preventDefault();

    const change = event.deltaY < 0 ? 0.15 : -0.15;

    setZoom((current) =>
      Math.max(
        0.75,
        Math.min(4, Number((current + change).toFixed(2)))
      )
    );
  }

  function handlePointerDown(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    if (event.button !== 0) return;

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
    event: React.PointerEvent<SVGSVGElement>
  ) {
    const drag = dragRef.current;

    if (!drag) return;

    const rect = event.currentTarget.getBoundingClientRect();

    const scaleX = MAP_WIDTH / rect.width;
    const scaleY = MAP_HEIGHT / rect.height;

    const dx = event.clientX - drag.x;
    const dy = event.clientY - drag.y;

    if (Math.abs(dx) + Math.abs(dy) > 5) {
      drag.moved = true;
    }

    setOffset({
      x: drag.offsetX + dx * scaleX,
      y: drag.offsetY + dy * scaleY,
    });
  }

  function handlePointerUp(
    event: React.PointerEvent<SVGSVGElement>
  ) {
    setDragging(false);

    if (event.currentTarget.hasPointerCapture(event.pointerId)) {
      event.currentTarget.releasePointerCapture(event.pointerId);
    }

    // Keep the drag record briefly for click suppression.
    // A new pointer down will replace it.
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
          <div style={eyebrowStyle}>
            ♛ MEDIEVAL KINGDOMS
          </div>

          <h1 style={titleStyle}>World Map</h1>

          <p style={subtitleStyle}>
            Explore the lands of your future kingdom.
          </p>
        </div>

        <div style={headerActionsStyle}>
          <a href="/" style={secondaryButtonStyle}>
            ← Home
          </a>

          <button
            type="button"
            onClick={newWorld}
            style={goldButtonStyle}
          >
            🎲 New World
          </button>
        </div>
      </header>

      <section style={layoutStyle}>
        <div style={mapPanelStyle}>
          <div style={mapToolbarStyle}>
            <span>
              🌍 Fantasy Continent
            </span>

            <span style={{ color: "#cbb78d" }}>
              Seed: {seed}
            </span>
          </div>

          <div style={mapViewportStyle}>
            {world ? (
              <svg
                viewBox={`0 0 ${MAP_WIDTH} ${MAP_HEIGHT}`}
                style={{
                  display: "block",
                  width: "100%",
                  height: "100%",
                  cursor: dragging ? "grabbing" : "grab",
                  touchAction: "none",
                  userSelect: "none",
                }}
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

                  <filter id="landShadow">
                    <feDropShadow
                      dx="0"
                      dy="3"
                      stdDeviation="5"
                      floodColor="#071b22"
                      floodOpacity="0.55"
                    />
                  </filter>
                </defs>

                <rect
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  fill="#234b5b"
                />

                <rect
                  width={MAP_WIDTH}
                  height={MAP_HEIGHT}
                  fill="url(#seaPattern)"
                />

                <g
                  transform={`translate(${offset.x} ${offset.y}) scale(${zoom})`}
                  filter="url(#landShadow)"
                >
                  {world.provinces.map((province) => {
                    const isSelected =
                      selected?.province_number ===
                      province.province_number;

                    return (
                      <polygon
                        key={province.province_number}
                        points={polygonPoints(province.polygon)}
                        fill={
                          TERRAIN_COLORS[province.terrain]
                        }
                        stroke={
                          isSelected ? "#ffe4a3" : "#354332"
                        }
                        strokeWidth={
                          isSelected ? 3 : 1.15
                        }
                        vectorEffect="non-scaling-stroke"
                        onClick={() =>
                          selectProvince(province)
                        }
                        style={{
                          cursor: "pointer",
                          opacity: isSelected ? 1 : 0.96,
                        }}
                      />
                    );
                  })}

                  {world.provinces.map((province) => {
                    if (province.polygon.length < 3) {
                      return null;
                    }

                    return (
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
                    );
                  })}
                </g>
              </svg>
            ) : (
              <div style={loadingStyle}>
                Generating world...
              </div>
            )}

            <div style={zoomControlsStyle}>
              <button
                type="button"
                onClick={zoomIn}
                style={zoomButtonStyle}
                aria-label="Zoom in"
              >
                +
              </button>

              <button
                type="button"
                onClick={zoomOut}
                style={zoomButtonStyle}
                aria-label="Zoom out"
              >
                −
              </button>

              <button
                type="button"
                onClick={resetView}
                style={zoomButtonStyle}
                aria-label="Reset map view"
              >
                ⌂
              </button>
            </div>
          </div>

          <div style={mapFooterStyle}>
            <span>
              Provinces: {world?.provinces.length ?? 0}
            </span>

            <span>
              Zoom: {Math.round(zoom * 100)}%
            </span>
          </div>
        </div>

        <aside style={sidebarStyle}>
          <div style={sidebarHeadingStyle}>
            🏰 Province Information
          </div>

          {selected ? (
            <>
              <h2 style={provinceTitleStyle}>
                {selected.name}
              </h2>

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
                      key={number}
                      type="button"
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

              <p style={hintStyle}>
                Province ownership, colonization and armies
                will be added in future steps.
              </p>
            </>
          ) : (
            <div style={emptySelectionStyle}>
              <div style={{ fontSize: 42 }}>⚔️</div>

              <h3>Select a Province</h3>

              <p style={mutedStyle}>
                Click or tap any territory on the map to
                inspect its terrain and neighboring lands.
              </p>
            </div>
          )}

          <div style={legendStyle}>
            <h3 style={{ color: "#e0bd79" }}>
              Map Legend
            </h3>

            {(
              Object.keys(TERRAIN_COLORS) as Terrain[]
            ).map((terrain) => (
              <div key={terrain} style={legendRowStyle}>
                <span
                  style={{
                    width: 16,
                    height: 16,
                    borderRadius: 3,
                    background: TERRAIN_COLORS[terrain],
                    display: "inline-block",
                    border: "1px solid #ffffff33",
                  }}
                />

                <span>{TERRAIN_NAMES[terrain]}</span>
              </div>
            ))}
          </div>
        </aside>
      </section>

      <footer style={footerStyle}>
        MEDIEVAL KINGDOMS · PROCEDURAL WORLD GENERATOR
      </footer>
    </main>
  );
}

const pageStyle: CSSProperties = {
  minHeight: "100vh",
  background: "#101a16",
  color: "#f4e5c6",
  fontFamily: "Georgia, serif",
  padding: "24px",
  boxSizing: "border-box",
};

const headerStyle: CSSProperties = {
  maxWidth: 1500,
  margin: "0 auto 24px",
  display: "flex",
  justifyContent: "space-between",
  alignItems: "center",
  flexWrap: "wrap",
  gap: 18,
};

const eyebrowStyle: CSSProperties = {
  color: "#c6a76d",
  fontSize: 12,
  letterSpacing: 3,
};

const titleStyle: CSSProperties = {
  fontSize: "clamp(32px, 5vw, 52px)",
  margin: "10px 0",
  color: "#e0bd79",
};

const subtitleStyle: CSSProperties = {
  color: "#aab8a8",
  margin: 0,
};

const headerActionsStyle: CSSProperties = {
  display: "flex",
  gap: 12,
  flexWrap: "wrap",
};

const goldButtonStyle: CSSProperties = {
  padding: "12px 20px",
  borderRadius: 6,
  background: "#c6a76d",
  border: "1px solid #e0bd79",
  color: "#171a13",
  fontFamily: "Georgia, serif",
  fontWeight: "bold",
  fontSize: 15,
  cursor: "pointer",
};

const secondaryButtonStyle: CSSProperties = {
  padding: "12px 20px",
  borderRadius: 6,
  background: "#1c2c22",
  border: "1px solid #78613b",
  color: "#f4e5c6",
  textDecoration: "none",
  fontSize: 15,
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
  borderBottom: "1px solid #78613b",
};

const mapViewportStyle: CSSProperties = {
  width: "100%",
  aspectRatio: "3 / 2",
  minHeight: 280,
  position: "relative",
  overflow: "hidden",
  background: "#234b5b",
};

const loadingStyle: CSSProperties = {
  display: "grid",
  placeItems: "center",
  height: "100%",
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

const sidebarHeadingStyle: CSSProperties = {
  color: "#c6a76d",
  fontSize: 13,
  letterSpacing: 1,
};

const provinceTitleStyle: CSSProperties = {
  fontSize: 28,
  color: "#e0bd79",
  marginBottom: 4,
};

const mutedStyle: CSSProperties = {
  color: "#aab8a8",
  lineHeight: 1.6,
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
  fontFamily: "Georgia, serif",
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

const hintStyle: CSSProperties = {
  marginTop: 22,
  color: "#aab8a8",
  fontSize: 13,
  lineHeight: 1.6,
};

const footerStyle: CSSProperties = {
  textAlign: "center",
  color: "#748476",
  fontSize: 12,
  marginTop: 35,
  letterSpacing: 1,
};
