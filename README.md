# Algurg Map Locator (PWA)
Live: https://githubbest729.github.io/agacmap/

Free stack: Leaflet 1.9.4 (bundled in `vendor/leaflet`) + CARTO Voyager tiles (OpenStreetMap data, English labels). **No API key, no billing.**

1. Upload the contents of this folder to the root of the `agacmap` repo.
2. GitHub → Settings → Pages → Deploy from branch → `main` / root.
3. Set the exact Algurg office coordinates in `js/app.js` (`HQ`).

Tile provider is set by `TILE_PROVIDER` at the top of `js/app.js` ('carto', 'osm' or 'stadia'). Check the provider's terms for commercial use: Stadia's free plan is non-commercial only and needs a registered domain.
