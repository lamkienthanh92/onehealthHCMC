import * as XLSX from "xlsx";
import { ROAD_NAMES } from "./roads.js";
import { ROAD_PM25, getPM25Risk, getScoreRisk } from "./air.js";
import { SOURCE_CATS, SOURCES } from "./sourceUtils.js";
import { lookupNDVI, lookupEVI, getNDVIClass } from "./ndvi.js";
import { lookupOneHealthLayers, LANDCOVER_LABELS } from "./oneHealthGrids.js";
import { findWard } from "./wards.js";

const ALL_CATS = [
  "industrial",
  "market",
  "landfill",
  "wastewater",
  "fuel",
  "hospital",
  "park",
  "forest",
  "school",
  "clinic",
  "veterinary",
  "farm",
  "recreation",
  "butcher",
  "publicinfra",
];

// ── Sheet 1: Patient Results (1 row per patient, summary columns) ─────
function buildPatientSheet(sessions) {
  const catKeys = ALL_CATS;

  const header = [
    "#",
    "Patient / Sample ID",
    "Latitude",
    "Longitude",
    "Nearest Road",
    "Min Distance (m)",
    "Home PM2.5 (µg/m³)",
    "PM2.5 Category",
    "Exposure Score",
    "Overall Risk",
    "Measured At",
    // Closest per category
    ...catKeys.flatMap((cat) => [
      `${SOURCE_CATS[cat].desc} — Closest (m)`,
      `${SOURCE_CATS[cat].desc} — Closest Name`,
      `${SOURCE_CATS[cat].desc} — Count nearby`,
    ]),
    // Climate
    "Avg Temp 2020–2024 (°C)",
    "Avg Humidity 2020–2024 (%)",
    "Avg Wind 2020–2024 (m/s)",
    "Annual Rainfall 2020–2024 (mm/yr)",
    "NDVI (MODIS 2020–2024)",
    "NDVI Class",
    "EVI (MODIS 2020–2024)",
    "EVI Class",
    // One Health expansion — administrative
    "Ward / Phường",
    // One Health expansion — environment
    "Population (people/100m cell, WorldPop 2024)",
    "NO2 (Sentinel-5P idx, 2025)",
    "SO2 (Sentinel-5P idx, 2025)",
    "CO (Sentinel-5P idx, 2025)",
    "O3 tropospheric (Sentinel-5P idx, 2025)",
    "Land Surface Temp (°C, MODIS 2025)",
    "Night Light Radiance (VIIRS, last 12mo)",
    "Built-up Surface (%, GHSL 2020)",
    "Surface Water Occurrence (%, 1984–2021)",
    "Elevation (m, SRTM)",
    "Land Cover Class (Dynamic World)",
    "Tree Canopy Cover 2000 (%, Hansen)",
    "Forest Loss since 2000 (%, Hansen)",
    // Road distances
    ...ROAD_NAMES.map((n) => `Road: ${n} (m)`),
    ...ROAD_NAMES.map((n) => `PM2.5: ${n} (µg/m³)`),
  ];

  const rows = sessions.map((s, i) => {
    const dm = Object.fromEntries(s.dists.map((d) => [d.name, d.dist]));
    const stats = s.sourceStats || {};
    const climat = s.climate || {};
    return [
      i + 1,
      s.patientName || "",
      s.geo.lat,
      s.geo.lng,
      s.closest.name,
      s.minDist,
      s.pm25 ?? "N/A",
      getPM25Risk(s.pm25).label,
      s.score,
      getScoreRisk(s.score).label,
      s.timestamp,
      ...catKeys.flatMap((cat) => [
        stats[`${cat}_closest_dist`] ?? "N/A",
        stats[`${cat}_closest_name`] ?? "",
        stats[`${cat}_count`] ?? "N/A",
      ]),
      climat.tempMean ?? "N/A",
      climat.humidityMean ?? "N/A",
      climat.windMean ?? "N/A",
      climat.precipAnnual ?? "N/A",
      lookupNDVI(s.geo.lat, s.geo.lng) ?? "N/A",
      getNDVIClass(lookupNDVI(s.geo.lat, s.geo.lng)).label,
      lookupEVI(s.geo.lat, s.geo.lng) ?? "N/A",
      getNDVIClass(lookupEVI(s.geo.lat, s.geo.lng)).label,
      (() => {
        const w = findWard(s.geo.lat, s.geo.lng);
        return w ? w.name : "N/A (outside HCMC ward boundaries)";
      })(),
      ...(() => {
        const oh = lookupOneHealthLayers(s.geo.lat, s.geo.lng);
        return [
          oh.population ?? "N/A",
          oh.no2 ?? "N/A",
          oh.so2 ?? "N/A",
          oh.co ?? "N/A",
          oh.o3 ?? "N/A",
          oh.lst ?? "N/A",
          oh.nightlights ?? "N/A",
          oh.builtup ?? "N/A",
          oh.water ?? "N/A",
          oh.elevation ?? "N/A",
          oh.landcover !== null && oh.landcover !== undefined
            ? `${oh.landcover} (${LANDCOVER_LABELS[oh.landcover] ?? "?"})`
            : "N/A",
          oh.treecover ?? "N/A",
          oh.forestloss ?? "N/A",
        ];
      })(),
      ...ROAD_NAMES.map((n) => dm[n] ?? ""),
      ...ROAD_NAMES.map((n) => ROAD_PM25[n] ?? ""),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 4 },
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    { wch: 28 },
    { wch: 14 },
    { wch: 18 },
    { wch: 20 },
    { wch: 14 },
    { wch: 18 },
    { wch: 22 },
    ...catKeys.flatMap(() => [{ wch: 22 }, { wch: 30 }, { wch: 18 }]),
    { wch: 22 },
    { wch: 24 },
    { wch: 22 },
    { wch: 26 },
    { wch: 22 },
    { wch: 26 },
    { wch: 20 },
    { wch: 26 },
    { wch: 26 }, // Ward
    ...Array(13).fill({ wch: 24 }), // One Health environmental columns
    ...ROAD_NAMES.map(() => ({ wch: 16 })),
    ...ROAD_NAMES.map(() => ({ wch: 18 })),
  ];
  return ws;
}

// ── Sheet 2: PM2.5 by Road ────────────────────────────────────────────
function buildRoadSheet() {
  const header = ["Road Name", "PM2.5 centroid (µg/m³)", "WHO 2021 Category"];
  const rows = ROAD_NAMES.map((n) => {
    const v = ROAD_PM25[n];
    return [n, v ?? "N/A", getPM25Risk(v).label];
  });
  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [{ wch: 32 }, { wch: 22 }, { wch: 28 }];
  return ws;
}

// ── Sheets 3–10: One sheet per category ──────────────────────────────
// Rows = patients, Columns = individual sites sorted by distance (patient 1)
function buildCategorySheet(sessions, cat) {
  if (!sessions.length) return XLSX.utils.aoa_to_sheet([["No data"]]);

  // Get all sites for this category from SOURCES (global list, fixed order)
  // Sort by distance to first patient so nearest columns come first
  const allSites = SOURCES.filter((s) => s.cat === cat);

  // Compute distances for first session to determine column order
  const firstDists = sessions[0]?.sourceDists ?? [];
  const firstDistMap = Object.fromEntries(
    firstDists
      .filter((s) => s.cat === cat)
      .map((s) => [`${s.lat},${s.lng}`, s.dist])
  );

  // Sort sites by distance to first patient
  const sortedSites = [...allSites].sort((a, b) => {
    const da = firstDistMap[`${a.lat},${a.lng}`] ?? Infinity;
    const db = firstDistMap[`${b.lat},${b.lng}`] ?? Infinity;
    return da - db;
  });

  // Header row: Patient ID | site1_name (dist) | site2_name ...
  const header = [
    "Patient / Sample ID",
    "Latitude",
    "Longitude",
    ...sortedSites.map((s) => s.name || `${s.lat},${s.lng}`),
  ];

  // Data rows
  const rows = sessions.map((s) => {
    // Build lookup: "lat,lng" -> dist for this session
    const distMap = Object.fromEntries(
      (s.sourceDists ?? [])
        .filter((d) => d.cat === cat)
        .map((d) => [`${d.lat},${d.lng}`, d.dist])
    );
    return [
      s.patientName || "",
      s.geo.lat,
      s.geo.lng,
      ...sortedSites.map((site) => distMap[`${site.lat},${site.lng}`] ?? "N/A"),
    ];
  });

  const ws = XLSX.utils.aoa_to_sheet([header, ...rows]);
  ws["!cols"] = [
    { wch: 22 },
    { wch: 12 },
    { wch: 12 },
    ...sortedSites.map(() => ({ wch: 14 })),
  ];
  return ws;
}

// ── Main export ───────────────────────────────────────────────────────
export function exportExcel(sessions) {
  const wb = XLSX.utils.book_new();

  XLSX.utils.book_append_sheet(
    wb,
    buildPatientSheet(sessions),
    "Patient Results"
  );
  XLSX.utils.book_append_sheet(wb, buildRoadSheet(), "PM2.5 by Road");

  // One sheet per category
  const SHEET_NAMES = {
    industrial: "🏭 Industrial",
    market: "🛒 Markets",
    landfill: "🗑 Landfill",
    wastewater: "💧 Wastewater",
    fuel: "⛽ Fuel Stations",
    hospital: "🏥 Hospitals",
    park: "🌳 Parks",
    forest: "🌿 Forest",
    school: "🎓 Schools",
    clinic: "💊 Clinics",
    veterinary: "🐾 Veterinary",
    farm: "🐄 Farms",
    recreation: "🏃 Recreation",
    butcher: "🥩 Butchers",
    publicinfra: "🚰 Public Infra",
  };

  for (const cat of ALL_CATS) {
    const ws = buildCategorySheet(sessions, cat);
    // Excel sheet names max 31 chars, strip emoji for safety
    const sheetName = SHEET_NAMES[cat]
      .replace(/[^\w\s\-]/g, "")
      .trim()
      .slice(0, 31);
    XLSX.utils.book_append_sheet(wb, ws, sheetName);
  }

  const out = XLSX.write(wb, { bookType: "xlsx", type: "array" });
  const url = URL.createObjectURL(
    new Blob([out], { type: "application/octet-stream" })
  );
  const a = document.createElement("a");
  a.href = url;
  a.download = `copd_hcmc_${new Date().toISOString().slice(0, 10)}.xlsx`;
  a.click();
  URL.revokeObjectURL(url);
}
