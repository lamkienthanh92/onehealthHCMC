import { POPULATION_GRID } from "./oneHealthGrids.js";
import { pointInWardPolygon } from "./wards.js";

// City-wide average population per 100m grid cell, computed once from the
// full grid (lazy singleton — expensive-ish but only runs once ever).
let _cityAvg = null;
export function getCityAveragePopulation() {
  if (_cityAvg !== null) return _cityAvg;
  let sum = 0,
    n = 0;
  for (const row of POPULATION_GRID.grid) {
    for (const v of row) {
      if (v !== null && v !== undefined) {
        sum += v;
        n++;
      }
    }
  }
  _cityAvg = n ? sum / n : null;
  return _cityAvg;
}

// Average population per 100m grid cell across every grid-cell centroid
// that falls inside the given ward's polygon. Cached per ward name since
// the same ward is likely to be re-queried within a session.
// Returns { avg, cellCount } — cellCount matters because the population
// grid was downsampled to ~1.5km spacing, so small wards often contain
// only 1 grid point. Callers should disclose cellCount so the "average"
// isn't mistaken for a real multi-sample statistic.
const _wardAvgCache = new Map();
export function getWardAveragePopulation(ward) {
  if (!ward) return { avg: null, cellCount: 0 };
  if (_wardAvgCache.has(ward.name)) return _wardAvgCache.get(ward.name);

  const { lats, lons, grid } = POPULATION_GRID;
  let sum = 0,
    n = 0;
  for (let i = 0; i < lats.length; i++) {
    for (let j = 0; j < lons.length; j++) {
      const v = grid[i][j];
      if (v === null || v === undefined) continue;
      if (pointInWardPolygon(lats[i], lons[j], ward)) {
        sum += v;
        n++;
      }
    }
  }
  const result = { avg: n ? sum / n : null, cellCount: n };
  _wardAvgCache.set(ward.name, result);
  return result;
}

// Convenience: build the 3-bar comparison dataset for the population chart.
export function buildPopulationComparison(currentValue, ward) {
  const { avg: wardAvg, cellCount } = getWardAveragePopulation(ward);
  const cityAvg = getCityAveragePopulation();
  return {
    data: [
      { label: "This location", value: currentValue ?? 0 },
      { label: ward ? `${ward.name} avg` : "Ward avg", value: wardAvg ?? 0 },
      { label: "HCMC avg", value: cityAvg ?? 0 },
    ],
    wardCellCount: cellCount,
  };
}
