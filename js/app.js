'use strict';
/* Algurg Map Locator & In-App Navigator (2026 PWA)
   - Map Tiles: CARTO Voyager (Light) & Dark Matter (Dark) with user's CARTO Basemaps API key
   - Routing & Turn-by-Turn: Free keyless OSRM public demo server
   - Anywhere UAE Search & Reverse Geocoding: Free keyless Photon / OpenStreetMap API */

const HQ = { name: 'Algurg Automation and Controls', lat: 24.9999384, lng: 55.1300456 };
(() => {
  const o = new URLSearchParams(location.search).get('hq');
  if (o) {
    const [a, b] = o.split(',').map(Number);
    if (isFinite(a) && isFinite(b)) { HQ.lat = a; HQ.lng = b; }
  }
})();

function haversineKm(a, b) {
  const R = 6371.0088, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = km => (km < 100 ? km.toFixed(1) : Math.round(km)) + ' km';
const fmtMin = m => m < 60 ? `${m} min` : `${Math.floor(m / 60)} hr${m % 60 ? ' ' + (m % 60) + ' min' : ''}`;
function fmtDubaiETA(min) {
  try {
    return new Intl.DateTimeFormat('en-US', {
      timeZone: 'Asia/Dubai', hour: 'numeric', minute: '2-digit', hour12: true
    }).format(new Date(Date.now() + min * 60000));
  } catch {
    return '+' + fmtMin(min);
  }
}

const CATS = {
  landmark: { label: 'Landmark', color: '#c2410c' },
  health:   { label: 'Health',   color: '#be123c' },
  transit:  { label: 'Transit',  color: '#0369a1' },
  leisure:  { label: 'Leisure',  color: '#6d28d9' },
  shopping: { label: 'Shopping', color: '#a16207' },
  business: { label: 'Business', color: '#047857' }
};

const PLACES = [
  { name: 'Dubai World Trade Centre', cat: 'business', type: 'Conference center', lat: 25.223312, lng: 55.286938 },
  { name: 'Ginger & Lace', cat: 'shopping', type: 'Clothing store', lat: 25.229312, lng: 55.319437 },
  { name: 'Ibn Battuta Mall by Dubai Retail', cat: 'shopping', type: 'Shopping mall', lat: 25.044563, lng: 55.120312 },
  { name: 'Fitness First | Battuta Mall', cat: 'leisure', type: 'Gym', lat: 25.048063, lng: 55.121938 },
  { name: "Aster Clinic Emirates Tower's Sheikh Zayed Road", cat: 'health', type: 'Clinic', lat: 25.217938, lng: 55.278687 },
  { name: 'iCare Clinics', cat: 'health', type: 'Hospital', lat: 25.169313, lng: 55.241312 },
  { name: 'iCARE Clinic - Oasis Centre', cat: 'health', type: 'Clinic', lat: 25.168813, lng: 55.241937 },
  { name: 'Aster Medical Center', cat: 'health', type: 'Medical center', lat: 25.0292331, lng: 55.2705119 },
  { name: 'The Gardens Metro Station', cat: 'transit', type: 'Metro station', lat: 25.043688, lng: 55.134437 },
  { name: 'Dubai Aquarium & Underwater Zoo', cat: 'leisure', type: 'Aquarium', lat: 25.197563, lng: 55.278562 },
  { name: 'Burj Khalifa', cat: 'landmark', type: 'Landmark', lat: 25.197187, lng: 55.274437 },
  { name: 'The Dubai Fountain', cat: 'landmark', type: 'Fountain show', lat: 25.195187, lng: 55.275188 },
  { name: 'BURJ AL ARAB BEACH', cat: 'landmark', type: 'Hotel', lat: 25.159813, lng: 55.205438 },
  { name: 'Atlantis Aquaventure Waterpark Monorail Station', cat: 'transit', type: 'Monorail station', lat: 25.1328042, lng: 55.1188256 },
  { name: 'Ski Dubai', cat: 'leisure', type: 'Ski resort', lat: 25.117188, lng: 55.198313 },
  { name: 'Dubai Miracle Garden', cat: 'leisure', type: 'Garden', lat: 25.059812, lng: 55.244563 },
  { name: 'Circle K - Dubai Knowledge Park', cat: 'shopping', type: 'Convenience store', lat: 25.103687, lng: 55.163063 },
  { name: 'Aster Clinic, Arjan', cat: 'health', type: 'Clinic', lat: 25.062188, lng: 55.237812 },
  { name: 'Aster Clinic, Al Barsha', cat: 'health', type: 'Clinic', lat: 25.1127541, lng: 55.2009557 },
  { name: 'Jumeirah Golf Estates Metro Station 1', cat: 'transit', type: 'Metro station', lat: 25.017813, lng: 55.163313 },
  { name: 'Al Maktoum International Airport (DWC)', cat: 'transit', type: 'Airport', lat: 24.885938, lng: 55.158813 }
];

PLACES.forEach(p => { p.km = haversineKm(HQ, p); });
PLACES.sort((a, b) => a.km - b.km);

/* ---------- Driving distance & time (OSRM) ---------- */
const ROUTER = 'https://router.project-osrm.org';
const ROAD_FACTOR = 1.3, AVG_KMH = 50;
const DRIVE_KEY = `algurgDrive:${HQ.lat},${HQ.lng}`;
const road = p => p.drive || { km: p.km * ROAD_FACTOR, min: Math.max(1, Math.round(p.km * ROAD_FACTOR / AVG_KMH * 60)), est: true };
let order = PLACES.map((_, i) => i);
function resort() {
  order.sort((a, b) => {
    const x = road(PLACES[a]), y = road(PLACES[b]);
    return x.km - y.km || x.min - y.min;
  });
}
function saveDrive() {
  try {
    const o = {};
    PLACES.forEach(p => { if (p.drive) o[p.name] = p.drive; });
    localStorage.setItem(DRIVE_KEY, JSON.stringify(o));
  } catch {}
}
function loadSavedDrive() {
  try {
    const o = JSON.parse(localStorage.getItem(DRIVE_KEY) || '{}');
    PLACES.forEach(p => { if (o[p.name]) p.drive = o[p.name]; });
  } catch {}
}
loadSavedDrive(); resort();

/* ---------- Map Tile Providers (User's CARTO Basemaps Key Preserved) ---------- */
const CARTO_KEY = 'cb1_57cr_1_f31ce75418c7d6e7e9f3426f';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const CARTO_ATTR = OSM_ATTR + ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>';
const CARTO_URLS = {
  dark:  `https://basemaps.cartocdn.com/rastertiles/dark_all/{z}/{x}/{y}.png?key=${CARTO_KEY}`,
  light: `https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=${CARTO_KEY}`
};

const $ = id => document.getElementById(id);
let map, tileLayer, markers = [], hqMarker, customMarker = null, mapReady = false, userMarker = null;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;

function toast(msg) {
  const t = $('toast');
  t.textContent = msg;
  t.classList.add('show');
  clearTimeout(toast.id);
  toast.id = setTimeout(() => t.classList.remove('show'), 2800);
}
const esc = s => String(s).replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Light / Dark Theme Management ---------- */
let currentTheme = (() => {
  try { return localStorage.getItem('algurgTheme') || 'dark'; } catch { return 'dark'; }
})();
function applyTheme(theme) {
  currentTheme = theme === 'light' ? 'light' : 'dark';
  document.documentElement.dataset.theme = currentTheme;
  const meta = $('meta-theme');
  if (meta) meta.content = currentTheme === 'light' ? '#f2f5f9' : '#0b131e';
  const ico = $('theme-icon');
  if (ico) {
    ico.innerHTML = currentTheme === 'dark'
      ? '<circle cx="12" cy="12" r="4"/><path d="M12 2v2M12 20v2M4.93 4.93l1.41 1.41M17.66 17.66l1.41 1.41M2 12h2M20 12h2M4.93 19.07l1.41-1.41M17.66 6.34l1.41-1.41"/>'
      : '<path d="M21 12.79A9 9 0 1 1 11.21 3 7 7 0 0 0 21 12.79z"/>';
  }
  if (tileLayer) tileLayer.setUrl(CARTO_URLS[currentTheme]);
  try { localStorage.setItem('algurgTheme', currentTheme); } catch {}
}
applyTheme(currentTheme);

/* ---------- Places List & UAE Anywhere Search ---------- */
let catFilter = 'all', geoResults = [], geoTimer = null;

function buildChips() {
  const box = $('chips');
  const defs = [['all', 'All'], ...['business', 'transit', 'health', 'shopping', 'leisure', 'landmark'].map(k => [k, CATS[k].label])];
  box.innerHTML = defs.map(([k, l]) => `<button type="button" class="chip-btn" data-cat="${k}" aria-pressed="${k === 'all'}">${l}</button>`).join('');
  box.addEventListener('click', e => {
    const b = e.target.closest('.chip-btn');
    if (!b) return;
    catFilter = b.dataset.cat;
    box.querySelectorAll('.chip-btn').forEach(x => x.setAttribute('aria-pressed', String(x === b)));
    renderList($('q').value);
  });
}

function renderList(filter = '') {
  const f = filter.trim().toLowerCase();
  $('q-clear').hidden = !f;
  const ul = $('list');
  ul.innerHTML = '';
  const items = order.map((i, n) => ({ p: PLACES[i], i, n })).filter(({ p }) =>
    (catFilter === 'all' || p.cat === catFilter) &&
    (!f || (p.name + ' ' + p.type + ' ' + CATS[p.cat].label).toLowerCase().includes(f)));

  items.forEach(({ p, i }) => {
    const li = document.createElement('li');
    const d = road(p);
    li.innerHTML = `<button type="button" class="item" data-i="${i}">
      <span class="dot" style="background:${CATS[p.cat].color}" aria-hidden="true"></span>
      <span class="txt"><strong>${esc(p.name)}</strong><small>${CATS[p.cat].label} &middot; ${esc(p.type)}</small></span>
      <span class="km"><b>${d.est ? '~' : ''}${fmtKm(d.km)}</b><i>${d.est ? '~' : ''}${fmtMin(d.min)}</i></span></button>`;
    ul.appendChild(li);
  });

  $('no-results').hidden = items.length > 0 || geoResults.length > 0;
  $('count').textContent = `${items.length} of ${PLACES.length} places · Jebel Ali HQ`;
}

async function searchUAE(query) {
  const q = query.trim();
  const wrap = $('geo-wrap'), gl = $('geo-list'), lbl = $('geo-label');
  if (q.length < 3) {
    geoResults = [];
    wrap.hidden = true;
    gl.innerHTML = '';
    renderList(query);
    return;
  }
  lbl.textContent = 'Searching Dubai & UAE…';
  wrap.hidden = false;
  try {
    const url = `https://photon.komoot.io/api/?q=${encodeURIComponent(q)}&lat=${HQ.lat}&lon=${HQ.lng}&limit=6`;
    const j = await fetchJSON(url);
    const feats = (j.features || []).filter(ft => {
      const cc = ft.properties && ft.properties.countrycode;
      return !cc || cc.toUpperCase() === 'AE';
    });
    geoResults = feats.map(ft => {
      const [lng, lat] = ft.geometry.coordinates;
      const pr = ft.properties || {};
      const name = pr.name || pr.street || 'Dubai Location';
      const sub = [pr.district || pr.suburb || pr.city, pr.state].filter(Boolean).join(', ') || 'United Arab Emirates';
      const km = haversineKm(HQ, { lat, lng }) * ROAD_FACTOR;
      const min = Math.max(1, Math.round(km / AVG_KMH * 60));
      return { name, type: sub, lat, lng, km, min, isCustom: true };
    });
    lbl.textContent = geoResults.length ? 'Dubai & UAE Search Results' : 'No extra UAE addresses found';
    gl.innerHTML = geoResults.map((g, idx) => `<li><button type="button" class="item" data-geo="${idx}">
      <span class="dot" style="background:#38bdf8" aria-hidden="true"></span>
      <span class="txt"><strong>${esc(g.name)}</strong><small>${esc(g.type)}</small></span>
      <span class="km"><b>~${fmtKm(g.km)}</b><i>~${fmtMin(g.min)}</i></span></button></li>`).join('');
  } catch {
    lbl.textContent = 'Address search unavailable offline';
    gl.innerHTML = '';
  }
  renderList(query);
}

function toggleSheet(open) {
  const s = $('sheet');
  const on = open ?? !s.classList.contains('open');
  s.classList.toggle('open', on);
  s.setAttribute('aria-hidden', String(!on));
  $('app').classList.toggle('sheet-open', on);
  $('nav-list').setAttribute('aria-pressed', String(on));
  if (on) setTimeout(() => $('q').focus({ preventScroll: true }), 260);
}

/* ---------- Popups & Pins ---------- */
function popupHTML(p, isHQ) {
  const col = isHQ ? '#0284c7' : (p.isCustom ? '#0ea5e9' : CATS[p.cat].color);
  if (isHQ) {
    return `<div class="iw"><span class="chip" style="background:${col}">Corporate Headquarters</span>
      <h2>${esc(p.name)}</h2><p>Jebel Ali Industrial Area, Dubai</p>
      <p class="away">${HQ.lat.toFixed(6)}, ${HQ.lng.toFixed(6)}</p>
      <div class="iw-row">
        <button type="button" class="pill primary" data-act="copy">Copy GPS</button>
        <button type="button" class="pill secondary" data-act="share-hq">Share HQ</button>
      </div></div>`;
  }
  if (p.isCustom) {
    const estKm = haversineKm(HQ, p) * ROAD_FACTOR;
    const estMin = Math.max(1, Math.round(estKm / AVG_KMH * 60));
    return `<div class="iw"><span class="chip" style="background:${col}">Selected Destination</span>
      <h2>${esc(p.name)}</h2><p>${esc(p.type || `${p.lat.toFixed(5)}, ${p.lng.toFixed(5)}`)}</p>
      <p class="away">From Algurg: ~${fmtKm(estKm)} &middot; ~${fmtMin(estMin)} drive</p>
      <div class="iw-row">
        <button type="button" class="pill primary" data-act="route-custom">Show route</button>
        <button type="button" class="pill secondary" data-act="copy-custom">Copy GPS</button>
      </div></div>`;
  }
  const d = road(p);
  const idx = PLACES.indexOf(p);
  return `<div class="iw"><span class="chip" style="background:${col}">${CATS[p.cat].label}</span>
    <h2>${esc(p.name)}</h2><p>${esc(p.type)}</p>
    <p class="away">From Algurg: ${d.est ? '~' : ''}${fmtKm(d.km)} &middot; ~${fmtMin(d.min)} drive <span>(${d.est ? 'estimate' : 'by road'})</span></p>
    <button type="button" class="pill primary" data-act="route" data-i="${idx}">Show route</button></div>`;
}
const POPUP_OPTS = { maxWidth: 275, autoPanPaddingTopLeft: [16, 90], autoPanPaddingBottomRight: [16, 120] };
const refreshPopups = () => markers.forEach((m, i) => m && m.setPopupContent(popupHTML(PLACES[i])));

function pinIcon(color, scale = 1, pulse = false) {
  const w = Math.round(32 * scale), h = Math.round(40 * scale), bw = Math.max(w, 44), bh = Math.max(h, 44);
  return L.divIcon({
    className: 'pin-hit' + (reduceMotion ? '' : ' drop'),
    iconSize: [bw, bh], iconAnchor: [bw / 2, bh], popupAnchor: [0, -h + 4],
    html: `${pulse ? '<span class="pulse" aria-hidden="true"></span>' : ''}<svg width="${w}" height="${h}" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 39C16 39 2 24 2 14a14 14 0 0 1 28 0c0 10-14 25-14 25z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="14" r="5" fill="#fff"/></svg>`
  });
}

function setCustomPin(dest, openPop = true) {
  customDest = dest;
  if (!mapReady) return;
  if (!customMarker) {
    customMarker = L.marker([dest.lat, dest.lng], {
      icon: pinIcon('#0ea5e9', 1.25, true), title: dest.name, zIndexOffset: 900
    }).addTo(map);
  } else {
    customMarker.setLatLng([dest.lat, dest.lng]);
  }
  customMarker.bindPopup(popupHTML(dest), POPUP_OPTS);
  if (openPop) customMarker.openPopup();
}

const flyTo = (ll, z) => reduceMotion ? map.setView(ll, z, { animate: false }) : map.flyTo(ll, z, { duration: 0.75 });

function fitAll() {
  if (!mapReady) return;
  const b = L.latLngBounds([[HQ.lat, HQ.lng]]);
  PLACES.forEach(p => b.extend([p.lat, p.lng]));
  if (customDest) b.extend([customDest.lat, customDest.lng]);
  const bar = document.querySelector('.bottomnav').offsetHeight + 16;
  map.fitBounds(b, { paddingTopLeft: [24, 90], paddingBottomRight: [24, bar + 20], animate: !reduceMotion });
}

/* ---------- In-App Routing, Alternatives, Maneuver Icons & Live GPS Drive ---------- */
let routeGroup, routeSeq = 0, routeMode = 'from', activeTarget = null, activeRoutes = [], activeAltIdx = 0;
let customDest = null, userPos = null, driveWatchId = null;
const routeCache = {};

async function fetchJSON(url) {
  const ac = new AbortController(), t = setTimeout(() => ac.abort(), 9500);
  try {
    const r = await fetch(url, { signal: ac.signal });
    if (!r.ok) throw new Error('HTTP ' + r.status);
    return await r.json();
  } finally {
    clearTimeout(t);
  }
}

function setDrive(p, km, min, est) {
  if (p.isCustom) return;
  p.drive = { km, min, est };
  resort();
  renderList($('q').value);
  refreshPopups();
  saveDrive();
}

function getUserPos() {
  return new Promise((res, rej) => {
    if (userPos && Date.now() - userPos.t < 180000) return res(userPos);
    if (!navigator.geolocation) return rej(new Error('unsupported'));
    navigator.geolocation.getCurrentPosition(
      pos => {
        userPos = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() };
        updateUserDot(userPos);
        res(userPos);
      },
      rej,
      { enableHighAccuracy: true, timeout: 10000 }
    );
  });
}

