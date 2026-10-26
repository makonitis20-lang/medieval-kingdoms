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

type DragState = {
  pointerId: number;
  startX: number;
  startY: number;
  offsetX: number;
  offsetY: number;
  moved: boolean;
};

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

function clamp(value: number, min: number, max: number) {
  return Math.min(max, Math.max(min, value));
}

export default function MapPage() {
  const [mode, setMode] = useState<MapMode>("season");
  const [userId, setUserId] = useState<string | null>(null);

  const [seasons, setSeasons] = useState<Season[]>([]);
  const [selectedSeasonId, setSelectedSeasonId] = useState("");

  const [worldSettings, setWorldSettings] =
    useState<SeasonWorld | null>(null);

  const [world, setWorld] = useState<GeneratedWorld | null>(null);

  const [previewSeed, setPreviewSeed] = useState(123456);
