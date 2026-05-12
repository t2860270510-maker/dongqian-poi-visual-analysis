const TOPICS = [
  { id: "all", label: "全部 POI", groups: null, insight: "显示全部 POI 样本，用于判断东前街与周边环境的整体功能密度。" },
  { id: "commercial_vitality", label: "商业活力", groups: ["commercial_vitality"], insight: "餐饮、购物、休闲娱乐和住宿构成高频消费与夜间活力基础，适合叠加步行街主轴与节点设计。" },
  { id: "public_service", label: "公共服务", groups: ["public_service"], insight: "医疗、教育、政府公共服务、公共设施等点位用于识别居民服务支撑和公共设施补点方向。" },
  { id: "mobility", label: "交通到达", groups: ["mobility"], insight: "停车场、公交站、路口和出入口决定游客到达、停车换乘和慢行导向组织。" },
  { id: "tourism_daily", label: "文旅/本地", groups: ["tourism", "daily_life"], insight: "文旅消费型与居民日常型 POI 的叠合关系，可判断商业化强度和本地生活保留程度。" }
];

let dataset;
let map;
let mapMode = "amap";
let heatmap;
let markers = [];
let polygons = [];
let svgRoot;
let staticPopup;
let staticProject;
let state = {
  topic: "all",
  ranges: new Set(["core_polygon", "buffer_500m", "buffer_1000m"]),
  categories: new Set(),
  showPoints: true,
  showHeat: false
};