function updateUserDot(c) {
  if (!mapReady) return;
  if (!userMarker) {
    userMarker = L.marker([c.lat, c.lng], {
      title: 'You are here',
      icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] })
    }).addTo(map);
  } else {
    userMarker.setLatLng([c.lat, c.lng]);
  }
}

function targetObj(t) {
  return typeof t === 'number' ? PLACES[t] : t;
}

function endpoints(t, mode) {
  const p = targetObj(t);
  const h = { lat: HQ.lat, lng: HQ.lng, name: 'Algurg HQ' };
  const pl = { lat: p.lat, lng: p.lng, name: p.name };
  if (mode === 'to') return [pl, h];
  if (mode === 'me') return [{ lat: userPos.lat, lng: userPos.lng, name: 'My GPS location' }, pl];
  return [h, pl];
}

const fmtStepDist = m => m < 1000 ? `${Math.max(10, Math.round(m / 10) * 10)} m` : `${(m / 1000).toFixed(1)} km`;
const compass = b => ['north', 'northeast', 'east', 'southeast', 'south', 'southwest', 'west', 'northwest'][Math.round(((b % 360) + 360) % 360 / 45) % 8];

function maneuverSVG(m = {}) {
  const mod = (m.modifier || '').toLowerCase();
  if (m.type === 'arrive') return '<svg viewBox="0 0 24 24"><path d="M4 15s1-1 4-1 5 2 8 2 4-1 4-1V3s-1 1-4 1-5-2-8-2-4 1-4 1z"/><line x1="4" y1="22" x2="4" y2="15"/></svg>';
  if (m.type === 'roundabout' || m.type === 'rotary') return '<svg viewBox="0 0 24 24"><circle cx="12" cy="12" r="4"/><path d="M12 2v6M12 16v6M16 12h6"/></svg>';
  if (mod.includes('uturn')) return '<svg viewBox="0 0 24 24"><path d="M9 14L4 9l5-5"/><path d="M4 9h10.5a5.5 5.5 0 0 1 5.5 5.5v0a5.5 5.5 0 0 1-5.5 5.5H11"/></svg>';
  if (mod.includes('left')) return '<svg viewBox="0 0 24 24"><polyline points="9 14 4 9 9 4"/><path d="M20 20v-7a4 4 0 0 0-4-4H4"/></svg>';
  if (mod.includes('right')) return '<svg viewBox="0 0 24 24"><polyline points="15 14 20 9 15 4"/><path d="M4 20v-7a4 4 0 0 1 4-4h12"/></svg>';
  return '<svg viewBox="0 0 24 24"><line x1="12" y1="19" x2="12" y2="5"/><polyline points="5 12 12 5 19 12"/></svg>';
}

