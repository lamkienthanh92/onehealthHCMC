import { useState } from "react";
import {
  BarChart,
  Bar,
  XAxis,
  YAxis,
  Tooltip,
  ResponsiveContainer,
  CartesianGrid,
  Cell,
} from "recharts";
import { GRID_META, LANDCOVER_LABELS } from "./oneHealthGrids.js";
import { color, font, card as cardBase, eyebrow } from "./theme.js";
import { buildPopulationComparison } from "./populationStats.js";

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

const BAR_COLORS = [color.clay, color.forestSoft, color.water];

function PopulationChart({ oneHealth, ward }) {
  const { data, wardCellCount } = buildPopulationComparison(
    oneHealth.population,
    ward
  );
  return (
    <div
      style={{
        marginTop: 10,
        padding: "10px 12px",
        background: color.parchment,
        border: `1px solid ${color.line}`,
        borderRadius: 10,
      }}
    >
      <div style={{ height: 140 }}>
        <ResponsiveContainer width="100%" height="100%">
          <BarChart data={data} margin={{ top: 4, right: 8, left: -18, bottom: 4 }}>
            <CartesianGrid vertical={false} stroke={color.line} />
            <XAxis
              dataKey="label"
              tick={{ fontSize: 9, fontFamily: font.mono, fill: color.inkSoft }}
              axisLine={{ stroke: color.line }}
              tickLine={false}
            />
            <YAxis
              tick={{ fontSize: 9, fontFamily: font.mono, fill: color.inkSoft }}
              axisLine={false}
              tickLine={false}
            />
            <Tooltip
              contentStyle={{
                fontSize: 11,
                fontFamily: font.mono,
                border: `1px solid ${color.line}`,
                borderRadius: 6,
              }}
              formatter={(v) => [`${v.toFixed(1)} people`, ""]}
            />
            <Bar dataKey="value" radius={[4, 4, 0, 0]}>
              {data.map((_, i) => (
                <Cell key={i} fill={BAR_COLORS[i % BAR_COLORS.length]} />
              ))}
            </Bar>
          </BarChart>
        </ResponsiveContainer>
      </div>
      <p style={{ fontSize: 9, color: color.inkFaint, marginTop: 6, lineHeight: 1.5 }}>
        {ward
          ? wardCellCount <= 1
            ? `⚠️ Ward average is based on only ${wardCellCount} grid point — the population grid (downsampled to ~1.5km spacing) is coarser than this ward, so "ward avg" here equals the single overlapping cell, not a real multi-point average.`
            : `Ward average computed from ${wardCellCount} population-grid points falling inside "${ward.name}".`
          : "No ward boundary at this location — ward comparison unavailable."}
      </p>
    </div>
  );
}

export function OneHealthCard({ oneHealth, ward, loading }) {
  const [expandedPop, setExpandedPop] = useState(false);

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
        <>
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(auto-fill, minmax(140px, 1fr))",
              gap: 8,
            }}
          >
            {ROWS.map(([key, icon]) => {
              const meta = GRID_META[key];
              const isPop = key === "population";
              return (
                <div
                  key={key}
                  onClick={isPop ? () => setExpandedPop((s) => !s) : undefined}
                  title={`Source: ${meta.source} (${meta.vintage}) · Native sensor resolution: ${meta.nativeRes} · Displayed at: ${meta.displayRes} (downsampled)`}
                  style={{
                    border: `1px solid ${isPop ? color.clay : color.line}`,
                    borderRadius: 10,
                    padding: "6px 10px",
                    background: isPop ? `${color.clay}0D` : color.parchment,
                    cursor: isPop ? "pointer" : "default",
                    position: "relative",
                  }}
                >
                  <div style={{ fontSize: 10, color: color.inkFaint, fontWeight: 600, fontFamily: font.mono, display: "flex", justifyContent: "space-between" }}>
                    <span>{icon} {meta.label.split("(")[0].trim()}</span>
                    {isPop && (
                      <span style={{ color: color.clay, fontSize: 9 }}>
                        {expandedPop ? "▲ hide" : "▼ chart"}
                      </span>
                    )}
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

          {expandedPop && <PopulationChart oneHealth={oneHealth} ward={ward} />}
        </>
      )}
      <p style={{ fontSize: 9, color: color.inkFaint, marginTop: 8, lineHeight: 1.6 }}>
        Sources: Sentinel-5P TROPOMI 2025 (gas indices) · MODIS LST 2025 · VIIRS
        nightlights (12mo) · GHSL 2020 · JRC Global Surface Water 1984–2021 ·
        SRTM 30m · Dynamic World (12mo) · Hansen Global Forest Change 2000–2025 ·
        WorldPop 2024 (population, downsampled ~1.5km spacing — see chart
        caveat when expanded). Gas indices are relative (scaled column
        density), not calibrated µg/m³. Click "Population" tile for a
        location-vs-ward-vs-city comparison chart.
      </p>
    </div>
  );
}