function loadAmapScript() {
  return new Promise((resolve, reject) => {
    if (!window.AMAP_JS_KEY) {
      reject(new Error("missing_amap_key"));
      return;
    }
    const script = document.createElement("script");
    script.src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMAP_JS_KEY)}&plugin=AMap.HeatMap,AMap.Scale,AMap.ToolBar`;
    script.onload = resolve;
    script.onerror = () => reject(new Error("高德地图 JS API 加载失败"));
    document.head.appendChild(script);
  });
}

async function init() {
  try {
    const res = await fetch("./data/poi_visual_data.json");
    dataset = await res.json();
    state.categories = new Set(Object.keys(dataset.meta.categorySummary));
    buildControls();
    try {
      await loadAmapScript();
      buildMap();
    } catch (err) {
      mapMode = "static";
      buildStaticMap();
    }
    render();
    document.getElementById("mapLoading").classList.add("hidden");
  } catch (err) {
    document.getElementById("mapLoading").textContent = err.message;
  }
}

function buildControls() {
  const topicGrid = document.getElementById("topicGrid");
  topicGrid.innerHTML = TOPICS.map(t => `<button class="topic-btn ${t.id === state.topic ? "active" : ""}" data-topic="${t.id}">${t.label}</button>`).join("");
  topicGrid.addEventListener("click", (event) => {
    const btn = event.target.closest("[data-topic]");
    if (!btn) return;
    state.topic = btn.dataset.topic;
    document.querySelectorAll(".topic-btn").forEach(b => b.classList.toggle("active", b.dataset.topic === state.topic));
    render();
  });

  const rangeFilters = document.getElementById("rangeFilters");
  const ranges = [
    ["core_polygon", "核心街区"],
    ["buffer_500m", "500m影响圈"],
    ["buffer_1000m", "1000m周边圈"]
  ];
  rangeFilters.innerHTML = ranges.map(([id, label]) => `
    <label class="check-row">
      <input type="checkbox" value="${id}" checked />
      <span class="swatch" style="background:#111827"></span>
      <span>${label}</span>
      <span class="count">${dataset.meta.rangeSummary[id] || 0}</span>
    </label>`).join("");
  rangeFilters.addEventListener("change", (event) => {
    if (event.target.type !== "checkbox") return;
    event.target.checked ? state.ranges.add(event.target.value) : state.ranges.delete(event.target.value);
    render();
  });

  const categoryFilters = document.getElementById("categoryFilters");
  const cats = Object.entries(dataset.meta.categorySummary).sort((a, b) => b[1] - a[1]);
  categoryFilters.innerHTML = cats.map(([cat, count]) => `
    <label class="check-row">
      <input type="checkbox" value="${cat}" checked />
      <span class="swatch" style="background:${dataset.meta.categoryColors[cat] || "#9CA3AF"}"></span>
      <span>${cat}</span>
      <span class="count">${count}</span>
    </label>`).join("");
  categoryFilters.addEventListener("change", (event) => {
    if (event.target.type !== "checkbox") return;
    event.target.checked ? state.categories.add(event.target.value) : state.categories.delete(event.target.value);
    render();
  });

  document.getElementById("pointsToggle").addEventListener("change", event => {
    state.showPoints = event.target.checked;
    render();
  });
  document.getElementById("heatToggle").addEventListener("change", event => {
    state.showHeat = event.target.checked;
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", () => {
    if (mapMode === "amap") {
      map.setZoomAndCenter(15.8, dataset.meta.center);
    }
  });

  document.getElementById("legend").innerHTML = cats.slice(0, 10).map(([cat]) => `
    <div class="legend-item"><span class="swatch" style="background:${dataset.meta.categoryColors[cat] || "#9CA3AF"}"></span>${cat}</div>
  `).join("");
}

function buildMap() {
  map = new AMap.Map("map", {
    center: dataset.meta.center,
    zoom: 15.8,
    viewMode: "2D",
    mapStyle: "amap://styles/normal",
    resizeEnable: true
  });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({ position: { right: "20px", top: "20px" }}));
  drawRanges();
  heatmap = new AMap.HeatMap(map, {
    radius: 28,
    opacity: [0, 0.72],
    gradient: {
      0.2: "#2c9f7a",
      0.45: "#d79b19",
      0.7: "#e5533d",
      1.0: "#8b1e16"
    }
  });
}

function buildStaticMap() {
  const mapEl = document.getElementById("map");
  mapEl.classList.add("static-map");
  mapEl.innerHTML = `
    <svg id="staticSvg" viewBox="0 0 1200 900" role="img" aria-label="东前街 POI 分析地图">
      <defs>
        <pattern id="gridPattern" width="40" height="40" patternUnits="userSpaceOnUse">
          <path d="M 40 0 L 0 0 0 40" fill="none" stroke="#E5E7EB" stroke-width="1"/>
        </pattern>
        <filter id="softShadow"><feDropShadow dx="0" dy="6" stdDeviation="8" flood-color="#111827" flood-opacity="0.12"/></filter>
      </defs>
      <rect width="1200" height="900" fill="#FAFAF7"/>
      <rect width="1200" height="900" fill="url(#gridPattern)" opacity="0.65"/>
      <g id="staticBase"></g>
      <g id="staticHeat"></g>
      <g id="staticPoints"></g>
      <g id="staticLabels"></g>
    </svg>
    <div id="staticPopup" class="static-popup hidden"></div>
    <div class="static-note">GitHub Pages 静态分析底图 · 本地服务可启用高德在线底图</div>
  `;
  svgRoot = document.getElementById("staticSvg");
  staticPopup = document.getElementById("staticPopup");
  const lons = dataset.pois.map(p => p.lon);
  const lats = dataset.pois.map(p => p.lat);
  const minLon = Math.min(...lons), maxLon = Math.max(...lons);
  const minLat = Math.min(...lats), maxLat = Math.max(...lats);
  const pad = 64;
  staticProject = (lon, lat) => {
    const x = pad + (lon - minLon) / (maxLon - minLon) * (1200 - pad * 2);
    const y = 900 - pad - (lat - minLat) / (maxLat - minLat) * (900 - pad * 2);
    return [x, y];
  };
  drawStaticBase();
}

function drawStaticBase() {
  const base = document.getElementById("staticBase");
  const labels = document.getElementById("staticLabels");
  base.innerHTML = "";
  labels.innerHTML = "";
  const center = staticProject(dataset.meta.center[0], dataset.meta.center[1]);
  const ring = (coords, stroke, width) => {
    const d = coords.map(([lon, lat], i) => {
      const [x, y] = staticProject(lon, lat);
      return `${i ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
    }).join(" ");
    return `<path d="${d}" fill="none" stroke="${stroke}" stroke-width="${width}" stroke-dasharray="9 9" opacity="0.82"/>`;
  };
  const polygonPoints = dataset.meta.corePolygon.map(([lon, lat]) => staticProject(lon, lat).map(v => v.toFixed(1)).join(",")).join(" ");
  base.insertAdjacentHTML("beforeend", ring(dataset.meta.buffer1000, "#94A3B8", 2));
  base.insertAdjacentHTML("beforeend", ring(dataset.meta.buffer500, "#475569", 2.4));
  base.insertAdjacentHTML("beforeend", `<polygon points="${polygonPoints}" fill="#E5533D22" stroke="#B83B2B" stroke-width="3.2" filter="url(#softShadow)"/>`);
  base.insertAdjacentHTML("beforeend", `<circle cx="${center[0]}" cy="${center[1]}" r="7" fill="#111827"/><line x1="${center[0]-16}" y1="${center[1]}" x2="${center[0]+16}" y2="${center[1]}" stroke="#111827" stroke-width="2"/><line x1="${center[0]}" y1="${center[1]-16}" x2="${center[0]}" y2="${center[1]+16}" stroke="#111827" stroke-width="2"/>`);
  labels.insertAdjacentHTML("beforeend", `<text x="46" y="54" font-size="24" font-weight="800" fill="#111827">东前街 POI 静态分析地图</text><text x="46" y="82" font-size="13" fill="#5f6b7a">无高德 Key 时自动展示，可筛选专题、圈层与业态</text>`);
  labels.insertAdjacentHTML("beforeend", `<text x="${center[0]+18}" y="${center[1]+28}" font-size="12" fill="#111827">核心分析中心</text><text x="1030" y="104" font-size="13" fill="#64748B">1000m</text><text x="690" y="360" font-size="13" fill="#475569">500m</text>`);
}