function stepText(st) {
  const m = st.maneuver || {}, mod = m.modifier || '', name = st.name ? ` onto ${esc(st.name)}` : '';
  switch (m.type) {
    case 'depart': return `Head ${compass(m.bearing_after ?? 0)}${st.name ? ' on ' + esc(st.name) : ''}`;
    case 'arrive': return 'Arrive at destination';
    case 'turn': return `Turn ${mod || 'ahead'}${name}`;
    case 'end of road': return `Turn ${mod || 'ahead'} at end of road${name}`;
    case 'fork': return `Keep ${mod || 'ahead'} at fork${name}`;
    case 'merge': return `Merge ${mod || ''}${name}`.replace('  ', ' ');
    case 'on ramp': case 'off ramp': return `Take ramp ${mod}${name}`.replace('  ', ' ');
    case 'roundabout': case 'rotary': case 'roundabout turn': return `Roundabout exit ${m.exit || ''}${name}`.replace('  ', ' ');
    default: return `Continue ${mod === 'straight' || !mod ? 'straight' : mod}${name}`;
  }
}

function drawRoutes(routes, selectedIdx, est) {
  routeGroup.clearLayers();
  routes.forEach((rt, idx) => {
    if (idx === selectedIdx) return;
    const altLine = L.polyline(rt.line, { className: 'route-alt' }).addTo(routeGroup);
    altLine.on('click', () => selectAltRoute(idx));
  });
  const primary = routes[selectedIdx];
  L.polyline(primary.line, { className: 'route-glow', interactive: false }).addTo(routeGroup);
  L.polyline(primary.line, { className: 'route-casing', interactive: false }).addTo(routeGroup);
  L.polyline(primary.line, { className: 'route-line' + (est ? ' est' : ''), interactive: false }).addTo(routeGroup);
}

