// MEDIEVAL KINGDOMS
// PROCEDURAL WORLD GENERATOR - VERSION 1

export type Terrain =
  | "plains"
  | "forest"
  | "hills"
  | "mountains"
  | "swamp";

export type Point = [number, number];

export type GeneratedProvince = {
  province_number: number;
  name: string;
  terrain: Terrain;
  center_x: number;
  center_y: number;
  polygon: Point[];
  neighbor_numbers: number[];
};

export type GeneratedWorld = {
  width: number;
  height: number;
  seed: number;
  provinces: GeneratedProvince[];
};

type Cell = {
  x: number;
  y: number;
  land: boolean;
  province: number | null;
};

const PREFIXES = [
  "Ash",
  "Black",
  "Bright",
  "Cold",
  "Dawn",
  "Dragon",
  "East",
  "Elder",
  "Frost",
  "Gold",
  "Green",
  "High",
  "Iron",
  "Kings",
  "Moon",
  "North",
  "Oak",
  "Raven",
  "Red",
  "River",
  "Silver",
  "Stone",
  "Storm",
  "Sun",
  "West",
  "White",
  "Winter",
  "Wolf",
];

const SUFFIXES = [
  "bay",
  "bridge",
  "brook",
  "burg",
  "dale",
  "fall",
  "field",
  "ford",
  "gard",
  "gate",
  "haven",
  "helm",
  "hold",
  "keep",
  "land",
  "march",
  "mere",
  "moor",
  "port",
  "reach",
  "rest",
  "shire",
  "stead",
  "vale",
  "watch",
  "wick",
  "wood",
  "worth",
];

function createRandom(seed: number): () => number {
  let state = Math.floor(seed) >>> 0;

  return () => {
    state = (state + 0x6d2b79f5) >>> 0;

    let value = state;

    value = Math.imul(
      value ^ (value >>> 15),
      value | 1
    );

    value ^= value + Math.imul(
      value ^ (value >>> 7),
      value | 61
    );

    return (
      ((value ^ (value >>> 14)) >>> 0) /
      4294967296
    );
  };
}

function clamp(
  value: number,
  minimum: number,
  maximum: number
): number {
  return Math.max(minimum, Math.min(maximum, value));
}

function distanceSquared(
  ax: number,
  ay: number,
  bx: number,
  by: number
): number {
  const dx = ax - bx;
  const dy = ay - by;

  return dx * dx + dy * dy;
}

function generateName(
  random: () => number,
  used: Set<string>
): string {
  for (let attempt = 0; attempt < 1000; attempt++) {
    const prefix =
      PREFIXES[Math.floor(random() * PREFIXES.length)];

    const suffix =
      SUFFIXES[Math.floor(random() * SUFFIXES.length)];

    const name = prefix + suffix;

    if (!used.has(name)) {
      used.add(name);
      return name;
    }
  }

  const fallback = `Province ${used.size + 1}`;
  used.add(fallback);

  return fallback;
}

function chooseTerrain(
  random: () => number
): Terrain {
  const roll = random();

  if (roll < 0.39) return "plains";
  if (roll < 0.65) return "forest";
  if (roll < 0.82) return "hills";
  if (roll < 0.94) return "mountains";

  return "swamp";
}

function pointKey(x: number, y: number): string {
  return `${x},${y}`;
}

function polygonArea(polygon: Point[]): number {
  let area = 0;

  for (let i = 0; i < polygon.length; i++) {
    const current = polygon[i];
    const next = polygon[(i + 1) % polygon.length];

    area +=
      current[0] * next[1] -
      next[0] * current[1];
  }

  return area / 2;
}

function simplifyPolygon(points: Point[]): Point[] {
  if (points.length <= 3) return points;

  const result: Point[] = [];

  for (let i = 0; i < points.length; i++) {
    const previous =
      points[(i - 1 + points.length) % points.length];

    const current = points[i];

    const next = points[(i + 1) % points.length];

    const cross =
      (current[0] - previous[0]) *
        (next[1] - current[1]) -
      (current[1] - previous[1]) *
        (next[0] - current[0]);

    if (Math.abs(cross) > 0.000001) {
      result.push(current);
    }
  }

  return result.length >= 3 ? result : points;
}