function drawRanges() {
  const core = new AMap.Polygon({
    path: dataset.meta.corePolygon,
    fillColor: "#e5533d",
    fillOpacity: 0.12,
    strokeColor: "#b83b2b",
    strokeWeight: 3,
    zIndex: 80
  });
  const circle500 = new AMap.Polyline({
    path: dataset.meta.buffer500,
    strokeColor: "#111827",
    strokeWeight: 2,
    strokeOpacity: 0.75,
    strokeStyle: "dashed",
    zIndex: 70
  });
  const circle1000 = new AMap.Polyline({
    path: dataset.meta.buffer1000,
    strokeColor: "#6b7280",
    strokeWeight: 2,
    strokeOpacity: 0.72,
    strokeStyle: "dashed",
    zIndex: 60
  });
  polygons = [core, circle500, circle1000];
  map.add(polygons);
}

function filteredPois() {
  const topic = TOPICS.find(t => t.id === state.topic);
  return dataset.pois.filter(p => {
    if (!state.ranges.has(p.range)) return false;
    if (!state.categories.has(p.category)) return false;
    if (topic && topic.groups) {
      if (!p.analysisGroups.some(g => topic.groups.includes(g))) return false;
    }
    return true;
  });
}

function render() {
  const pois = filteredPois();
  renderMarkers(pois);
  renderHeat(pois);
  renderStats(pois);
}

function renderMarkers(pois) {
  if (mapMode === "static") {
    renderStaticMarkers(pois);
    return;
  }
  if (markers.length) {
    map.remove(markers);
    markers = [];
  }
  if (!state.showPoints) return;
  markers = pois.map(p => {
    const color = dataset.meta.categoryColors[p.category] || "#9CA3AF";
    const marker = new AMap.CircleMarker({
      center: [p.lon, p.lat],
      radius: p.range === "core_polygon" ? 5.2 : 3.6,
      strokeColor: "#ffffff",
      strokeWeight: 1,
      strokeOpacity: 0.88,
      fillColor: color,
      fillOpacity: p.range === "core_polygon" ? 0.92 : 0.72,
      zIndex: p.range === "core_polygon" ? 130 : 100
    });
    marker.on("click", () => showPopup(p));
    return marker;
  });
  map.add(markers);
}

function renderStaticMarkers(pois) {
  const pointLayer = document.getElementById("staticPoints");
  pointLayer.innerHTML = "";
  if (!state.showPoints) return;
  const maxPoints = 2810;
  pois.slice(0, maxPoints).forEach((p, index) => {
    const [x, y] = staticProject(p.lon, p.lat);
    const color = dataset.meta.categoryColors[p.category] || "#9CA3AF";
    const r = p.range === "core_polygon" ? 4.7 : 3.2;
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", x);
    node.setAttribute("cy", y);
    node.setAttribute("r", r);
    node.setAttribute("fill", color);
    node.setAttribute("fill-opacity", p.range === "core_polygon" ? "0.92" : "0.68");
    node.setAttribute("stroke", "#ffffff");
    node.setAttribute("stroke-width", "0.7");
    node.style.cursor = "pointer";
    node.addEventListener("click", (event) => showStaticPopup(p, event));
    pointLayer.appendChild(node);
  });
}

