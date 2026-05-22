// ============================================================
// POLEN.RS — app.js
//
// Open-Meteo Air Quality API:
//   alder_pollen   (Jova i srodne)
//   birch_pollen   (Breza i srodne)
//   grass_pollen   (Trave i srodne zeljaste)
//   mugwort_pollen (Pelin i srodne)
//   olive_pollen   (Maslina)
//   ragweed_pollen (Ambrozija)
//
// Grupisanje u 3 kategorije:
//   DRVEĆE  → alder_pollen + birch_pollen
//   TRAVE   → grass_pollen
//   KOROVI  → mugwort_pollen + ragweed_pollen
// ============================================================

const CITIES = [
  { name: "Beograd",    region: "Grad Beograd",          lat: 44.8176, lon: 20.4633 },
  { name: "Novi Sad",   region: "Južnobački okrug",      lat: 45.2671, lon: 19.8335 },
  { name: "Niš",        region: "Nišavski okrug",        lat: 43.3209, lon: 21.8958 },
  { name: "Kragujevac", region: "Šumadijski okrug",      lat: 44.0165, lon: 20.9114 },
  { name: "Subotica",   region: "Severnobački okrug",    lat: 46.1004, lon: 19.6678 },
  { name: "Zrenjanin",  region: "Srednjobanatski okrug", lat: 45.3825, lon: 20.3910 },
  { name: "Pančevo",    region: "Južnobanatski okrug",   lat: 44.8708, lon: 20.6406 },
  { name: "Čačak",      region: "Moravički okrug",       lat: 43.8914, lon: 20.3497 },
  { name: "Novi Pazar", region: "Raški okrug",           lat: 43.1367, lon: 20.5120 },
  { name: "Kruševac",   region: "Rasinski okrug",        lat: 43.5831, lon: 21.3320 },
  { name: "Leskovac",   region: "Jablanički okrug",      lat: 42.9981, lon: 21.9461 },
  { name: "Vranje",     region: "Pčinjski okrug",        lat: 42.5497, lon: 21.9000 },
];

// 3 grupe — svaka sadrži API varijable koje se u nju svrstavaju
const GROUPS = [
  {
    id:    "gTree",
    icon:  "🌳",
    title: "Drveće",
    vars:  [
      { key: "alder_pollen", label: "Jova" },
      { key: "birch_pollen", label: "Breza" },
    ],
  },
  {
    id:    "gGrass",
    icon:  "🌿",
    title: "Trave",
    vars:  [
      { key: "grass_pollen", label: "Trave" },
    ],
  },
  {
    id:    "gWeed",
    icon:  "🌾",
    title: "Korovi",
    vars:  [
      { key: "ragweed_pollen", label: "Ambrozija" },
      { key: "mugwort_pollen", label: "Pelin" },
    ],
  },
];

const ALL_VARS = GROUPS.flatMap(g => g.vars.map(v => v.key));

// Chart colors per variable
const COLORS = {
  alder_pollen:   "#6dc86d",
  birch_pollen:   "#b2e0b2",
  grass_pollen:   "#facc15",
  ragweed_pollen: "#f87171",
  mugwort_pollen: "#fb923c",
};
const LABELS = {
  alder_pollen:   "Jova",
  birch_pollen:   "Breza",
  grass_pollen:   "Trave",
  ragweed_pollen: "Ambrozija",
  mugwort_pollen: "Pelin",
};

const cache = {};

// ===== LEVELS =====
function getLevel(val) {
  if (val == null) return { label: "N/A",         cls: "level-low",       color: "#4ade80" };
  if (val < 10)   return { label: "Nizak",        cls: "level-low",       color: "#4ade80" };
  if (val < 30)   return { label: "Umeren",       cls: "level-moderate",  color: "#facc15" };
  if (val < 60)   return { label: "Visok",        cls: "level-high",      color: "#fb923c" };
  if (val < 120)  return { label: "Veoma visok",  cls: "level-very-high", color: "#f87171" };
  return               { label: "Ekstremno",      cls: "level-extreme",   color: "#c084fc" };
}

// Group overall = max of its vars
function groupMax(current, vars) {
  return vars.reduce((m, v) => Math.max(m, current[v.key] ?? 0), 0);
}

function overallMax(current) {
  return ALL_VARS.reduce((m, k) => Math.max(m, current[k] ?? 0), 0);
}

function getTip(max) {
  const lv = getLevel(max);
  const tips = {
    "Nizak":       { title: "Dobri uslovi",          desc: "Niske vrednosti polena. Bezbedno za gotovo sve, uključujući osetljive osobe." },
    "Umeren":      { title: "Umerena koncentracija",  desc: "Blagi simptomi mogući kod alergičara. Jutarnji sati su najrizičniji." },
    "Visok":       { title: "Visoka koncentracija",   desc: "Uzimajte antihistaminike preventivno i smanjite boravak napolju." },
    "Veoma visok": { title: "Veoma visoke vrednosti", desc: "Preporučuje se minimalni boravak napolju. Zatvorite prozore." },
    "Ekstremno":   { title: "Ekstremne vrednosti!",   desc: "Ostanite unutra. Nosite masku napolju. Konsultujte se sa lekarom." },
    "N/A":         { title: "Nema podataka",          desc: "API nije vratio vrednosti. Pokušajte ponovo." },
  };
  return { lv, ...tips[lv.label] };
}

