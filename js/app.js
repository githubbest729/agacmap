'use strict';
/* Algurg Map Locator (Leaflet + CARTO/OpenStreetMap tiles: no API key or billing needed). POI coordinates come from the supplied Google Plus Codes (decoded to ~14 m cells)
   or exact Google Maps URL values (Aster Medical Center, Atlantis Monorail, Aster Clinic Al Barsha). */
/* >>> PASTE ALGURG'S EXACT LAT/LNG ON THE NEXT LINE (replace 25.0990 and 55.1640). <<<
   How: open Algurg in Google Maps, right-click its pin, click the "lat, lng" numbers at the top of the menu to copy.
   NOTE: https://maps.app.goo.gl/zwPVNuzgspFVWzuF8 opens "Dubai World Trade Centre" (25.2233459, 55.2869344),
   not Algurg, so it was NOT used. All distances are measured from this point.
   Temporary test override: add ?hq=25.1234,55.1234 to the page URL. */
const HQ = { name: 'Algurg Automation and Controls', lat: 25.0990, lng: 55.1640 };
(() => { const o = new URLSearchParams(location.search).get('hq'); if (o) { const [a, b] = o.split(',').map(Number);
  if (isFinite(a) && isFinite(b)) { HQ.lat = a; HQ.lng = b; } } })();

/* Straight-line (great-circle) distance in km via the Haversine formula */
function haversineKm(a, b) {
  const R = 6371.0088, rad = d => d * Math.PI / 180;
  const dLat = rad(b.lat - a.lat), dLng = rad(b.lng - a.lng);
  const h = Math.sin(dLat / 2) ** 2 + Math.cos(rad(a.lat)) * Math.cos(rad(b.lat)) * Math.sin(dLng / 2) ** 2;
  return 2 * R * Math.asin(Math.sqrt(h));
}
const fmtKm = km => (km < 10 ? km.toFixed(1) : Math.round(km)) + ' km';

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
PLACES.sort((a, b) => a.km - b.km); // closest first; list and markers share this order

/* ---------- Map tile provider (pick one; all render English/Latin labels) ----------
   'carto'  : CARTO Voyager. No key. Check CARTO's terms before commercial use.
   'osm'    : OpenStreetMap standard. No key, light use only, but labels are Arabic in Dubai.
   'stadia' : Stadia Alidade Smooth. Needs a Stadia account + your domain registered (domain auth); free plan is NON-commercial,
              commercial use needs a paid plan. Without a registered domain its tiles return 401 errors. */
const TILE_PROVIDER = 'carto';
const OSM_ATTR = '&copy; <a href="https://www.openstreetmap.org/copyright" target="_blank" rel="noopener">OpenStreetMap</a> contributors';
const TILE_PROVIDERS = {
  carto:  { url: 'https://basemaps.cartocdn.com/rastertiles/voyager/{z}/{x}/{y}.png?key=cb1_57cr_1_f31ce75418c7d6e7e9f3426f', opts: { subdomains: 'abcd', maxZoom: 20 },
            attr: OSM_ATTR + ' &copy; <a href="https://carto.com/attributions" target="_blank" rel="noopener">CARTO</a>' },
  osm:    { url: 'https://tile.openstreetmap.org/{z}/{x}/{y}.png', opts: { maxZoom: 19 }, attr: OSM_ATTR },
  stadia: { url: 'https://tiles.stadiamaps.com/tiles/alidade_smooth/{z}/{x}/{y}{r}.png', opts: { maxZoom: 20 },
            attr: '&copy; <a href="https://stadiamaps.com/" target="_blank" rel="noopener">Stadia Maps</a> &copy; <a href="https://openmaptiles.org/" target="_blank" rel="noopener">OpenMapTiles</a> ' + OSM_ATTR }
};

const $ = id => document.getElementById(id);
let map, markers = [], hqMarker, mapReady = false, userMarker;
const reduceMotion = matchMedia('(prefers-reduced-motion: reduce)').matches;
const dark = matchMedia('(prefers-color-scheme: dark)');