function renderHeat(pois) {
  if (mapMode === "static") {
    renderStaticHeat(pois);
    return;
  }
  if (!heatmap) return;
  if (!state.showHeat) {
    heatmap.hide();
    return;
  }
  const heatData = pois.map(p => ({
    lng: p.lon,
    lat: p.lat,
    count: p.range === "core_polygon" ? 8 : p.range === "buffer_500m" ? 4 : 2
  }));
  heatmap.setDataSet({ data: heatData, max: 20 });
  heatmap.show();
}

function renderStaticHeat(pois) {
  const heatLayer = document.getElementById("staticHeat");
  heatLayer.innerHTML = "";
  if (!state.showHeat) return;
  pois.forEach((p, index) => {
    if (index % 2 && pois.length > 900) return;
    const [x, y] = staticProject(p.lon, p.lat);
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", x);
    node.setAttribute("cy", y);
    node.setAttribute("r", p.range === "core_polygon" ? 22 : 15);
    node.setAttribute("fill", p.analysisGroups.includes("commercial_vitality") ? "#E5533D" : "#D79B19");
    node.setAttribute("fill-opacity", "0.08");
    heatLayer.appendChild(node);
  });
}

function showPopup(p) {
  if (mapMode === "static") return;
  const info = new AMap.InfoWindow({
    isCustom: false,
    content: `<div class="poi-popup">
      <h3>${escapeHtml(p.name)}</h3>
      <p><strong>${escapeHtml(p.category)}</strong> · ${escapeHtml(p.rangeLabel)}</p>
      <p>${escapeHtml(p.type || "")}</p>
      <p>${escapeHtml(p.address || "地址未返回")}</p>
      <p>距中心约 ${Math.round(p.distance)} m</p>
    </div>`,
    offset: new AMap.Pixel(0, -4)
  });
  info.open(map, [p.lon, p.lat]);
}

function showStaticPopup(p, event) {
  const rect = document.getElementById("map").getBoundingClientRect();
  staticPopup.innerHTML = `<div class="poi-popup">
    <h3>${escapeHtml(p.name)}</h3>
    <p><strong>${escapeHtml(p.category)}</strong> · ${escapeHtml(p.rangeLabel)}</p>
    <p>${escapeHtml(p.type || "")}</p>
    <p>${escapeHtml(p.address || "地址未返回")}</p>
    <p>距中心约 ${Math.round(p.distance)} m</p>
  </div>`;
  staticPopup.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 260)}px`;
  staticPopup.style.top = `${Math.max(event.clientY - rect.top - 20, 12)}px`;
  staticPopup.classList.remove("hidden");
}

function renderStats(pois) {
  const total = dataset.meta.total || 1;
  const rangeCounts = countBy(pois, "range");
  const catCounts = countBy(pois, "category");
  const sortedCats = Object.entries(catCounts).sort((a, b) => b[1] - a[1]);
  document.getElementById("currentCount").textContent = pois.length;
  document.getElementById("currentShare").textContent = `样本占比 ${(pois.length / total * 100).toFixed(1)}%`;
  document.getElementById("metricCore").textContent = rangeCounts.core_polygon || 0;
  document.getElementById("metric500").textContent = rangeCounts.buffer_500m || 0;
  document.getElementById("metric1000").textContent = rangeCounts.buffer_1000m || 0;
  document.getElementById("metricTop").textContent = sortedCats[0] ? sortedCats[0][0] : "-";
  const max = sortedCats[0] ? sortedCats[0][1] : 1;
  document.getElementById("barList").innerHTML = sortedCats.slice(0, 8).map(([cat, count]) => {
    const color = dataset.meta.categoryColors[cat] || "#9CA3AF";
    return `<div>
      <div class="bar-head"><span>${cat}</span><strong>${count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${count / max * 100}%; background:${color}"></div></div>
    </div>`;
  }).join("");
  const topic = TOPICS.find(t => t.id === state.topic);
  const topText = sortedCats[0] ? `当前以“${sortedCats[0][0]}”为主导业态，占筛选结果 ${(sortedCats[0][1] / Math.max(pois.length, 1) * 100).toFixed(1)}%。` : "";
  document.getElementById("insightText").textContent = `${topic ? topic.insight : ""} ${topText}`;
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    acc[item[key]] = (acc[item[key]] || 0) + 1;
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value).replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

init();