// ===== RENDER CITY GRID =====
function renderCityGrid() {
  document.getElementById("cityGrid").innerHTML = CITIES.map((c, i) => `
    <div class="city-card" id="cc${i}" onclick="loadCity(${i})">
      <div class="city-card-name">${c.name}</div>
      <div class="city-card-region">${c.region}</div>
      <span class="city-card-dot" id="dot${i}"></span>
    </div>
  `).join("");
}

// ===== NAV =====
function goBack() {
  document.getElementById("dashboard").style.display = "none";
  document.getElementById("citySection").style.display = "block";
  document.getElementById("legendSection").style.display = "block";
  window.scrollTo({ top: 0, behavior: "smooth" });
}

// ===== LOAD CITY =====
async function loadCity(idx) {
  document.getElementById("citySection").style.display = "none";
  document.getElementById("legendSection").style.display = "none";

  const dash = document.getElementById("dashboard");
  dash.style.display = "block";

  const city = CITIES[idx];
  document.getElementById("cityName").textContent = city.name;
  document.getElementById("cityCoords").textContent =
    `${city.lat}°N, ${city.lon}°E · ${city.region}`;

  window.scrollTo({ top: 0, behavior: "smooth" });

  if (cache[idx]) { renderData(cache[idx]); return; }

  document.getElementById("results").style.display = "none";
  document.getElementById("loadingWrap").style.display = "flex";

  try {
    const vars = ALL_VARS.join(",");
    const url = `https://air-quality-api.open-meteo.com/v1/air-quality`
      + `?latitude=${city.lat}&longitude=${city.lon}`
      + `&hourly=${vars}&current=${vars}`
      + `&forecast_days=5&timezone=Europe%2FBelgrade`;

    const res = await fetch(url);
    if (!res.ok) throw new Error(`HTTP ${res.status}`);
    const data = await res.json();
    cache[idx] = data;
    renderData(data);

    // Update city dot
    const max = overallMax(data.current || {});
    const lv  = getLevel(max);
    const dot = document.getElementById(`dot${idx}`);
    if (dot) {
      dot.style.background = lv.color;
      dot.style.boxShadow  = `0 0 7px ${lv.color}`;
      document.getElementById(`cc${idx}`).classList.add("loaded");
    }

  } catch(e) {
    document.getElementById("loadingWrap").style.display = "none";
    document.getElementById("results").style.display = "block";
    document.getElementById("tipBar").style.borderLeftColor = "#f87171";
    document.getElementById("tipBadge").textContent = "Greška";
    document.getElementById("tipBadge").className   = "tip-badge level-very-high";
    document.getElementById("tipTitle").textContent  = "Greška pri učitavanju";
    document.getElementById("tipDesc").textContent   = `${e.message} — Pokušajte ponovo.`;
    document.getElementById("groupsWrap").innerHTML  = "";
  }
}

function renderData(data) {
  _lastData = data;
  document.getElementById("loadingWrap").style.display = "none";
  document.getElementById("results").style.display = "block";

  const current = data.current || {};
  const max = overallMax(current);
  const { lv, title, desc } = getTip(max);

  // Tip bar
  document.getElementById("tipBar").style.borderLeftColor = lv.color;
  document.getElementById("tipBadge").textContent = lv.label;
  document.getElementById("tipBadge").className   = `tip-badge ${lv.cls}`;
  document.getElementById("tipTitle").textContent  = title;
  document.getElementById("tipDesc").textContent   = desc;

  // Groups
  document.getElementById("groupsWrap").innerHTML = GROUPS.map((g, gi) => {
    const gMax = groupMax(current, g.vars);
    const gLv  = getLevel(gMax);

    const cards = g.vars.map((v, vi) => {
      const val = current[v.key] ?? null;
      const n   = val !== null ? Math.round(val) : null;
      const lv  = getLevel(n);
      return `
        <div class="pollen-card" style="animation-delay:${(gi * 3 + vi) * 0.06}s">
          <div class="card-glow" style="background:${lv.color}"></div>
          <div class="card-type">${v.label}</div>
          <div class="card-value" style="color:${lv.color}">${n !== null ? n : "—"}</div>
          <div class="card-unit">zrna/m³</div>
          <span class="card-level ${lv.cls}">${lv.label}</span>
        </div>
      `;
    }).join("");

    return `
      <div class="group">
        <div class="group-head">
          <span class="group-icon">${g.icon}</span>
          <span class="group-title">${g.title}</span>
          <span class="group-overall ${gLv.cls}">${gLv.label}</span>
        </div>
        <div class="group-cards">${cards}</div>
      </div>
    `;
  }).join("");

  renderChart(data);
}

