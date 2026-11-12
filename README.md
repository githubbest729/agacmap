# Algurg Map Locator (PWA)
Live: https://githubbest729.github.io/agacmap/

Free stack: Leaflet 1.9.4 (bundled in `vendor/leaflet`) + OpenStreetMap tiles. **No API key, no billing.**

1. Upload the contents of this folder to the root of the `agacmap` repo.
2. GitHub → Settings → Pages → Deploy from branch → `main` / root.
3. Set the exact Algurg office coordinates in `js/app.js` (`HQ`).

OSM tiles are for light use (see https://operations.osmfoundation.org/policies/tiles/). For heavy traffic, switch the tile URL to a provider such as MapTiler or Stadia.
