import { GRID_META, LANDCOVER_LABELS } from "./oneHealthGrids.js";
import { color, font, card as cardBase, eyebrow } from "./theme.js";

const card = {
  ...cardBase,
  borderLeft: `3px solid ${color.forestSoft}`,
};

function fmt(key, v) {
  if (v === null || v === undefined) return "N/A";
  if (key === "landcover") return `${LANDCOVER_LABELS[v] ?? "?"} (class ${v})`;
  return v;
}

const ROWS = [
  ["population", "👥"],
  ["no2", "🌫️"],
  ["so2", "🏭"],
  ["co", "🚗"],
  ["o3", "☀️"],
  ["lst", "🌡️"],
  ["nightlights", "🌃"],
  ["builtup", "🏙️"],
  ["water", "🌊"],
  ["elevation", "⛰️"],
  ["landcover", "🗺️"],
  ["treecover", "🌲"],
  ["forestloss", "🪓"],
];

export function OneHealthCard({ oneHealth, ward, loading }) {
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div
        style={{
          display: "flex",
          justifyContent: "space-between",
          alignItems: "center",
          marginBottom: 10,
        }}
      >
        <div style={eyebrow(color.forestSoft)}>
          🌐 One Health Environmental Layers
        </div>
        <div style={{ fontSize: 11, color: color.clay, fontWeight: 700, fontFamily: font.mono }}>
          {ward ? `📍 ${ward.name}` : "Ward: outside HCMC boundary data"}
        </div>
      </div>

      {loading || !oneHealth ? (
        <div style={{ fontSize: 12, color: color.inkFaint }}>Loading…</div>
      ) : (
        <div
          style={{
            display: "grid",
            gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
            gap: 8,
          }}
        >
          {ROWS.map(([key, icon]) => {
            const meta = GRID_META[key];
            return (
              <div
                key={key}
                style={{
                  border: `1px solid ${color.line}`,
                  borderRadius: 10,
                  padding: "6px 10px",
                  background: color.parchment,
                }}
              >
                <div style={{ fontSize: 10, color: color.inkFaint, fontWeight: 600, fontFamily: font.mono }}>
                  {icon} {meta.label.split("(")[0].trim()}
                </div>
                <div style={{ fontSize: 14, fontWeight: 700, color: color.ink, fontFamily: font.mono }}>
                  {fmt(key, oneHealth[key])}
                  {oneHealth[key] !== null && key !== "landcover" && (
                    <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 3 }}>
                      {meta.unit === "idx" ? "" : meta.unit}
                    </span>
                  )}
                </div>
              </div>
            );
          })}
        </div>
      )}
      <p style={{ fontSize: 9, color: color.inkFaint, marginTop: 8, lineHeight: 1.6 }}>
        Sources: Sentinel-5P TROPOMI 2025 (gas indices) · MODIS LST 2025 · VIIRS
        nightlights (12mo) · GHSL 2020 · JRC Global Surface Water 1984–2021 ·
        SRTM 30m · Dynamic World (12mo) · Hansen Global Forest Change 2000–2025 ·
        WorldPop 2024 (population, 100m). Gas indices are relative (scaled
        column density), not calibrated µg/m³.
      </p>
    </div>
  );
}