function tracePolygon(
  cells: Cell[],
  columns: number,
  rows: number,
  province: number,
  cellWidth: number,
  cellHeight: number
): Point[] {
  type Edge = {
    start: Point;
    end: Point;
  };

  const edges: Edge[] = [];

  function belongs(x: number, y: number): boolean {
    if (
      x < 0 ||
      y < 0 ||
      x >= columns ||
      y >= rows
    ) {
      return false;
    }

    return (
      cells[y * columns + x].province === province
    );
  }

  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      if (!belongs(x, y)) continue;

      if (!belongs(x, y - 1)) {
        edges.push({
          start: [x, y],
          end: [x + 1, y],
        });
      }

      if (!belongs(x + 1, y)) {
        edges.push({
          start: [x + 1, y],
          end: [x + 1, y + 1],
        });
      }

      if (!belongs(x, y + 1)) {
        edges.push({
          start: [x + 1, y + 1],
          end: [x, y + 1],
        });
      }

      if (!belongs(x - 1, y)) {
        edges.push({
          start: [x, y + 1],
          end: [x, y],
        });
      }
    }
  }

  if (edges.length === 0) return [];

  const outgoing = new Map<string, number[]>();

  edges.forEach((edge, index) => {
    const key = pointKey(
      edge.start[0],
      edge.start[1]
    );

    const existing = outgoing.get(key) ?? [];
    existing.push(index);
    outgoing.set(key, existing);
  });

  const visited = new Set<number>();
  const loops: Point[][] = [];

  for (let first = 0; first < edges.length; first++) {
    if (visited.has(first)) continue;

    const loop: Point[] = [];
    let current = first;

    for (let steps = 0; steps <= edges.length; steps++) {
      if (visited.has(current)) break;

      visited.add(current);

      const edge = edges[current];

      loop.push(edge.start);

      const nextKey = pointKey(
        edge.end[0],
        edge.end[1]
      );

      const candidates =
        outgoing.get(nextKey) ?? [];

      const next = candidates.find(
        (index) => !visited.has(index)
      );

      if (next === undefined) break;

      current = next;
    }

    if (loop.length >= 3) {
      loops.push(loop);
    }
  }

  if (loops.length === 0) return [];

  // The largest boundary is used for this province.
  // Islands and holes will be handled in a later version.
  loops.sort(
    (a, b) =>
      Math.abs(polygonArea(b)) -
      Math.abs(polygonArea(a))
  );

  const simplified = simplifyPolygon(loops[0]);

  return simplified.map(([x, y]) => [
    Math.round(x * cellWidth * 100) / 100,
    Math.round(y * cellHeight * 100) / 100,
  ]);
}