function fitRoute(latlngs) {
  const card = $('route-card');
  const cardH = card.hidden ? 0 : card.offsetHeight + 16;
  const bar = document.querySelector('.bottomnav').offsetHeight + 14;
  map.fitBounds(L.latLngBounds(latlngs), {
    paddingTopLeft: [24, 90],
    paddingBottomRight: [24, bar + cardH + 20],
    maxZoom: 15,
    animate: !reduceMotion
  });
}

function stopDriveMode(silent = false) {
  if (driveWatchId !== null) {
    navigator.geolocation.clearWatch(driveWatchId);
    driveWatchId = null;
  }
  $('drive-hud').hidden = true;
  $('app').classList.remove('drive-on');
  if (!silent) toast('Navigation ended');
}

function clearRoute() {
  stopDriveMode(true);
  routeSeq++;
  activeTarget = null;
  activeRoutes = [];
  routeGroup?.clearLayers();
  $('route-card').hidden = true;
  $('app').classList.remove('route-on');
  map?.closePopup();
}

function selectAltRoute(idx) {
  if (!activeRoutes[idx] || activeTarget === null) return;
  activeAltIdx = idx;
  const [o, d] = endpoints(activeTarget, routeMode);
  const rt = activeRoutes[idx];
  drawRoutes(activeRoutes, idx, false);
  paintCard(activeTarget, routeMode, o, d, rt, routeMode === 'me' ? 'Live from your GPS position' : `Route ${idx + 1} of ${activeRoutes.length}`);
}

