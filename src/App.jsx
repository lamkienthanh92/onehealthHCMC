import { useState, useCallback, useMemo } from "react";
import { ROADS, ROAD_NAMES } from "./roads.js";
import { ROAD_PM25, lookupPM25, getPM25Risk } from "./air.js";
import {
  computeSourceDistances,
  closestPerCategory,
  categoryStats,
  SOURCES,
} from "./sourceUtils.js";
import { fetchClimate } from "./climate.js";
import { lookupNDVI, lookupEVI } from "./ndvi.js";
import {
  PollutionSummaryCard,
  GreenSummaryCard,
  ClimateCard,
} from "./EnvComponents";
import { SourcesTable } from "./sourcesTable";
import { exportExcel } from "./excelExport.js";
import { lookupOneHealthLayers } from "./oneHealthGrids.js";
import { findWard } from "./wards.js";
import { MapView } from "./MapView.jsx";
import { OneHealthCard } from "./OneHealthCard.jsx";
import { DataSourcesTable } from "./DataSourcesTable.jsx";
import { color, font, card, inp, eyebrow, buttonPrimary, topographicSvgDataUri } from "./theme.js";
import { Readout, IconChip, SectionHeader, StatusDot, Icon, CAT_ICON } from "./ui.jsx";

// ── Geometry (road-specific: point-to-segment) ────────────────────────
function haversine(a, b, c, d) {
  const R = 6371000,
    dL = ((c - a) * Math.PI) / 180,
    dG = ((d - b) * Math.PI) / 180;
  const x =
    Math.pow(Math.sin(dL / 2), 2) +
    Math.cos((a * Math.PI) / 180) *
      Math.cos((c * Math.PI) / 180) *
      Math.pow(Math.sin(dG / 2), 2);
  return R * 2 * Math.atan2(Math.sqrt(x), Math.sqrt(1 - x));
}
function p2s(pA, pB, aA, aB, bA, bB) {
  const dx = bB - aB,
    dy = bA - aA,
    ls = dx * dx + dy * dy;
  let t = ls === 0 ? 0 : ((pB - aB) * dx + (pA - aA) * dy) / ls;
  t = Math.max(0, Math.min(1, t));
  return haversine(pA, pB, aA + t * dy, aB + t * dx);
}
function distToRoad(pA, pB, road) {
  const { segs, halfWidth: h } = road;
  if (!segs?.length) return Infinity;
  let m = Infinity;
  for (const seg of segs)
    for (let i = 0; i < seg.length - 1; i++) {
      const d = p2s(pA, pB, seg[i][0], seg[i][1], seg[i + 1][0], seg[i + 1][1]);
      if (d < m) m = d;
    }
  return Math.max(0, Math.round(m - h));
}

// ── Helpers ───────────────────────────────────────────────────────────
function getRoadRisk(d) {
  if (d < 50)
    return { label: "High", color: "#9B1C1C", bg: "#FEF2F2", bar: "#EF4444" };
  if (d < 200)
    return { label: "Med", color: "#92400E", bg: "#FFFBEB", bar: "#F59E0B" };
  return { label: "Low", color: "#166534", bg: "#F0FDF4", bar: "#22C55E" };
}
function parseCoord(s) {
  if (!s?.trim()) return null;
  const m = s.trim().match(/(-?\d+\.?\d*)[,\s]+(-?\d+\.?\d*)/);
  if (!m) return null;
  const a = parseFloat(m[1]),
    b = parseFloat(m[2]);
  if (isNaN(a) || isNaN(b) || a < 10 || a > 11 || b < 106 || b > 107)
    return null;
  return { lat: a, lng: b };
}

