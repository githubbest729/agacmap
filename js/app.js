'use strict';
/* Algurg Map Locator — coordinates are approximate; verify and edit below. */
/* >>> SET EXACT OFFICE COORDINATES HERE (right-click the pin in Google Maps and tap the lat,lng to copy). <<<
   Temporary override for testing: add ?hq=25.1234,55.1234 to the page URL. */
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
  { name: 'Dubai World Trade Centre', cat: 'business', type: 'Conference center', lat: 25.2285, lng: 55.2865 },
  { name: 'Ginger & Lace', cat: 'shopping', type: 'Clothing store', lat: 25.0770, lng: 55.1400 },
  { name: 'Ibn Battuta Mall by Dubai Retail', cat: 'shopping', type: 'Shopping mall', lat: 25.0449, lng: 55.1175 },
  { name: 'Fitness First | Battuta Mall', cat: 'leisure', type: 'Gym', lat: 25.0452, lng: 55.1190 },
  { name: "Aster Clinic Emirates Tower's Sheikh Zayed Road", cat: 'health', type: 'Clinic', lat: 25.2170, lng: 55.2820 },
  { name: 'iCare Clinics', cat: 'health', type: 'Hospital', lat: 25.1990, lng: 55.2600 },
  { name: 'iCARE Clinic - Oasis Centre', cat: 'health', type: 'Clinic', lat: 25.1445, lng: 55.2285 },
  { name: 'Aster Medical Center', cat: 'health', type: 'Medical center', lat: 25.2650, lng: 55.3090 },
  { name: 'The Gardens Metro Station', cat: 'transit', type: 'Metro station', lat: 25.0457, lng: 55.1296 },
  { name: 'Dubai Aquarium & Underwater Zoo', cat: 'leisure', type: 'Aquarium', lat: 25.1976, lng: 55.2796 },
  { name: 'Burj Khalifa', cat: 'landmark', type: 'Landmark', lat: 25.1972, lng: 55.2744 },
  { name: 'The Dubai Fountain', cat: 'landmark', type: 'Fountain show', lat: 25.1950, lng: 55.2755 },
  { name: 'BURJ AL ARAB BEACH', cat: 'landmark', type: 'Hotel', lat: 25.1412, lng: 55.1853 },
  { name: 'Atlantis Aquaventure Waterpark Monorail Station', cat: 'transit', type: 'Monorail station', lat: 25.1304, lng: 55.1170 },
  { name: 'Ski Dubai', cat: 'leisure', type: 'Ski resort', lat: 25.1177, lng: 55.2002 },
  { name: 'Dubai Miracle Garden', cat: 'leisure', type: 'Garden', lat: 25.0602, lng: 55.2442 },
  { name: 'Circle K - Dubai Knowledge Park', cat: 'shopping', type: 'Convenience store', lat: 25.0985, lng: 55.1630 },
  { name: 'Aster Clinic, Arjan', cat: 'health', type: 'Clinic', lat: 25.0640, lng: 55.2240 },
  { name: 'Aster Clinic, Al Barsha', cat: 'health', type: 'Clinic', lat: 25.1100, lng: 55.2000 },
  { name: 'Jumeirah Golf Estates Metro Station 1', cat: 'transit', type: 'Metro station', lat: 25.0309, lng: 55.1572 },
  { name: 'Al Maktoum International Airport (DWC)', cat: 'transit', type: 'Airport', lat: 24.8964, lng: 55.1614 }
];

PLACES.forEach(p => { p.km = haversineKm(HQ, p); });
PLACES.sort((a, b) => a.km - b.km); // closest first; list and markers share this order

/* Advanced Markers require a Map ID. 'DEMO_MAP_ID' works for testing; for production create your own
   (Google Cloud Console → Map Management → Create Map ID → JavaScript, Vector) and paste it here. */
const MAP_ID = 'DEMO_MAP_ID';

const $ = id => document.getElementById(id);
let map, info, markers = [], hqMarker, mapReady = false, userMarker, AdvancedMarkerElement, PinElement;
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
  if (on) setTimeout(() => $('q').focus({ preventScroll: true }), 300);
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