function paintCard(t, mode, o, d, r, note) {
  const card = $('route-card');
  $('rc-from').textContent = o.name;
  $('rc-to').textContent = d.name;
  card.querySelectorAll('[data-mode]').forEach(b => b.setAttribute('aria-pressed', String(b.dataset.mode === mode)));

  // Alternative route pills
  const altsBox = $('rc-alts');
  if (activeRoutes.length > 1) {
    altsBox.hidden = false;
    altsBox.innerHTML = activeRoutes.map((rt, idx) =>
      `<button type="button" class="alt-btn" data-alt="${idx}" aria-pressed="${idx === activeAltIdx}">Route ${idx + 1} &middot; ${fmtMin(rt.min)}</button>`
    ).join('');
  } else {
    altsBox.hidden = true;
    altsBox.innerHTML = '';
  }

  $('rc-km').textContent = r ? fmtKm(r.km) : '…';
  $('rc-min').textContent = r ? fmtMin(r.min) : '…';
  $('rc-eta').textContent = r ? fmtDubaiETA(r.min) : '…';
  $('rc-note').textContent = note || '';

  const steps = (r && r.steps) || [];
  $('rc-step-count').textContent = String(steps.length);
  if (steps.length > 0) {
    const first = steps[0];
    $('rc-next').hidden = false;
    $('rc-next-ico').innerHTML = maneuverSVG(first.maneuver);
    $('rc-next-txt').textContent = `${stepText(first)}${first.distance > 0 ? ' (' + fmtStepDist(first.distance) + ')' : ''}`;
  } else {
    $('rc-next').hidden = true;
  }

  $('rc-steps').innerHTML = steps.map(st =>
    `<li><span class="step-ico" aria-hidden="true">${maneuverSVG(st.maneuver)}</span><span class="step-txt">${stepText(st)}</span><small>${st.distance > 0 ? fmtStepDist(st.distance) : ''}</small></li>`
  ).join('');

  $('rc-ext').href = `https://www.google.com/maps/dir/?api=1&origin=${o.lat},${o.lng}&destination=${d.lat},${d.lng}&travelmode=driving`;
  card.hidden = false;
  $('app').classList.add('route-on');
  map?.closePopup(); // Keep route line & card 100% unobstructed
}

