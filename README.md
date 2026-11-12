# Algurg Map Locator (PWA)

**Live App:** https://githubbest729.github.io/agacmap/

A mobile-first, hands-free Progressive Web App (PWA) built for locating **Algurg Automation and Controls — Corporate Office (Jebel Ali, Dubai)** (`24.9999384, 55.1300456`) and navigating to or from any destination across Dubai and the UAE.

---

## Tech Stack

* **Frontend:** Vanilla JavaScript (ES2022+, zero frameworks, no build step) + CSS3 Glassmorphism UI
* **Map Engine:** Leaflet `1.9.4` (bundled locally in `vendor/leaflet/`)
* **Basemap Tiles:** CARTO Dark Matter (`dark_all`) & Positron (`light_all`) raster tiles (OpenStreetMap data, English labels)
* **Routing & Turn-by-Turn:** OSRM (`router.project-osrm.org`)
* **Search & Reverse Geocoding:** Photon / Komoot (`photon.komoot.io`)
* **Device & PWA APIs:** Screen Wake Lock API, Web Speech API (`speechSynthesis`), Geolocation & DeviceOrientation APIs, Service Worker (`algurg-map-v17`)

---

## Key Features

### In-App Navigation & Routing
* **100% In-App Experience:** Calculates road distance (`km`), driving duration (`min`), and live Dubai arrival time (`Asia/Dubai` / `UTC+4`) directly inside the PWA, with optional external handoff to Google Maps.
* **3-Way Direction Switcher:** Toggle between **From Algurg HQ**, **To Algurg HQ**, and **From my GPS** on any route.
* **Alternative Highway Routes:** Displays selectable alternate routes (e.g., E11 vs. E311) when available and provides collapsible turn-by-turn directions with maneuver icons.
* **Shareable Deep Links:** Copy direct route URLs (`?place=...` or `?dest=...`) that open straight to the active route.

### Hands-Free Car-Mount Drive Mode
* **Screen Wake Lock:** Keeps the phone display awake automatically while Drive mode is active (`AWAKE` indicator) and releases when navigation ends or the tab is hidden.
* **Glanceable Dashboard HUD:** Displays a large maneuver icon, distance to next turn, 2-line instruction banner, and oversized quick controls (**Voice: OFF/ON**, **Repeat**, **Calm Map**, **To HQ**, **End**).
* **Automatic Off-Route Rerouting:** Detects when the vehicle leaves the active route (`> 65 m`) and recalculates from live GPS with a 15-second cooldown.
* **Two-Stage Voice Prompts:** Off by default; when enabled, speaks upcoming turns with distance and gives an approach reminder within `110 m`, plus an on-demand **Repeat** button.
* **Mounted GPS Stability:** Snaps vehicle position and bearing to the active route polyline, prioritizes GPS course over dashboard magnetometer noise at driving speeds, and auto-resumes following after short tunnel/flyover GPS dropouts.
* **Calm Map Mode:** Reduces background map saturation and dims unrelated pins during active navigation.

### UAE Localization, Search & Offline PWA
* **Arabic-to-English Road Translator:** Automatically translates and transliterates Arabic UAE street names from OSRM into readable English (e.g., `Sheikh Zayed Rd`, `Al Khail Rd`, `Al Asayel St`).
* **Smart Place Discovery:** 21 preset Dubai locations sorted by live road distance/time, category filter chips, driver quick-search chips (**Petrol**, **Parking**, **Hospital**, **Metro**, **Mosque**), and tap-anywhere map routing.
* **Zero-Dependency Marker Clustering:** Groups dense pins into interactive cluster badges and spotlights the active destination.
* **Offline-Ready PWA:** Installable on iOS and Android home screens with cached app shell files, offline road-time storage, and pre-warmed Dubai/Jebel Ali map tiles.

---

## Project Structure

```text
agacmap/
├── index.html          # App shell, Drive HUD, Route Card & Places Sheet
├── sw.js               # Service worker (algurg-map-v17) & offline tile cache
├── manifest.json       # PWA manifest & home screen metadata
├── favicon.ico
├── css/
│   └── styles.css      # Responsive glassmorphism theme, Calm Map & HUD styles
├── js/
│   └── app.js          # Map, clustering, OSRM routing, wake lock & voice logic
├── vendor/
│   └── leaflet/        # Bundled Leaflet 1.9.4 JS, CSS & marker assets
├── assets/             # App SVG icon, fonts & social preview image
└── icons/              # PWA home screen & Apple touch icons