export default function App() {
  const [coord, setCoord] = useState("");
  const [name, setName] = useState("");
  const [result, setResult] = useState(null);
  const [err, setErr] = useState("");
  const [asc, setAsc] = useState(true);
  const [tab, setTab] = useState("traffic");
  const [filterCat, setFilterCat] = useState(null);
  const [sessions, setSessions] = useState([]);
  const [envLoading, setEnvLoading] = useState(false);

  const doSearch = useCallback(async () => {
    const p = parseCoord(coord);
    if (!p) {
      setErr("Invalid coordinates — expected format: lat, lng");
      return;
    }
    setErr("");

    const dists = ROAD_NAMES.map((n) => ({
      name: n,
      dist: distToRoad(p.lat, p.lng, ROADS[n]),
    }));
    const minDist = Math.min(...dists.map((d) => d.dist));
    const closest = dists.reduce((a, b) => (a.dist < b.dist ? a : b));
    const pm25 = lookupPM25(p.lat, p.lng);

    const sourceDists = computeSourceDistances(p.lat, p.lng);
    const closestByCat = closestPerCategory(sourceDists);
    const sourceStats = categoryStats(sourceDists);
    const ndvi = lookupNDVI(p.lat, p.lng);
    const evi = lookupEVI(p.lat, p.lng);
    const ward = findWard(p.lat, p.lng);
    const oneHealth = lookupOneHealthLayers(p.lat, p.lng);

    const base = {
      geo: p,
      dists,
      minDist,
      closest,
      pm25,
      patientName: name.trim(),
      timestamp: new Date().toLocaleString("en-US"),
      sourceDists,
      closestByCat,
      sourceStats,
      ndvi,
      evi,
      ward,
      oneHealth,
      climate: null,
    };

    setResult(base);
    setEnvLoading(true);

    const climate = await fetchClimate(p.lat, p.lng);
    const full = { ...base, climate };
    setResult(full);
    setSessions((prev) => [...prev, full]);
    setEnvLoading(false);
  }, [coord, name]);

  const sortedRoads = useMemo(() => {
    if (!result) return [];
    const arr = [...result.dists];
    if (tab === "traffic")
      return arr.sort((a, b) => (asc ? a.dist - b.dist : b.dist - a.dist));
    return arr.sort((a, b) => {
      const pa = ROAD_PM25[a.name] ?? 0,
        pb = ROAD_PM25[b.name] ?? 0;
      return asc ? pa - pb : pb - pa;
    });
  }, [result, asc, tab]);

  const maxDist = result ? Math.max(...result.dists.map((d) => d.dist)) : 1;
  const maxPM25 = Math.max(...ROAD_NAMES.map((n) => ROAD_PM25[n] ?? 0));
  const ok = parseCoord(coord);
  const roadRk = result ? getRoadRisk(result.minDist) : null;
  const pm25Rk = result ? getPM25Risk(result.pm25) : null;

  return (
    <div
      style={{
        fontFamily: font.body,
        maxWidth: 820,
        margin: "0 auto",
        fontSize: 13,
        color: color.ink,
        paddingBottom: "2rem",
      }}
    >
      {/* Header — deep-forest banner with a topographic contour signature */}
      <div
        style={{
          background: `linear-gradient(160deg, ${color.forest} 0%, #16302A 100%)`,
          backgroundImage: `${topographicSvgDataUri()}, linear-gradient(160deg, ${color.forest} 0%, #16302A 100%)`,
          backgroundSize: "480px auto, cover",
          backgroundRepeat: "repeat, no-repeat",
          padding: "1.4rem 0.9rem 1.6rem",
          marginBottom: "1.1rem",
        }}
      >
        <div
          style={{
            display: "flex",
            alignItems: "center",
            gap: 12,
          }}
        >
          <div
            style={{
              width: 42,
              height: 42,
              borderRadius: 10,
              background: "rgba(255,255,255,0.1)",
              border: "1px solid rgba(255,255,255,0.18)",
              display: "flex",
              alignItems: "center",
              justifyContent: "center",
              flexShrink: 0,
            }}
          >
            <svg width="22" height="22" viewBox="0 0 24 24" fill="none">
              <path
                d="M12 21c4.5-4.2 7-7.7 7-11a7 7 0 10-14 0c0 3.3 2.5 6.8 7 11z"
                stroke="#EAF3EC"
                strokeWidth="1.4"
                fill="none"
              />
              <circle cx="12" cy="10" r="2.6" stroke="#EAF3EC" strokeWidth="1.4" />
            </svg>
          </div>
          <div>
            <div
              style={{
                fontSize: 9.5,
                fontWeight: 600,
                color: "#A7C4AE",
                textTransform: "uppercase",
                letterSpacing: "0.14em",
                fontFamily: font.mono,
                marginBottom: 2,
              }}
            >
              Field Exposure Station · HCMC
            </div>
            <h1
              style={{
                fontFamily: font.display,
                fontSize: 22,
                fontWeight: 600,
                color: "#F7F6EF",
                margin: 0,
                letterSpacing: "-0.01em",
              }}
            >
              One Health Exposure Explorer
            </h1>
            <p
              style={{
                fontSize: 11,
                color: "#B7CBBB",
                margin: "4px 0 0",
                fontFamily: font.mono,
              }}
            >
              {ROAD_NAMES.length} roads · {SOURCES.length.toLocaleString()}{" "}
              OSM sources · 168 wards · air · land · water · animal layers
            </p>
          </div>
        </div>
      </div>

      <div style={{ padding: "0 0.85rem" }}>
      {/* Input */}
      <div style={{ ...card, marginBottom: 12 }}>
        <label
          style={{
            ...eyebrow(color.forestSoft),
            display: "block",
            marginBottom: 8,
          }}
        >
          📍 Google Maps Coordinates
          <span
            style={{
              fontWeight: 400,
              color: color.inkFaint,
              fontSize: 10,
              marginLeft: 8,
              textTransform: "none",
              letterSpacing: "normal",
              fontFamily: font.body,
            }}
          >
            right-click → click the coordinate line → paste
          </span>
        </label>
        <div style={{ display: "flex", gap: 10, alignItems: "flex-start" }}>
          <div style={{ flex: 2 }}>
            <input
              style={{
                ...inp,
                borderColor: coord ? color.sage : color.line,
                background: coord ? color.sageMist : color.parchment,
                fontFamily: font.mono,
                fontSize: 14,
              }}
              placeholder="10.758773, 106.649111"
              value={coord}
              onChange={(e) => setCoord(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
              autoFocus
            />
            {!coord ? (
              <div style={{ fontSize: 10, color: color.inkFaint, marginTop: 5 }}>
                Paste coordinates from Google Maps
              </div>
            ) : !ok ? (
              <div style={{ fontSize: 10, color: color.brick, marginTop: 5 }}>
                ⚠ Not recognized — expected "lat, lng"
              </div>
            ) : (
              <div style={{ fontSize: 10, color: color.forestSoft, marginTop: 5 }}>
                ✓ {ok.lat.toFixed(6)}, {ok.lng.toFixed(6)}
              </div>
            )}
          </div>
          <div style={{ flex: 1, minWidth: 0 }}>
            <input
              style={{
                ...inp,
                borderColor: name ? color.water : color.line,
                background: name ? color.waterMist : color.parchment,
              }}
              placeholder="Patient name / Sample ID"
              value={name}
              onChange={(e) => setName(e.target.value)}
              onKeyDown={(e) => e.key === "Enter" && doSearch()}
            />
            <div style={{ fontSize: 10, color: color.inkFaint, marginTop: 5 }}>
              {name ? (
                <span style={{ color: color.water }}>✓ {name}</span>
              ) : (
                "Sample label"
              )}
            </div>
          </div>
          <button
            onClick={doSearch}
            disabled={!ok || envLoading}
            style={{
              ...buttonPrimary,
              flexShrink: 0,
              whiteSpace: "nowrap",
              background: ok && !envLoading ? color.forest : "#D1D5DB",
              cursor: ok && !envLoading ? "pointer" : "not-allowed",
            }}
          >
            {envLoading ? "Loading…" : "Measure"}
          </button>
        </div>
        {err && (
          <div
            style={{
              marginTop: 8,
              fontSize: 12,
              color: color.brick,
              background: color.brickMist,
              borderRadius: 7,
              padding: "7px 12px",
            }}
          >
            {err}
          </div>
        )}
      </div>

      {/* Session bar */}
      {sessions.length > 0 && (
        <div
          style={{
            display: "flex",
            alignItems: "center",
            justifyContent: "space-between",
            marginBottom: 10,
            padding: "8px 14px",
            background: color.sageMist,
            borderRadius: 9,
            border: `1px solid ${color.line}`,
          }}
        >
          <span style={{ fontSize: 12, color: color.inkSoft }}>
            💾 <strong style={{ color: color.ink }}>{sessions.length}</strong>{" "}
            measurement{sessions.length !== 1 ? "s" : ""}
            {sessions.some((s) => s.patientName) && (
              <span style={{ color: color.water, marginLeft: 8 }}>
                ·{" "}
                {[
                  ...new Set(
                    sessions
                      .filter((s) => s.patientName)
                      .map((s) => s.patientName)
                  ),
                ]
                  .slice(0, 3)
                  .join(", ")}
                {sessions.filter((s) => s.patientName).length > 3 ? "…" : ""}
              </span>
            )}
          </span>
          <button
            onClick={() => exportExcel(sessions)}
            style={{
              padding: "6px 16px",
              fontSize: 12,
              fontWeight: 700,
              border: "none",
              borderRadius: 7,
              background: color.forestSoft,
              color: "#fff",
              cursor: "pointer",
              fontFamily: font.body,
            }}
          >
            ⬇ Export Excel ({sessions.length} case
            {sessions.length !== 1 ? "s" : ""})
          </button>
        </div>
      )}

      {/* Results */}
      {result && (
        <>
          {/* 4 metric cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "repeat(4,1fr)",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <Readout
              iconName="ruler"
              tint={color.forestSoft}
              label="Coordinates"
              value={`${result.geo.lat.toFixed(5)}, ${result.geo.lng.toFixed(5)}`}
              meta={result.patientName ? `👤 ${result.patientName}` : null}
              tooltip="User-entered coordinate, as pasted from Google Maps — exact, not gridded."
            />
            <Readout
              iconName="ruler"
              tint={roadRk.bar}
              label="Nearest Road"
              value={result.minDist.toLocaleString("en-US")}
              unit="m"
              meta={result.closest.name}
              statusLabel={roadRk.label}
              tooltip="Source: road geometry inherited from original project (unverified, structurally OSM-like — see Data Sources table below). Distance: exact Haversine point-to-segment, not gridded."
            />
            <Readout
              iconName="cloudRain"
              tint={pm25Rk.bar}
              label="Home PM2.5"
              value={result.pm25 ?? "–"}
              unit="µg/m³"
              meta="NASA ACAG 2023"
              statusLabel={pm25Rk.label}
              tooltip="Source: NASA ACAG V6GL03, 2023. Resolution: 0.05°×0.05° (~5km) — much coarser than a single address; treat as neighborhood-level, not point-level."
            />
            <Readout
              iconName="ward"
              tint={color.clay}
              label="Ward · Population"
              value={
                result.oneHealth?.population != null
                  ? Math.round(result.oneHealth.population)
                  : "–"
              }
              unit="/ 100m cell"
              meta={result.ward ? result.ward.name : "Outside HCMC"}
              tooltip="Source: WorldPop community catalog, 2024. Displayed at ~1.4km grid spacing (downsampled from 100m native) — see Data Sources table below for the full caveat."
            />
          </div>

          {/* Env cards */}
          <div
            style={{
              display: "grid",
              gridTemplateColumns: "1fr 1fr",
              gap: 8,
              marginBottom: 12,
            }}
          >
            <PollutionSummaryCard
              closest={result.closestByCat}
              sourceDists={result.sourceDists}
              loading={false}
            />
            <GreenSummaryCard
              closest={result.closestByCat}
              ndvi={result.ndvi}
              evi={result.evi}
              sourceDists={result.sourceDists}
            />
          </div>

          <ClimateCard climate={result.climate} loading={envLoading} />

          {/* Interactive map — point, ward boundary, nearest sources */}
          <div style={{ marginBottom: 12 }}>
            <MapView
              point={result.geo}
              sourceDists={result.sourceDists}
              ward={result.ward}
              closestRoad={result.closest}
            />
          </div>

          {/* One Health environmental layers */}
          <OneHealthCard
            oneHealth={result.oneHealth}
            ward={result.ward}
            loading={envLoading}
          />

          {/* Full data provenance / resolution disclosure */}
          <DataSourcesTable />

          {/* Bottom table */}
          <div
            style={{ ...card, padding: 0, overflow: "hidden", marginTop: 4 }}
          >
            <div
              style={{
                display: "flex",
                justifyContent: "space-between",
                alignItems: "center",
                padding: "10px 16px",
                borderBottom: "1px solid #F3F4F6",
                gap: 8,
                flexWrap: "wrap",
              }}
            >
              <div style={{ display: "flex", gap: 6 }}>
                {[
                  ["traffic", "Distance"],
                  ["pm25", "Road PM2.5"],
                  ["sources", "All Sources"],
                ].map(([k, lbl]) => (
                  <button
                    key={k}
                    onClick={() => setTab(k)}
                    style={{
                      padding: "6px 13px",
                      fontSize: 10.5,
                      fontWeight: 700,
                      border: "none",
                      borderRadius: 7,
                      cursor: "pointer",
                      fontFamily: font.mono,
                      letterSpacing: "0.03em",
                      textTransform: "uppercase",
                      background: tab === k ? color.forest : color.sageMist,
                      color: tab === k ? "#fff" : color.inkSoft,
                    }}
                  >
                    {lbl}
                  </button>
                ))}
              </div>
              {tab !== "sources" && (
                <button
                  onClick={() => setAsc((s) => !s)}
                  style={{
                    fontSize: 10.5,
                    color: color.inkSoft,
                    border: `1px solid ${color.line}`,
                    background: color.parchment,
                    cursor: "pointer",
                    padding: "5px 11px",
                    borderRadius: 6,
                    fontFamily: font.mono,
                  }}
                >
                  {asc ? "↑ Ascending" : "↓ Descending"}
                </button>
              )}
            </div>

            {tab === "sources" && (
              <SourcesTable
                distances={result.sourceDists}
                filterCat={filterCat}
                setFilterCat={setFilterCat}
                maxVisible={150}
              />
            )}

            {tab !== "sources" && (
              <table
                style={{
                  width: "100%",
                  borderCollapse: "collapse",
                  fontSize: 13,
                }}
              >
                <thead>
                  <tr>
                    {(tab === "traffic"
                      ? [
                          "#",
                          "Road Name",
                          "Distance to Edge",
                          "Road PM2.5",
                          "Risk",
                        ]
                      : [
                          "#",
                          "Road Name",
                          "PM2.5 (µg/m³)",
                          "Distance",
                          "WHO Category",
                        ]
                    ).map((h) => (
                      <th
                        key={h}
                        style={{
                          padding: "8px 14px",
                          textAlign: "left",
                          fontSize: 11,
                          fontWeight: 700,
                          color: color.inkFaint,
                          background: color.parchment,
                          borderBottom: `1px solid ${color.line}`,
                          fontFamily: font.mono,
                          whiteSpace: "nowrap",
                        }}
                      >
                        {h}
                      </th>
                    ))}
                  </tr>
                </thead>
                <tbody>
                  {sortedRoads.map((r, i) => {
                    const isC = r.name === result.closest.name;
                    const rPM25 = ROAD_PM25[r.name];
                    const rowBg = isC ? "#EFF6FF" : "transparent";
                    const tdBase = {
                      padding: "7px 14px",
                      borderBottom: "1px solid #F9FAFB",
                    };

                    if (tab === "traffic") {
                      const rk = getRoadRisk(r.dist);
                      const prk = getPM25Risk(rPM25);
                      const pct = Math.min(
                        100,
                        Math.round((r.dist / maxDist) * 100)
                      );
                      return (
                        <tr key={r.name} style={{ background: rowBg }}>
                          <td
                            style={{
                              ...tdBase,
                              color: "#D1D5DB",
                              fontSize: 11,
                              width: 28,
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              ...tdBase,
                              fontWeight: isC ? 700 : 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isC && (
                              <span
                                style={{ color: "#2563EB", marginRight: 5 }}
                              >
                                ★
                              </span>
                            )}
                            {r.name}
                          </td>
                          <td style={tdBase}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 60,
                                  height: 4,
                                  background: color.line,
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: 4,
                                    borderRadius: 2,
                                    background: rk.bar,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontVariantNumeric: "tabular-nums",
                                }}
                              >
                                {r.dist.toLocaleString("en-US")} m
                              </span>
                            </div>
                          </td>
                          <td style={tdBase}>
                            <span
                              style={{
                                fontWeight: 600,
                                color: prk.color,
                                fontSize: 12,
                              }}
                            >
                              {rPM25 ?? "–"} µg/m³
                            </span>
                          </td>
                          <td style={tdBase}>
                            <StatusDot label={rk.label} tint={rk.bar} />
                          </td>
                        </tr>
                      );
                    } else {
                      const prk = getPM25Risk(rPM25);
                      const pct = Math.min(
                        100,
                        Math.round(((rPM25 ?? 0) / maxPM25) * 100)
                      );
                      return (
                        <tr key={r.name} style={{ background: rowBg }}>
                          <td
                            style={{
                              ...tdBase,
                              color: "#D1D5DB",
                              fontSize: 11,
                              width: 28,
                            }}
                          >
                            {i + 1}
                          </td>
                          <td
                            style={{
                              ...tdBase,
                              fontWeight: isC ? 700 : 500,
                              whiteSpace: "nowrap",
                            }}
                          >
                            {isC && (
                              <span
                                style={{ color: "#2563EB", marginRight: 5 }}
                              >
                                ★
                              </span>
                            )}
                            {r.name}
                          </td>
                          <td style={tdBase}>
                            <div
                              style={{
                                display: "flex",
                                alignItems: "center",
                                gap: 8,
                              }}
                            >
                              <div
                                style={{
                                  width: 60,
                                  height: 4,
                                  background: color.line,
                                  borderRadius: 2,
                                  flexShrink: 0,
                                }}
                              >
                                <div
                                  style={{
                                    width: `${pct}%`,
                                    height: 4,
                                    borderRadius: 2,
                                    background: prk.bar,
                                  }}
                                />
                              </div>
                              <span
                                style={{
                                  fontWeight: 700,
                                  fontVariantNumeric: "tabular-nums",
                                  color: prk.color,
                                }}
                              >
                                {rPM25 ?? "N/A"} µg/m³
                              </span>
                            </div>
                          </td>
                          <td
                            style={{
                              ...tdBase,
                              color: color.inkFaint,
                              fontSize: 12,
                            }}
                          >
                            {r.dist.toLocaleString("en-US")} m
                          </td>
                          <td style={tdBase}>
                            <StatusDot label={prk.short} tint={prk.bar} />
                          </td>
                        </tr>
                      );
                    }
                  })}
                </tbody>
              </table>
            )}
          </div>

          <p
            style={{
              fontSize: 10,
              color: color.inkFaint,
              marginTop: 8,
              lineHeight: 1.8,
            }}
          >
            Distance to road: Haversine point-to-segment · PM2.5: NASA ACAG
            V6GL03 (2023) 0.05°×0.05° · Sources: OSM via Overpass export (2 296
            sites, offline) · Climate: Open-Meteo 5-year normal 2020–2024 · WHO
            AQG 2021 ≤5 µg/m³
          </p>
        </>
      )}
      </div>
    </div>
  );
}