async function showRoute(t, mode = routeMode) {
  if (!mapReady) return;
  stopDriveMode(true);
  const seq = ++routeSeq;
  activeTarget = t;
  activeAltIdx = 0;

  if (mode === 'me') {
    toast('Finding your GPS location…');
    try {
      await getUserPos();
    } catch {
      toast('GPS unavailable. Routing from Algurg HQ instead.');
      mode = 'from';
    }
    if (seq !== routeSeq) return;
  }

  routeMode = mode;
  const p = targetObj(t);
  const [o, d] = endpoints(t, mode);
  const idKey = typeof t === 'number' ? `p:${t}` : `c:${p.lat.toFixed(5)},${p.lng.toFixed(5)}`;
  const key = `${idKey}|${mode}|${mode === 'me' ? o.lat.toFixed(3) + ',' + o.lng.toFixed(3) : ''}`;

  let routes = routeCache[key];
  if (!routes) {
    activeRoutes = [];
    const straight = [[o.lat, o.lng], [d.lat, d.lng]];
    paintCard(t, mode, o, d, null, 'Calculating optimal Dubai road route…');
    drawRoutes([{ line: straight }], 0, true);
    fitRoute(straight);

    try {
      const url = `${ROUTER}/route/v1/driving/${o.lng},${o.lat};${d.lng},${d.lat}?overview=full&geometries=geojson&steps=true&alternatives=true`;
      const j = await fetchJSON(url);
      if (!j.routes || !j.routes.length) throw new Error('no route');
      routes = routeCache[key] = j.routes.map(rt => ({
        line: rt.geometry.coordinates.map(([lng, lat]) => [lat, lng]),
        km: rt.distance / 1000,
        min: Math.max(1, Math.round(rt.duration / 60)),
        steps: (rt.legs && rt.legs[0] && rt.legs[0].steps) || []
      }));
      if (mode === 'from' && typeof t === 'number') {
        setDrive(p, routes[0].km, routes[0].min, false);
      }
    } catch (e) {
      console.warn('OSRM route failed', e);
      if (seq === routeSeq) {
        const estKm = haversineKm(o, d) * ROAD_FACTOR;
        const estMin = Math.max(1, Math.round(estKm / AVG_KMH * 60));
        paintCard(t, mode, o, d, { km: estKm, min: estMin, steps: [] }, 'Offline / routing server busy — showing straight-line estimate.');
      }
      return;
    }
    if (seq !== routeSeq) return;
  }

  activeRoutes = routes;
  drawRoutes(routes, 0, false);
  paintCard(t, mode, o, d, routes[0], mode === 'me' ? 'Live from your GPS position' : (routes.length > 1 ? `${routes.length} routes available` : 'Fastest route by road'));
  fitRoute(routes[0].line);
}

function startDriveMode() {
  if (activeTarget === null || !activeRoutes[activeAltIdx]) return;
  if (!navigator.geolocation) {
    toast('GPS tracking is not supported on this browser.');
    return;
  }
  const dest = endpoints(activeTarget, routeMode)[1];
  const rt = activeRoutes[activeAltIdx];
  const firstStep = rt.steps[0];

  $('app').classList.add('drive-on');
  $('drive-hud').hidden = false;
  $('hud-icon').innerHTML = maneuverSVG(firstStep ? firstStep.maneuver : {});
  $('hud-step').textContent = firstStep ? stepText(firstStep) : `Drive to ${dest.name}`;
  $('hud-meta').textContent = `${fmtKm(rt.km)} · ${fmtMin(rt.min)} · Arrive ${fmtDubaiETA(rt.min)}`;
  toast('Live GPS guidance started');

  driveWatchId = navigator.geolocation.watchPosition(
    pos => {
      const c = { lat: pos.coords.latitude, lng: pos.coords.longitude, t: Date.now() };
      userPos = c;
      updateUserDot(c);
      map.panTo([c.lat, c.lng], { animate: !reduceMotion });

      const remKm = haversineKm(c, dest) * ROAD_FACTOR;
      const remMin = Math.max(1, Math.round(remKm / AVG_KMH * 60));
      if (remKm < 0.07) {
        $('hud-step').textContent = `Arrived at ${dest.name}`;
        $('hud-meta').textContent = 'Destination reached';
        toast(`Arrived at ${dest.name}!`);
        stopDriveMode(true);
      } else {
        $('hud-meta').textContent = `${fmtKm(remKm)} left · ~${fmtMin(remMin)} · ETA ${fmtDubaiETA(remMin)}`;
      }
    },
    () => {
      toast('Waiting for GPS signal…');
    },
    { enableHighAccuracy: true, maximumAge: 3000, timeout: 10000 }
  );
}

