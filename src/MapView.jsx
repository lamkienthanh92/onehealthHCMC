import { useEffect, useRef, useState } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import "leaflet.heat";
import { SOURCE_CATS, SOURCES } from "./sourceUtils.js";
import { getNearbyWards } from "./wards.js";
import { POPULATION_GRID } from "./oneHealthGrids.js";
import { color, font } from "./theme.js";

// Fix default marker icons (Leaflet + bundlers issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

const MAX_MARKERS_PER_CAT = 8;
const POLLUTION_CATS = ["industrial", "landfill", "wastewater", "fuel"];

function buildPopulationHeatPoints() {
  const { lats, lons, grid } = POPULATION_GRID;
  const pts = [];
  let max = 0;
  for (let i = 0; i < lats.length; i++)
    for (let j = 0; j < lons.length; j++) {
      const v = grid[i][j];
      if (v !== null && v !== undefined && v > max) max = v;
    }
  for (let i = 0; i < lats.length; i++)
    for (let j = 0; j < lons.length; j++) {
      const v = grid[i][j];
      if (v === null || v === undefined || v <= 0) continue;
      pts.push([lats[i], lons[j], Math.min(1, v / (max || 1))]);
    }
  return pts;
}

function buildPollutionHeatPoints() {
  return SOURCES.filter((s) => POLLUTION_CATS.includes(s.cat)).map((s) => [
    s.lat,
    s.lng,
    0.6,
  ]);
}

function HeatToggle({ mode, setMode }) {
  const options = [
    ["none", "None"],
    ["population", "Population"],
    ["pollution", "Pollution"],
  ];
  return (
    <div style={{ display: "flex", gap: 5, marginBottom: 8 }}>
      <span
        style={{
          fontSize: 9.5,
          fontFamily: font.mono,
          color: color.inkFaint,
          alignSelf: "center",
          marginRight: 2,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
        }}
      >
        Heatmap:
      </span>
      {options.map(([k, label]) => (
        <button
          key={k}
          onClick={() => setMode(k)}
          style={{
            fontSize: 10,
            fontFamily: font.mono,
            fontWeight: 700,
            padding: "4px 10px",
            borderRadius: 6,
            border: "none",
            cursor: "pointer",
            background: mode === k ? color.forest : color.sageMist,
            color: mode === k ? "#fff" : color.inkSoft,
          }}
        >
          {label}
        </button>
      ))}
    </div>
  );
}

export function MapView({ point, sourceDists, ward, closestRoad }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);
  const heatLayerRef = useRef(null);
  const [heatMode, setHeatMode] = useState("none");

  useEffect(() => {
    if (!containerRef.current) return;
    if (!mapRef.current) {
      mapRef.current = L.map(containerRef.current, {
        zoomControl: true,
        attributionControl: true,
      });
      L.tileLayer("https://{s}.tile.openstreetmap.org/{z}/{x}/{y}.png", {
        maxZoom: 19,
        attribution: "&copy; OpenStreetMap contributors",
      }).addTo(mapRef.current);
    }
    return () => {
      if (mapRef.current) {
        mapRef.current.remove();
        mapRef.current = null;
      }
    };
  }, []);

  // Markers + ward boundaries layer
  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point) return;

    if (layerRef.current) layerRef.current.remove();
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    // Main point marker
    L.marker([point.lat, point.lng])
      .addTo(group)
      .bindPopup("<b>📍 Measured location</b>");

    // Multiple ward boundaries in the surrounding area — the containing
    // ward is drawn bold, neighboring wards are drawn as thin context.
    const nearbyWards = getNearbyWards(point.lat, point.lng, 0.02);
    nearbyWards.forEach((w) => {
      const isContaining = ward && w.name === ward.name;
      const latlngs = w.polygons.map((poly) =>
        poly.map((ring) => ring.map(([lng, lat]) => [lat, lng]))
      );
      latlngs.forEach((poly) => {
        L.polygon(poly, {
          color: isContaining ? color.forestSoft : color.inkFaint,
          weight: isContaining ? 2.5 : 1,
          fillColor: isContaining ? color.sage : "transparent",
          fillOpacity: isContaining ? 0.08 : 0,
          opacity: isContaining ? 1 : 0.5,
          dashArray: isContaining ? null : "3,4",
        })
          .addTo(group)
          .bindPopup(`<b>Phường/Xã:</b> ${w.name}`);
      });
    });

    // Nearest sources by category (capped)
    const byCat = {};
    for (const s of sourceDists || []) {
      if (!byCat[s.cat]) byCat[s.cat] = [];
      if (byCat[s.cat].length < MAX_MARKERS_PER_CAT) byCat[s.cat].push(s);
    }
    Object.values(byCat)
      .flat()
      .forEach((s) => {
        const meta = SOURCE_CATS[s.cat];
        L.circleMarker([s.lat, s.lng], {
          radius: 5,
          color: meta?.bar || "#666",
          fillColor: meta?.bar || "#666",
          fillOpacity: 0.85,
          weight: 1,
        })
          .addTo(group)
          .bindPopup(
            `<b>${meta?.icon || ""} ${s.name}</b><br/>${
              meta?.desc || s.cat
            }<br/>${s.dist.toLocaleString()} m away`
          );
      });

    map.setView([point.lat, point.lng], 15);
  }, [point, sourceDists, ward]);

  // Heatmap layer (independent toggle, doesn't require re-searching)
  useEffect(() => {
    const map = mapRef.current;
    if (!map) return;
    if (heatLayerRef.current) {
      heatLayerRef.current.remove();
      heatLayerRef.current = null;
    }
    if (heatMode === "none") return;

    const pts =
      heatMode === "population"
        ? buildPopulationHeatPoints()
        : buildPollutionHeatPoints();

    heatLayerRef.current = L.heatLayer(pts, {
      radius: heatMode === "population" ? 32 : 22,
      blur: 24,
      maxZoom: 17,
      gradient:
        heatMode === "population"
          ? { 0.2: "#E7EEE7", 0.5: "#6B8F71", 0.8: "#1C3B2E", 1: "#8A5A34" }
          : { 0.2: "#FBF1E1", 0.5: "#B4772A", 0.8: "#A13F2B", 1: "#7A2A1B" },
    }).addTo(map);
  }, [heatMode]);

  return (
    <div>
      <HeatToggle mode={heatMode} setMode={setHeatMode} />
      <div
        ref={containerRef}
        style={{
          width: "100%",
          height: 340,
          borderRadius: 14,
          border: `1px solid ${color.line}`,
          overflow: "hidden",
        }}
      />
      <p style={{ fontSize: 9, color: color.inkFaint, marginTop: 6, lineHeight: 1.5 }}>
        Solid boundary = ward containing this point · dashed = neighboring
        wards (context only). Population heatmap uses the downsampled
        ~1.5km grid — expect blocky, not street-level, detail.
      </p>
    </div>
  );
}