function toast(msg) {
  const t = $('toast'); t.textContent = msg; t.classList.add('show');
  clearTimeout(toast.id); toast.id = setTimeout(() => t.classList.remove('show'), 2600);
}
const esc = s => s.replace(/[&<>"']/g, c => ({ '&': '&amp;', '<': '&lt;', '>': '&gt;', '"': '&quot;', "'": '&#39;' }[c]));

/* ---------- Places list ---------- */
function renderList(filter = '') {
  const f = filter.trim().toLowerCase();
  const ul = $('list'); ul.innerHTML = '';
  const items = PLACES.map((p, i) => ({ p, i })).filter(({ p }) =>
    !f || (p.name + ' ' + p.type + ' ' + CATS[p.cat].label).toLowerCase().includes(f));
  items.forEach(({ p, i }) => {
    const li = document.createElement('li');
    li.style.setProperty('--i', Math.min(i, 16));
    li.innerHTML = `<button class="item" data-i="${i}">
      <span class="dot" style="background:${CATS[p.cat].color}" aria-hidden="true"></span>
      <span class="txt"><strong>${esc(p.name)}</strong><small>${CATS[p.cat].label} · ${esc(p.type)}</small></span>
      <span class="km">${fmtKm(p.km)}</span></button>`;
    ul.appendChild(li);
  });
  $('no-results').hidden = items.length > 0;
  $('count').textContent = `${items.length} of ${PLACES.length} places`;
}

function toggleSheet(open) {
  const s = $('sheet'); const on = open ?? !s.classList.contains('open');
  s.classList.toggle('open', on); s.setAttribute('aria-hidden', String(!on));
  $('nav-list').setAttribute('aria-pressed', String(on));
  if (on) {
    const l = $('list'); l.classList.remove('stagger'); void l.offsetWidth; l.classList.add('stagger'); // restart cascade
    setTimeout(() => l.classList.remove('stagger'), 1400);
    setTimeout(() => $('q').focus({ preventScroll: true }), 300);
  }
}

/* ---------- Map ---------- */
function popupHTML(p, isHQ) {
  const col = isHQ ? '#0b6e8a' : CATS[p.cat].color;
  const dir = `https://www.google.com/maps/dir/?api=1&destination=${p.lat},${p.lng}`;
  return `<div class="iw"><span class="chip" style="background:${col}">${isHQ ? 'Headquarters' : CATS[p.cat].label}</span>
    <h2>${esc(p.name)}</h2><p>${isHQ ? 'Algurg office · centre of this map' : esc(p.type)}</p>
    ${isHQ ? '' : `<p class="away">${fmtKm(p.km)} away <span>(straight line)</span></p>`}
    <a href="${dir}" target="_blank" rel="noopener">Get directions</a></div>`;
}

/* ---------- Map (Leaflet + OpenStreetMap) ---------- */
const flyTo = (ll, z) => reduceMotion ? map.setView(ll, z, { animate: false }) : map.flyTo(ll, z, { duration: 0.8 });

function focusPlace(i) {
  const p = PLACES[i], m = markers[i];
  if (!mapReady || !m) { toast(p.name); return; }
  toggleSheet(false);
  flyTo([p.lat, p.lng], Math.max(map.getZoom(), 14));
  m.openPopup();
}

// Fit the viewport to Algurg + every place, leaving room for the top bar and bottom nav
function fitAll() {
  if (!mapReady) return;
  const b = L.latLngBounds([[HQ.lat, HQ.lng]]);
  PLACES.forEach(p => b.extend([p.lat, p.lng]));
  const bar = document.querySelector('.bottomnav').offsetHeight + 12;
  map.fitBounds(b, { paddingTopLeft: [24, 90], paddingBottomRight: [24, bar + 24], animate: !reduceMotion });
}

// Coloured SVG pin inside a >=44px tap area (animation lives on the inner svg so Leaflet's positioning isn't disturbed)
function pinIcon(color, scale = 1, pulse = false) {
  const w = Math.round(32 * scale), h = Math.round(40 * scale), bw = Math.max(w, 44), bh = Math.max(h, 44);
  return L.divIcon({
    className: 'pin-hit' + (reduceMotion ? '' : ' drop'),
    iconSize: [bw, bh], iconAnchor: [bw / 2, bh], popupAnchor: [0, -h + 4],
    html: `${pulse ? '<span class="pulse" aria-hidden="true"></span>' : ''}<svg width="${w}" height="${h}" viewBox="0 0 32 40" aria-hidden="true"><path d="M16 39C16 39 2 24 2 14a14 14 0 0 1 28 0c0 10-14 25-14 25z" fill="${color}" stroke="#fff" stroke-width="2.5"/><circle cx="16" cy="14" r="5" fill="#fff"/></svg>`
  });
}

function initMap() {
  if (typeof L === 'undefined') return window.mapFailed();
  try {
    map = L.map('map', { center: [HQ.lat, HQ.lng], zoom: 11, zoomControl: false, zoomSnap: 0.25,
      zoomAnimation: !reduceMotion, fadeAnimation: !reduceMotion, markerZoomAnimation: !reduceMotion });
    L.control.zoom({ position: 'bottomright' }).addTo(map);

    const T = TILE_PROVIDERS[TILE_PROVIDER];
    const tiles = L.tileLayer(T.url, { crossOrigin: true, attribution: T.attr, ...T.opts }).addTo(map);
    const hideSkeleton = () => $('skeleton').classList.add('done');
    tiles.once('load', hideSkeleton); setTimeout(hideSkeleton, 6000);
    let warned = false;
    tiles.on('tileerror', () => { if (!warned) { warned = true; toast(navigator.onLine ? 'Some map tiles failed to load' : 'Offline: showing saved map areas only'); } });

    hqMarker = L.marker([HQ.lat, HQ.lng], { icon: pinIcon('#0b6e8a', 1.5, true), title: HQ.name, alt: HQ.name, zIndexOffset: 1000 })
      .addTo(map).bindPopup(popupHTML(HQ, true), { maxWidth: 260 });
    markers = PLACES.map(p => {
      try {
        return L.marker([p.lat, p.lng], { icon: pinIcon(CATS[p.cat].color), title: p.name, alt: p.name })
          .addTo(map).bindPopup(popupHTML(p), { maxWidth: 260 });
      } catch (e) { console.warn('Marker failed:', p.name, e); return null; }
    });
    mapReady = true;
    fitAll();
    addEventListener('resize', () => { map.invalidateSize(); setTimeout(fitAll, 250); });
  } catch (err) { console.error(err); window.mapFailed(); }
}

window.mapFailed = function () {
  $('skeleton').classList.add('done');
  const msg = document.querySelector('#map-error p');
  if (msg) msg.textContent = 'The map library could not load. Reload the page, or browse the places list below.';
  $('map-error').hidden = false;
};
initMap();

/* ---------- Actions ---------- */
function locate() {
  if (!mapReady) return toast('Map not ready yet');
  if (!navigator.geolocation) return toast('Location is not supported on this device');
  toast('Finding your location…');
  navigator.geolocation.getCurrentPosition(pos => {
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (!userMarker) {
      userMarker = L.marker([c.lat, c.lng], { title: 'You are here', alt: 'You are here',
        icon: L.divIcon({ className: '', html: '<div class="me-dot"></div>', iconSize: [20, 20], iconAnchor: [10, 10] }) }).addTo(map);
    }
    userMarker.setLatLng([c.lat, c.lng]); flyTo([c.lat, c.lng], 14);
  }, () => toast('Location blocked. Allow location access in your browser settings.'), { enableHighAccuracy: true, timeout: 10000 });
}

$('nav-list').onclick = () => toggleSheet();
$('open-list-empty').onclick = () => toggleSheet(true);
$('nav-fit').onclick = () => { toggleSheet(false); fitAll(); };
$('nav-hq').onclick = () => { if (!mapReady) return; toggleSheet(false); flyTo([HQ.lat, HQ.lng], 15); hqMarker.openPopup(); };
$('nav-locate').onclick = locate;
$('q').addEventListener('input', e => renderList(e.target.value));
$('list').addEventListener('click', e => { const b = e.target.closest('.item'); if (b) focusPlace(+b.dataset.i); });
addEventListener('keydown', e => { if (e.key === 'Escape') toggleSheet(false); });
renderList();
if (new URLSearchParams(location.search).get('view') === 'list') toggleSheet(true);

/* ---------- Online / offline ---------- */
const syncNet = () => { $('offline-badge').hidden = navigator.onLine; };
addEventListener('online', syncNet); addEventListener('offline', syncNet); syncNet();

/* ---------- Install prompt ---------- */
let deferred;
const standalone = matchMedia('(display-mode: standalone)').matches || navigator.standalone;
const dismissed = () => { try { return localStorage.getItem('installDismissed') === '1'; } catch { return false; } };
const showInstall = () => { if (!standalone && !dismissed()) $('install').hidden = false; };
addEventListener('beforeinstallprompt', e => { e.preventDefault(); deferred = e; setTimeout(showInstall, 4000); });
addEventListener('appinstalled', () => { $('install').hidden = true; toast('Installed. Find it on your home screen.'); });
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

/* ---------- Service worker ---------- */
if ('serviceWorker' in navigator) {
  addEventListener('load', () => navigator.serviceWorker.register('sw.js').catch(() => {}));
}