async function loadDriving() {
  const sub = $('sheet-sub');
  try {
    const coords = [HQ, ...PLACES].map(q => `${q.lng},${q.lat}`).join(';');
    const j = await fetchJSON(`${ROUTER}/table/v1/driving/${coords}?sources=0&annotations=duration,distance`);
    const dur = j.durations && j.durations[0], dist = j.distances && j.distances[0];
    if (!dur) throw new Error('no durations');
    PLACES.forEach((p, k) => {
      if (dur[k + 1] == null) return;
      const m = dist && dist[k + 1];
      p.drive = { min: Math.max(1, Math.round(dur[k + 1] / 60)), km: m != null ? m / 1000 : p.km * ROAD_FACTOR, est: m == null };
    });
    sub.textContent = 'Live driving distance & time from Jebel Ali HQ';
  } catch {
    sub.textContent = PLACES.some(p => p.drive) ? 'Saved driving times from Algurg HQ' : 'Estimated driving times (offline fallback)';
  }
  resort();
  renderList($('q').value);
  refreshPopups();
  saveDrive();
}

function copyText(txt) {
  const done = () => toast('Copied: ' + txt);
  if (navigator.clipboard && window.isSecureContext) navigator.clipboard.writeText(txt).then(done, () => toast('Copy failed'));
  else {
    const t = document.createElement('textarea');
    t.value = txt;
    document.body.appendChild(t);
    t.select();
    try { document.execCommand('copy'); done(); } catch { toast('Copy failed'); }
    t.remove();
  }
}

/* ---------- Map Initialization ---------- */
function initMap() {
  if (typeof L === 'undefined') return window.mapFailed();
  try {
    map = L.map('map', {
      center: [HQ.lat, HQ.lng], zoom: 11, zoomControl: false, zoomSnap: 0.25,
      zoomAnimation: !reduceMotion, fadeAnimation: !reduceMotion, markerZoomAnimation: !reduceMotion
    });

    tileLayer = L.tileLayer(CARTO_URLS[currentTheme], {
      crossOrigin: true, attribution: CARTO_ATTR, maxZoom: 20
    }).addTo(map);

    const hideSkeleton = () => $('skeleton').classList.add('done');
    tileLayer.once('load', hideSkeleton);
    setTimeout(hideSkeleton, 5000);

    let warned = false;
    tileLayer.on('tileerror', () => {
      if (!warned) {
        warned = true;
        toast(navigator.onLine ? 'Some map tiles failed to load' : 'Offline: showing cached map areas');
      }
    });

    routeGroup = L.layerGroup().addTo(map);
    hqMarker = L.marker([HQ.lat, HQ.lng], {
      icon: pinIcon('#0284c7', 1.45, true), title: HQ.name, alt: HQ.name, zIndexOffset: 1000
    }).addTo(map).bindPopup(popupHTML(HQ, true), POPUP_OPTS);

    markers = PLACES.map((p, i) => {
      try {
        return L.marker([p.lat, p.lng], { icon: pinIcon(CATS[p.cat].color), title: p.name, alt: p.name })
          .addTo(map)
          .bindPopup(popupHTML(p), POPUP_OPTS)
          .on('click', () => showRoute(i));
      } catch {
        return null;
      }
    });

    // Tap anywhere on the map to drop a destination pin and route from Algurg
    map.on('click', async e => {
      const { lat, lng } = e.latlng;
      const dest = { name: 'Dropped Pin', type: `${lat.toFixed(5)}, ${lng.toFixed(5)}`, lat, lng, isCustom: true };
      setCustomPin(dest, true);
      try {
        const j = await fetchJSON(`https://photon.komoot.io/reverse?lat=${lat}&lon=${lng}`);
        const pr = j.features && j.features[0] && j.features[0].properties;
        if (pr && (pr.name || pr.street || pr.district)) {
          dest.name = pr.name || pr.street || pr.district;
          dest.type = [pr.district || pr.suburb, pr.city || 'Dubai'].filter(Boolean).join(', ');
          setCustomPin(dest, true);
        }
      } catch {}
    });

    mapReady = true;
    fitAll();
    loadDriving();
    addEventListener('resize', () => { map.invalidateSize(); });
  } catch (err) {
    console.error(err);
    window.mapFailed();
  }
}

window.mapFailed = function () {
  $('skeleton').classList.add('done');
  $('map-error').hidden = false;
};
initMap();

/* ---------- UI Event Bindings ---------- */
function locate() {
  if (!mapReady) return toast('Map not ready yet');
  toast('Finding your GPS location…');
  getUserPos().then(
    c => flyTo([c.lat, c.lng], 14),
    () => toast('Location blocked. Allow location access in browser settings.')
  );
}

$('theme-toggle').onclick = () => applyTheme(currentTheme === 'dark' ? 'light' : 'dark');
$('tool-zoom-in').onclick = () => map?.zoomIn();
$('tool-zoom-out').onclick = () => map?.zoomOut();
$('nav-list').onclick = () => toggleSheet();
$('sheet-grab').onclick = () => toggleSheet();
$('open-list-empty').onclick = () => toggleSheet(true);
$('nav-fit').onclick = () => { toggleSheet(false); clearRoute(); fitAll(); };
$('nav-hq').onclick = () => { if (!mapReady) return; toggleSheet(false); clearRoute(); flyTo([HQ.lat, HQ.lng], 15); hqMarker.openPopup(); };
$('nav-locate').onclick = locate;

$('rc-close').onclick = () => { clearRoute(); fitAll(); };
$('rc-drive').onclick = startDriveMode;
$('hud-stop').onclick = () => stopDriveMode(false);