export function generateWorld(
  seed: number,
  width = 1200,
  height = 800,
  requestedProvinces = 150
): GeneratedWorld {
  if (!Number.isFinite(seed)) {
    throw new Error("Invalid world seed");
  }

  if (
    !Number.isFinite(width) ||
    !Number.isFinite(height) ||
    width <= 0 ||
    height <= 0
  ) {
    throw new Error("Invalid map dimensions");
  }

  const random = createRandom(seed);

  const columns = 90;
  const rows = 60;

  const cellWidth = width / columns;
  const cellHeight = height / rows;

  const cells: Cell[] = [];

  const continentCenters = Array.from(
    { length: 5 },
    () => ({
      x: 0.2 + random() * 0.6,
      y: 0.2 + random() * 0.6,
      radius: 0.15 + random() * 0.19,
    })
  );

  const waveA = random() * Math.PI * 2;
  const waveB = random() * Math.PI * 2;
  const waveC = random() * Math.PI * 2;

  // Create a continent from overlapping land masses.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const nx = (x + 0.5) / columns;
      const ny = (y + 0.5) / rows;

      const coastNoise =
        Math.sin(nx * 21 + waveA) * 0.025 +
        Math.cos(ny * 25 + waveB) * 0.023 +
        Math.sin(
          nx * 36 + ny * 29 + waveC
        ) * 0.014;

      let influence = -Infinity;

      for (const center of continentCenters) {
        const dx = (nx - center.x) * 1.1;
        const dy = (ny - center.y) * 1.35;

        const distance = Math.sqrt(
          dx * dx + dy * dy
        );

        influence = Math.max(
          influence,
          center.radius - distance
        );
      }

      const edgeFade = Math.min(
        nx,
        ny,
        1 - nx,
        1 - ny
      );

      const land =
        influence + coastNoise > 0 &&
        edgeFade > 0.025;

      cells.push({
        x,
        y,
        land,
        province: null,
      });
    }
  }

  const landCells = cells.filter(
    (cell) => cell.land
  );

  if (landCells.length === 0) {
    throw new Error("World has no land");
  }

  const provinceCount = clamp(
    Math.floor(requestedProvinces),
    1,
    Math.min(landCells.length, 300)
  );

  type ProvinceCenter = {
    x: number;
    y: number;
  };

  const centers: ProvinceCenter[] = [];

  // Spread province centers across the land.
  const first =
    landCells[Math.floor(random() * landCells.length)];

  centers.push({
    x: first.x,
    y: first.y,
  });

  while (centers.length < provinceCount) {
    let bestCell: Cell | null = null;
    let bestScore = -Infinity;

    for (let attempt = 0; attempt < 60; attempt++) {
      const candidate =
        landCells[Math.floor(random() * landCells.length)];

      const nearest = Math.min(
        ...centers.map((center) =>
          distanceSquared(
            candidate.x,
            candidate.y,
            center.x,
            center.y
          )
        )
      );

      const score = nearest * (0.8 + random() * 0.4);

      if (score > bestScore) {
        bestScore = score;
        bestCell = candidate;
      }
    }

    if (!bestCell) break;

    centers.push({
      x: bestCell.x,
      y: bestCell.y,
    });
  }

  // Assign each land cell to its nearest province center.
  for (const cell of cells) {
    if (!cell.land) continue;

    let nearestIndex = 0;
    let nearestDistance = Infinity;

    for (let i = 0; i < centers.length; i++) {
      const center = centers[i];

      const distance = distanceSquared(
        cell.x,
        cell.y,
        center.x,
        center.y
      );

      if (distance < nearestDistance) {
        nearestDistance = distance;
        nearestIndex = i;
      }
    }

    cell.province = nearestIndex;
  }

  const neighbors = Array.from(
    { length: centers.length },
    () => new Set<number>()
  );

  // Neighboring cells determine province borders.
  for (let y = 0; y < rows; y++) {
    for (let x = 0; x < columns; x++) {
      const cell = cells[y * columns + x];

      if (cell.province === null) continue;

      const right =
        x + 1 < columns
          ? cells[y * columns + x + 1]
          : null;

      const bottom =
        y + 1 < rows
          ? cells[(y + 1) * columns + x]
          : null;

      for (const other of [right, bottom]) {
        if (
          other?.province === null ||
          other?.province === undefined ||
          other.province === cell.province
        ) {
          continue;
        }

        neighbors[cell.province].add(
          other.province
        );

        neighbors[other.province].add(
          cell.province
        );
      }
    }
  }

  const usedNames = new Set<string>();

  const provinces: GeneratedProvince[] =
    centers.map((center, index) => {
      const polygon = tracePolygon(
        cells,
        columns,
        rows,
        index,
        cellWidth,
        cellHeight
      );

      return {
        province_number: index + 1,
        name: generateName(random, usedNames),
        terrain: chooseTerrain(random),
        center_x:
          Math.round(
            (center.x + 0.5) * cellWidth * 100
          ) / 100,
        center_y:
          Math.round(
            (center.y + 0.5) * cellHeight * 100
          ) / 100,
        polygon,
        neighbor_numbers: Array.from(
          neighbors[index]
        )
          .map((neighbor) => neighbor + 1)
          .sort((a, b) => a - b),
      };
    });

  return {
    width,
    height,
    seed,
    provinces,
  };
}
