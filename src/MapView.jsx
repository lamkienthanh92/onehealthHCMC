import { useEffect, useRef } from "react";
import L from "leaflet";
import "leaflet/dist/leaflet.css";
import { SOURCE_CATS } from "./sourceUtils.js";
import { color } from "./theme.js";

// Fix default marker icons (Leaflet + bundlers issue)
delete L.Icon.Default.prototype._getIconUrl;
L.Icon.Default.mergeOptions({
  iconRetinaUrl:
    "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon-2x.png",
  iconUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-icon.png",
  shadowUrl: "https://unpkg.com/leaflet@1.9.4/dist/images/marker-shadow.png",
});

// Show at most this many nearest sources per category as map markers,
// to keep the map fast and legible.
const MAX_MARKERS_PER_CAT = 8;

export function MapView({ point, sourceDists, ward, closestRoad }) {
  const mapRef = useRef(null);
  const containerRef = useRef(null);
  const layerRef = useRef(null);

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

  useEffect(() => {
    const map = mapRef.current;
    if (!map || !point) return;

    if (layerRef.current) {
      layerRef.current.remove();
    }
    const group = L.layerGroup().addTo(map);
    layerRef.current = group;

    // Main point marker
    L.marker([point.lat, point.lng])
      .addTo(group)
      .bindPopup("<b>📍 Measured location</b>");

    // Ward boundary outline
    if (ward) {
      const latlngs = ward.polygons.map((poly) =>
        poly.map((ring) => ring.map(([lng, lat]) => [lat, lng]))
      );
      latlngs.forEach((poly) => {
        L.polygon(poly, {
          color: color.forestSoft,
          weight: 2,
          fillColor: color.sage,
          fillOpacity: 0.08,
        })
          .addTo(group)
          .bindPopup(`<b>Phường/Xã:</b> ${ward.name}`);
      });
    }

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

  return (
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
  );
}
