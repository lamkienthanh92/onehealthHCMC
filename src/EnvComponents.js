import { SOURCE_CATS } from "./sourceUtils.js";
import { getNDVIClass } from "./ndvi.js";

const card = {
  background: "#fff",
  border: "1px solid #E5E7EB",
  borderRadius: 14,
  padding: "1rem 1.2rem",
};
const SECTION_LABEL = {
  fontSize: 11,
  fontWeight: 700,
  color: "#374151",
  textTransform: "uppercase",
  letterSpacing: "0.05em",
  marginBottom: 8,
  display: "flex",
  alignItems: "center",
  justifyContent: "space-between",
};

function SourceRow({ source }) {
  const meta = SOURCE_CATS[source.cat];
  const dist = source.dist;
  const isGreen = source.cat === "park" || source.cat === "forest";
  const distColor = isGreen
    ? dist < 200
      ? "#166534"
      : dist < 500
      ? "#15803D"
      : "#6B7280"
    : dist < 200
    ? "#9B1C1C"
    : dist < 500
    ? "#92400E"
    : "#374151";
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid #F9FAFB",
      }}
    >
      <span
        style={{ fontSize: 14, width: 20, textAlign: "center", flexShrink: 0 }}
      >
        {meta.icon}
      </span>
      <div style={{ flex: 1, minWidth: 0 }}>
        <div
          style={{
            fontSize: 11,
            fontWeight: 600,
            color: "#374151",
            overflow: "hidden",
            textOverflow: "ellipsis",
            whiteSpace: "nowrap",
          }}
        >
          {source.name}
        </div>
        <div style={{ fontSize: 10, color: "#9CA3AF" }}>{meta.desc}</div>
      </div>
      <div
        style={{
          fontSize: 13,
          fontWeight: 800,
          color: distColor,
          fontVariantNumeric: "tabular-nums",
          flexShrink: 0,
        }}
      >
        {dist.toLocaleString("en-US")} m
      </div>
    </div>
  );
}

function EmptyRow({ cat }) {
  const meta = SOURCE_CATS[cat];
  return (
    <div
      style={{
        display: "flex",
        alignItems: "center",
        gap: 8,
        padding: "5px 0",
        borderBottom: "1px solid #F9FAFB",
      }}
    >
      <span style={{ fontSize: 14, width: 20, textAlign: "center" }}>
        {meta.icon}
      </span>
      <div style={{ flex: 1 }}>
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>{meta.desc}</div>
      </div>
      <div style={{ fontSize: 11, color: "#D1D5DB" }}>None found</div>
    </div>
  );
}

// ── Pollution Sources Card ────────────────────────────────────────────
export function PollutionSummaryCard({ closest }) {
  const POLL_CATS = [
    "industrial",
    "market",
    "landfill",
    "wastewater",
    "fuel",
    "hospital",
  ];
  return (
    <div style={card}>
      <div style={SECTION_LABEL}>
        <span>🏭 Pollution Sources</span>
      </div>
      {!closest ? (
        <div style={{ fontSize: 11, color: "#D1D5DB" }}>
          Will appear after measurement
        </div>
      ) : (
        POLL_CATS.map((cat) =>
          closest[cat] ? (
            <SourceRow key={cat} source={closest[cat]} />
          ) : (
            <EmptyRow key={cat} cat={cat} />
          )
        )
      )}
    </div>
  );
}