$('route-card').addEventListener('click', e => {
  const modeBtn = e.target.closest('[data-mode]');
  if (modeBtn && activeTarget !== null) showRoute(activeTarget, modeBtn.dataset.mode);
  const altBtn = e.target.closest('[data-alt]');
  if (altBtn) selectAltRoute(+altBtn.dataset.alt);
});

$('rc-share').onclick = () => {
  if (activeTarget === null) return;
  const p = targetObj(activeTarget);
  const modeParam = routeMode === 'to' ? 'to' : 'from';
  const url = typeof activeTarget === 'number'
    ? `${location.origin}${location.pathname}?place=${encodeURIComponent(p.name)}&mode=${modeParam}`
    : `${location.origin}${location.pathname}?dest=${p.lat.toFixed(6)},${p.lng.toFixed(6)}&name=${encodeURIComponent(p.name)}&mode=${modeParam}`;
  copyText(url);
};

document.addEventListener('click', e => {
  const b = e.target.closest('[data-act]');
  if (!b) return;
  const act = b.dataset.act;
  if (act === 'route') showRoute(+b.dataset.i);
  if (act === 'route-custom' && customDest) showRoute(customDest);
  if (act === 'copy') copyText(`${HQ.lat}, ${HQ.lng}`);
  if (act === 'copy-custom' && customDest) copyText(`${customDest.lat.toFixed(6)}, ${customDest.lng.toFixed(6)}`);
  if (act === 'share-hq') copyText(`${location.origin}${location.pathname}`);
});

$('q').addEventListener('input', e => {
  const val = e.target.value;
  renderList(val);
  clearTimeout(geoTimer);
  geoTimer = setTimeout(() => searchUAE(val), 360);
});
$('q-clear').onclick = () => {
  $('q').value = '';
  geoResults = [];
  $('geo-wrap').hidden = true;
  renderList('');
  $('q').focus();
};

$('list').addEventListener('click', e => {
  const b = e.target.closest('.item');
  if (!b) return;
  toggleSheet(false);
  showRoute(+b.dataset.i);
});

$('geo-list').addEventListener('click', e => {
  const b = e.target.closest('[data-geo]');
  if (!b) return;
  const dest = geoResults[+b.dataset.geo];
  if (!dest) return;
  toggleSheet(false);
  setCustomPin(dest, false);
  showRoute(dest);
});

addEventListener('keydown', e => {
  if (e.key === 'Escape') {
    if ($('sheet').classList.contains('open')) toggleSheet(false);
    else if (activeTarget !== null) { clearRoute(); fitAll(); }
  }
});

buildChips();
renderList();

// Handle shared URL parameters (?place=... or ?dest=lat,lng&name=...)
const qp = new URLSearchParams(location.search);
const sharedMode = qp.get('mode') === 'to' ? 'to' : 'from';
const sharedI = PLACES.findIndex(p => p.name === qp.get('place'));
if (sharedI >= 0) {
  setTimeout(() => showRoute(sharedI, sharedMode), 500);
} else if (qp.get('dest')) {
  const [dLat, dLng] = qp.get('dest').split(',').map(Number);
  if (isFinite(dLat) && isFinite(dLng)) {
    const dest = { name: qp.get('name') || 'Shared Destination', type: `${dLat.toFixed(5)}, ${dLng.toFixed(5)}`, lat: dLat, lng: dLng, isCustom: true };
    setTimeout(() => { setCustomPin(dest, false); showRoute(dest, sharedMode); }, 500);
  }
}
if (qp.get('view') === 'list') toggleSheet(true);

/* ---------- Online / Offline Status ---------- */
const syncNet = () => { $('offline-badge').hidden = navigator.onLine; };
addEventListener('online', syncNet);
addEventListener('offline', syncNet);
syncNet();

/* ---------- Install Prompt ---------- */
let deferred;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const dismissed = () => { try { return localStorage.getItem('installDismissed') === '1'; } catch { return false; } };
const showInstall = () => {
  if (!standalone && !dismissed() && !$('app').classList.contains('route-on') && !$('app').classList.contains('sheet-open')) {
    $('install').hidden = false;
  }
};
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; setTimeout(showInstall, 4000); });
addEventListener('appinstalled', () => { $('install').hidden = true; toast('Installed on your home screen!'); });
$('install-yes').onclick = async () => {
  if (deferred) { deferred.prompt(); await deferred.userChoice; deferred = null; }
  $('install').hidden = true;
};
$('install-no').onclick = () => { $('install').hidden = true; try { localStorage.setItem('installDismissed', '1'); } catch {} };
if (/iphone|ipad|ipod/i.test(navigator.userAgent) && !standalone) {
  $('install-text').textContent = 'Tap Share, then “Add to Home Screen”.';
  $('install-yes').textContent = 'Got it';
  setTimeout(showInstall, 5000);
}

/* ---------- Service Worker with Seamless Auto-Update ---------- */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => {
    navigator.serviceWorker.register('sw.js').then(reg => {
      reg.addEventListener('updatefound', () => {
        const nw = reg.installing;
        if (!nw) return;
        nw.addEventListener('statechange', () => {
          if (nw.state === 'installed' && navigator.serviceWorker.controller) {
            nw.postMessage('SKIP_WAITING');
          }
        });
      });
    }).catch(() => {});
    let refreshing = false;
    navigator.serviceWorker.addEventListener('controllerchange', () => {
      if (!refreshing) { refreshing = true; location.reload(); }
    });
  });
}