function focusPlace(i) {
  const p = PLACES[i];
  if (!mapReady) { toast(p.name); return; }
  toggleSheet(false);
  map.panTo({ lat: p.lat, lng: p.lng });
  if (map.getZoom() < 13) map.setZoom(14);
  info.setContent(popupHTML(p)); info.open({ map, anchor: markers[i] });
}

function fitAll() {
  if (!mapReady) return;
  const b = new google.maps.LatLngBounds();
  PLACES.forEach(p => b.extend(p)); b.extend(HQ);
  const bar = document.querySelector('.bottomnav').offsetHeight + 12;
  map.fitBounds(b, { top: 90, left: 24, right: 24, bottom: bar + 24 });
}

// Builds the DOM content of an Advanced Marker: a coloured pin inside a >=44px tap area
function makePin(color, scale = 1.1) {
  const wrap = document.createElement('div');
  wrap.className = 'pin-hit' + (reduceMotion ? '' : ' drop');
  wrap.appendChild(new PinElement({ background: color, borderColor: '#ffffff', glyphColor: '#ffffff', scale }).element);
  return wrap;
}

window.initMap = async function () {
  try {
    ({ AdvancedMarkerElement, PinElement } = await google.maps.importLibrary('marker'));
    map = new google.maps.Map($('map'), {
      center: HQ, zoom: 11, mapId: MAP_ID, disableDefaultUI: true, gestureHandling: 'greedy',
      clickableIcons: false,
      colorScheme: dark.matches ? google.maps.ColorScheme.DARK : google.maps.ColorScheme.LIGHT
    });
    info = new google.maps.InfoWindow({ maxWidth: 260 });
    hqMarker = new AdvancedMarkerElement({ map, position: HQ, title: HQ.name, zIndex: 999,
      content: makePin('#0b6e8a', 1.6), gmpClickable: true });
    hqMarker.addListener('click', () => { info.setContent(popupHTML(HQ, true)); info.open({ map, anchor: hqMarker }); });
    markers = PLACES.map(p => {
      const m = new AdvancedMarkerElement({ map, position: p, title: p.name,
        content: makePin(CATS[p.cat].color), gmpClickable: true });
      m.addListener('click', () => { info.setContent(popupHTML(p)); info.open({ map, anchor: m }); });
      return m;
    });
    mapReady = true;
    google.maps.event.addListenerOnce(map, 'idle', () => $('skeleton').classList.add('done'));
    fitAll();
    addEventListener('resize', () => setTimeout(fitAll, 250));
  } catch (err) { console.error(err); window.mapFailed(); }
};

window.mapFailed = function () { $('skeleton').classList.add('done'); $('map-error').hidden = false; };
window.gm_authFailure = window.mapFailed; // invalid/missing API key
setTimeout(() => { if (!mapReady) window.mapFailed(); }, 12000);

/* ---------- Actions ---------- */
function locate() {
  if (!mapReady) return toast('Map not ready yet');
  if (!navigator.geolocation) return toast('Location is not supported on this device');
  toast('Finding your location…');
  navigator.geolocation.getCurrentPosition(pos => {
    const c = { lat: pos.coords.latitude, lng: pos.coords.longitude };
    if (!userMarker) {
      const dot = document.createElement('div'); dot.className = 'me-dot';
      userMarker = new AdvancedMarkerElement({ map, position: c, title: 'You are here', content: dot });
    }
    userMarker.position = c; map.panTo(c); map.setZoom(14);
  }, () => toast('Location blocked. Allow location access in your browser settings.'), { enableHighAccuracy: true, timeout: 10000 });
}

$('nav-list').onclick = () => toggleSheet();
$('open-list-empty').onclick = () => toggleSheet(true);
$('nav-fit').onclick = () => { toggleSheet(false); fitAll(); };
$('nav-hq').onclick = () => { if (!mapReady) return; toggleSheet(false); map.panTo(HQ); map.setZoom(15);
  info.setContent(popupHTML(HQ, true)); info.open({ map, anchor: hqMarker }); };
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