// ===== CHART =====
function renderChart(data) {
  const hourly = data.hourly || {};
  const times  = hourly.time || [];
  if (!times.length) { document.getElementById("chartWrap").innerHTML = ""; return; }

  // Daily max
  const days = {};
  times.forEach((t, i) => {
    const day = t.slice(0, 10);
    if (!days[day]) days[day] = {};
    ALL_VARS.forEach(k => {
      const v = (hourly[k] || [])[i];
      if (v != null) days[day][k] = Math.max(days[day][k] || 0, v);
    });
  });

  const dayKeys = Object.keys(days).sort().slice(0, 5);
  let maxVal = 5;
  dayKeys.forEach(d => ALL_VARS.forEach(k => { maxVal = Math.max(maxVal, days[d][k] || 0); }));
  maxVal = Math.ceil(maxVal * 1.2);

  const W = 700, H = 185;
  const P = { t: 12, r: 12, b: 38, l: 40 };
  const cW = W - P.l - P.r, cH = H - P.t - P.b;
  const xS = di => P.l + di * (cW / Math.max(dayKeys.length - 1, 1));
  const yS = v  => P.t + cH - (v / maxVal) * cH;

  const paths = ALL_VARS.map(k => {
    const d = dayKeys.map((day, di) =>
      `${di===0?"M":"L"}${xS(di).toFixed(1)},${yS(days[day][k] || 0).toFixed(1)}`
    ).join(" ");
    return `<path d="${d}" fill="none" stroke="${COLORS[k]}" stroke-width="1.8" stroke-linejoin="round" stroke-linecap="round"/>`;
  });

  const grid = [0, 0.25, 0.5, 0.75, 1].map(f => {
    const y = P.t + cH * (1 - f);
    return `
      <line x1="${P.l}" y1="${y.toFixed(1)}" x2="${W-P.r}" y2="${y.toFixed(1)}" stroke="${getComputedStyle(document.documentElement).getPropertyValue('--chart-grid').trim()}" stroke-width="1"/>
      <text x="${P.l-6}" y="${(y+4).toFixed(1)}" text-anchor="end" font-size="10" fill="${getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim()}">${Math.round(maxVal*f)}</text>
    `;
  });

  const xlabels = dayKeys.map((d, di) => {
    const [,m,dd] = d.split("-");
    return `<text x="${xS(di).toFixed(1)}" y="${H-5}" text-anchor="middle" font-size="11" fill="${getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim()}">${dd}.${m}.</text>`;
  });

  const leg = ALL_VARS.map((k, i) => {
    const lx = 2 + i * 108;
    return `
      <line x1="${lx}" y1="8" x2="${lx+14}" y2="8" stroke="${COLORS[k]}" stroke-width="2"/>
      <text x="${lx+18}" y="12" font-size="10" fill="${getComputedStyle(document.documentElement).getPropertyValue('--chart-text').trim()}">${LABELS[k]}</text>
    `;
  });

  document.getElementById("chartWrap").innerHTML = `
    <svg viewBox="0 0 ${W} ${H}" style="width:100%;min-width:360px" xmlns="http://www.w3.org/2000/svg" font-family="'DM Mono',monospace">
      ${grid.join("")}${paths.join("")}${xlabels.join("")}
    </svg>
    <svg viewBox="0 0 648 16" style="width:100%;max-width:648px;margin-top:8px;display:block" xmlns="http://www.w3.org/2000/svg" font-family="'DM Mono',monospace">
      ${leg.join("")}
    </svg>
  `;
}

// ===== INFO OVERLAY =====
function toggleInfo() {
  const o = document.getElementById("infoOverlay");
  o.style.display = o.style.display === "none" ? "flex" : "none";
}
document.getElementById("infoOverlay").addEventListener("click", e => {
  if (e.target === document.getElementById("infoOverlay")) toggleInfo();
});

// ===== DATE =====
document.getElementById("headerDate").textContent =
  new Date().toLocaleDateString("sr-Latn-RS", { weekday: "long", day: "numeric", month: "long", year: "numeric" });

// ===== INIT =====
renderCityGrid();

// ===== THEME =====
function setTheme(theme) {
  document.documentElement.setAttribute('data-theme', theme);
  localStorage.setItem('polenTheme', theme);
  document.getElementById('optDark').classList.toggle('active',  theme === 'dark');
  document.getElementById('optLight').classList.toggle('active', theme === 'light');
  // Redraw chart so grid/text colors update
  if (_lastData) renderChart(_lastData);
}

// Store last data for chart redraw on theme switch
let _lastData = null;

// Init theme from storage or system preference
(function initTheme() {
  const saved = localStorage.getItem('polenTheme');
  const prefersDark = window.matchMedia('(prefers-color-scheme: dark)').matches;
  const theme = saved || (prefersDark ? 'dark' : 'light');
  document.documentElement.setAttribute('data-theme', theme);
  document.getElementById('optDark').classList.toggle('active',  theme === 'dark');
  document.getElementById('optLight').classList.toggle('active', theme === 'light');
})();
