// Loads /data/grids.json (the ~19MB One Health environmental grids) once,
// caches it in module scope for the rest of the session. Every other
// module that needs grid data (oneHealthGrids.js, populationStats.js,
// MapView.jsx's heatmap) reads through getGrids() rather than importing
// the data directly -- this is what makes it possible to keep the raw
// data OUT of the JS bundle (see oneHealthGrids.js header comment for
// why that matters).

let _grids = null;
let _loadPromise = null;
let _error = null;

export function loadGrids() {
  if (_loadPromise) return _loadPromise;
  _loadPromise = fetch(`${process.env.PUBLIC_URL || ""}/data/grids.json`)
    .then((res) => {
      if (!res.ok) throw new Error(`grids.json fetch failed: HTTP ${res.status}`);
      return res.json();
    })
    .then((data) => {
      _grids = data;
      return data;
    })
    .catch((err) => {
      _error = err;
      throw err;
    });
  return _loadPromise;
}

// Synchronous accessor -- returns null until loadGrids() has resolved.
// Callers that run after the app-level loading gate (see App.jsx) can
// treat this as always-populated; anything that might run earlier must
// handle null.
export function getGrids() {
  return _grids;
}

export function getGridsError() {
  return _error;
}

export function isGridsLoaded() {
  return _grids !== null;
}