// ── Green Buffer + NDVI/EVI Card ──────────────────────────────────────
export function GreenSummaryCard({ closest, ndvi, evi }) {
  const GREEN_CATS = ["park", "forest"];
  const ndviClass = getNDVIClass(ndvi);
  const eviClass = getNDVIClass(evi);

  return (
    <div style={card}>
      <div style={SECTION_LABEL}>
        <span>🌿 Green Buffer & Vegetation</span>
      </div>

      {/* OSM nearest green sources */}
      {!closest ? (
        <div style={{ fontSize: 11, color: "#D1D5DB" }}>
          Will appear after measurement
        </div>
      ) : (
        GREEN_CATS.map((cat) =>
          closest[cat] ? (
            <SourceRow key={cat} source={closest[cat]} />
          ) : (
            <EmptyRow key={cat} cat={cat} />
          )
        )
      )}

      {/* NDVI / EVI divider */}
      <div
        style={{
          margin: "10px 0 6px",
          borderTop: "1px solid #F3F4F6",
          paddingTop: 8,
        }}
      >
        <div
          style={{
            fontSize: 10,
            fontWeight: 700,
            color: "#9CA3AF",
            textTransform: "uppercase",
            letterSpacing: "0.05em",
            marginBottom: 6,
          }}
        >
          Satellite Vegetation Index · MODIS 2020–2024
        </div>

        {ndvi === null && evi === null ? (
          <div style={{ fontSize: 11, color: "#D1D5DB" }}>
            No satellite data at this location
          </div>
        ) : (
          <div style={{ display: "flex", gap: 12 }}>
            {/* NDVI */}
            <div
              style={{
                flex: 1,
                background: ndviClass.bg,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: ndviClass.color,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                NDVI
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: ndviClass.color,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {ndvi != null ? ndvi.toFixed(3) : "–"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: ndviClass.color,
                  opacity: 0.8,
                  marginTop: 3,
                }}
              >
                {ndviClass.label}
              </div>
              {/* NDVI bar */}
              <div
                style={{
                  marginTop: 5,
                  height: 4,
                  background: "rgba(0,0,0,0.1)",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (((ndvi ?? 0) + 0.2) / 1.2) * 100)
                    )}%`,
                    height: 4,
                    borderRadius: 2,
                    background: ndviClass.bar,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: ndviClass.color,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                range –0.2 to 1.0
              </div>
            </div>

            {/* EVI */}
            <div
              style={{
                flex: 1,
                background: eviClass.bg,
                borderRadius: 8,
                padding: "8px 10px",
              }}
            >
              <div
                style={{
                  fontSize: 10,
                  color: eviClass.color,
                  fontWeight: 700,
                  marginBottom: 2,
                }}
              >
                EVI
              </div>
              <div
                style={{
                  fontSize: 22,
                  fontWeight: 800,
                  color: eviClass.color,
                  lineHeight: 1,
                  fontVariantNumeric: "tabular-nums",
                }}
              >
                {evi != null ? evi.toFixed(3) : "–"}
              </div>
              <div
                style={{
                  fontSize: 10,
                  color: eviClass.color,
                  opacity: 0.8,
                  marginTop: 3,
                }}
              >
                {eviClass.label}
              </div>
              <div
                style={{
                  marginTop: 5,
                  height: 4,
                  background: "rgba(0,0,0,0.1)",
                  borderRadius: 2,
                }}
              >
                <div
                  style={{
                    width: `${Math.max(
                      0,
                      Math.min(100, (((evi ?? 0) + 0.1) / 0.7) * 100)
                    )}%`,
                    height: 4,
                    borderRadius: 2,
                    background: eviClass.bar,
                  }}
                />
              </div>
              <div
                style={{
                  fontSize: 9,
                  color: eviClass.color,
                  opacity: 0.6,
                  marginTop: 2,
                }}
              >
                range –0.1 to 0.6
              </div>
            </div>
          </div>
        )}
      </div>
    </div>
  );
}

// ── Climate Card ──────────────────────────────────────────────────────
function ClimateStat({ label, value, unit, sub }) {
  return (
    <div
      style={{
        display: "flex",
        flexDirection: "column",
        alignItems: "center",
        gap: 2,
        minWidth: 80,
      }}
    >
      <div
        style={{
          fontSize: 10,
          color: "#9CA3AF",
          fontWeight: 600,
          textTransform: "uppercase",
          letterSpacing: "0.05em",
          textAlign: "center",
        }}
      >
        {label}
      </div>
      <div
        style={{
          fontSize: 22,
          fontWeight: 800,
          color: "#111",
          lineHeight: 1,
          fontVariantNumeric: "tabular-nums",
        }}
      >
        {value ?? "–"}
        {value != null && unit && (
          <span style={{ fontSize: 10, fontWeight: 400, marginLeft: 2 }}>
            {unit}
          </span>
        )}
      </div>
      {sub && (
        <div style={{ fontSize: 9, color: "#9CA3AF", textAlign: "center" }}>
          {sub}
        </div>
      )}
    </div>
  );
}

export function ClimateCard({ climate, loading }) {
  return (
    <div style={{ ...card, marginBottom: 12 }}>
      <div style={{ ...SECTION_LABEL, marginBottom: 10 }}>
        <span>🌡️ Climate Normal at Location</span>
        <span style={{ fontSize: 10, color: "#9CA3AF", fontWeight: 400 }}>
          Open-Meteo · 5-year mean 2020–2024 · per-coordinate
        </span>
      </div>
      {loading ? (
        <div style={{ fontSize: 11, color: "#9CA3AF" }}>
          Fetching 5-year climate data… (may take 5–10 s)
        </div>
      ) : climate ? (
        <>
          <div
            style={{
              display: "flex",
              justifyContent: "space-around",
              flexWrap: "wrap",
              gap: 16,
              padding: "4px 0 8px",
            }}
          >
            <ClimateStat
              label="Avg Temp"
              value={climate.tempMean}
              unit="°C"
              sub="annual mean"
            />
            <ClimateStat
              label="Avg Humidity"
              value={climate.humidityMean}
              unit="%"
              sub="annual mean"
            />
            <ClimateStat
              label="Avg Wind"
              value={climate.windMean}
              unit="m/s"
              sub="annual mean"
            />
            <ClimateStat
              label="Annual Rain"
              value={climate.precipAnnual}
              unit="mm"
              sub="avg per year"
            />
          </div>
          <div style={{ fontSize: 10, color: "#D1D5DB", marginTop: 4 }}>
            Based on {climate.nDays.toLocaleString()} daily records (
            {climate.period}) at this coordinate
          </div>
        </>
      ) : (
        <div style={{ fontSize: 11, color: "#D1D5DB" }}>
          Will appear after measurement
        </div>
      )}
    </div>
  );
}
