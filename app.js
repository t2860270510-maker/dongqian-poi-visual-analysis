const TOPICS = [
  { id: "all", label: "全部 POI", groups: null, insight: "显示全部 POI 样本，用于判断东前街与周边环境的整体功能密度。" },
  { id: "commercial_vitality", label: "商业活力", groups: ["commercial_vitality"], insight: "餐饮、购物、休闲娱乐和住宿构成高频消费与夜间活力基础，适合叠加步行街主轴与节点设计。" },
  { id: "public_service", label: "公共服务", groups: ["public_service"], insight: "医疗、教育、政府公共服务、公共设施等点位用于识别居民服务支撑和公共设施补点方向。" },
  { id: "mobility", label: "交通到达", groups: ["mobility"], insight: "停车场、公交站、路口和出入口决定游客到达、停车换乘和慢行导向组织。" },
  { id: "tourism_daily", label: "文旅/本地", groups: ["tourism", "daily_life"], insight: "文旅消费型与居民日常型 POI 的叠合关系，可判断商业化强度和本地生活保留程度。" }
];

const RANGE_COLORS = {
  core_polygon: "#E5533D",
  buffer_500m: "#D79B19",
  buffer_1000m: "#2C9F7A"
};

const GROUP_COLORS = {
  commercial_vitality: "#E5533D",
  daily_life: "#2C9F7A",
  public_service: "#2F8EA6",
  mobility: "#5A6ACF",
  tourism: "#D79B19"
};

const GROUP_LABELS = {
  commercial_vitality: "商业活力",
  daily_life: "居民日常",
  public_service: "公共服务",
  mobility: "交通到达",
  tourism: "文旅消费"
};

const VISITOR_COLORS = {
  "文旅消费": "#D79B19",
  "居民日常": "#2C9F7A",
  "其他": "#9CA3AF"
};

const DEEP_TOPICS = [
  { id: "district", label: "商圈影响", description: "场地内、东北商圈、西南商圈的业态结构对比。", dimension: "primaryCategory", categories: null, insight: "东北商圈承担现代综合消费和年轻客流，西南商圈偏传统市场和日常供给，场地内应成为两者之间的老城体验转换界面。" },
  { id: "catering", label: "餐饮深拆", description: "按小吃快餐、地方风味、正餐聚餐、咖啡甜品等拆分餐饮。", dimension: "cateringSubCategory", categories: ["餐饮"], insight: "餐饮不宜只看数量，地方风味、小吃快餐、咖啡甜品和茶饮更适合组织成连续街道活力界面。" },
  { id: "shopping", label: "购物深拆", description: "按服装零售、传统小商品、便利零售、文创零售等拆分购物。", dimension: "shoppingSubCategory", categories: ["购物"], insight: "东北商圈偏服装和体验零售，西南商圈偏传统小商品，场地内适合补入文创、书店、特产和低门槛便民零售。" },
  { id: "consumption", label: "消费层级", description: "按基础便民、大众日常、社交聚餐、品质体验、文旅特色表达消费结构。", dimension: "consumptionLevel", categories: ["餐饮", "购物", "休闲娱乐", "住宿", "文旅景点"], insight: "基础便民和大众日常是老城底盘，品质体验和文旅特色应作为提升项嵌入，而不是替代居民日常。" },
  { id: "strategy", label: "设计策略", description: "按保留、提升、补充、整合、导流联动表达更新动作。", dimension: "designAction", categories: null, insight: "场地内要保留日常、提升地方风味与文化休闲，东北/西南商圈则通过导流联动支撑客流转化。" }
];

const DEEP_DIMENSIONS = [
  { id: "primaryCategory", label: "一级业态", field: "category" },
  { id: "cateringSubCategory", label: "餐饮子类型", field: "subCategory", categories: ["餐饮"] },
  { id: "shoppingSubCategory", label: "购物子类型", field: "subCategory", categories: ["购物"] },
  { id: "consumptionLevel", label: "消费层级", field: "consumptionLevel" },
  { id: "customerType", label: "客群类型", field: "customerType" },
  { id: "designAction", label: "设计动作", field: "designAction" }
];

const DISTRICT_COLORS = {
  "场地内": "#E5533D",
  "东北商圈": "#5A6ACF",
  "西南商圈": "#2C9F7A",
  "非重点商圈": "#9CA3AF"
};

const FALLBACK_PALETTE = [
  "#E5533D", "#D79B19", "#2C9F7A", "#5A6ACF", "#B64FA3", "#1E88E5",
  "#7E57C2", "#D94F70", "#4E7D3A", "#2F8EA6", "#8A6D3B", "#6C7A89"
];

let dataset;
let map;
let mapMode = "amap";
let heatmap;
let markers = [];
let polygons = [];
let analysisOverlays = [];
let infoWindow;
let svgRoot;
let staticPopup;
let staticProject;
let screenshotPluginReady = false;

let state = {
  mode: "filter",
  topic: "all",
  activeViewId: "fig01",
  deepTopic: "district",
  deepDimension: "primaryCategory",
  deepDistricts: new Set(["场地内", "东北商圈", "西南商圈"]),
  deepReviewOnly: false,
  ranges: new Set(["core_polygon", "buffer_500m", "buffer_1000m"]),
  categories: new Set(),
  showPoints: true,
  showHeat: false
};

function loadScript(src) {
  return new Promise((resolve, reject) => {
    if ([...document.scripts].some(script => script.src === src)) {
      resolve();
      return;
    }
    const script = document.createElement("script");
    script.src = src;
    script.onload = resolve;
    script.onerror = () => reject(new Error(`脚本加载失败：${src}`));
    document.head.appendChild(script);
  });
}

function loadAmapScript() {
  if (window.AMap) return Promise.resolve();
  if (!window.AMAP_JS_KEY) return Promise.reject(new Error("missing_amap_key"));
  const src = `https://webapi.amap.com/maps?v=2.0&key=${encodeURIComponent(window.AMAP_JS_KEY)}&plugin=AMap.HeatMap,AMap.Scale,AMap.ToolBar`;
  return loadScript(src);
}

async function loadScreenshotScript() {
  if (!window.AMap) return;
  if (window.AMap.Screenshot) {
    screenshotPluginReady = true;
    return;
  }
  try {
    await loadScript("https://cdn.jsdelivr.net/npm/@amap/screenshot@0.0.3/dist/index.js");
    screenshotPluginReady = Boolean(window.AMap.Screenshot);
  } catch (err) {
    screenshotPluginReady = false;
  }
}

async function hydrateRuntimeConfig() {
  if (window.AMAP_JS_KEY) return;
  if (!location.hostname.endsWith("vercel.app")) return;
  try {
    const res = await fetch("./api/config", { cache: "no-store" });
    if (!res.ok) return;
    const config = await res.json();
    if (config.securityJsCode) {
      window._AMapSecurityConfig = { securityJsCode: config.securityJsCode };
    }
    if (config.amapKey) {
      window.AMAP_JS_KEY = config.amapKey;
    }
  } catch (err) {
    // GitHub Pages has no API route; the static analytical map remains available.
  }
}

async function init() {
  try {
    const res = await fetch("./data/poi_visual_data.json");
    dataset = await res.json();
    state.categories = new Set(Object.keys(dataset.meta.categorySummary));
    if (!dataset.analysisViews?.length) {
      dataset.analysisViews = fallbackAnalysisViews();
    }
    buildControls();
    await hydrateRuntimeConfig();
    try {
      await loadAmapScript();
      await loadScreenshotScript();
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
  buildModeSwitch();
  buildTopicControls();
  buildRangeControls();
  buildCategoryControls();
  buildAnalysisControls();
  buildDeepControls();
  document.getElementById("pointsToggle").addEventListener("change", event => {
    state.showPoints = event.target.checked;
    render();
  });
  document.getElementById("heatToggle").addEventListener("change", event => {
    state.showHeat = event.target.checked;
    render();
  });
  document.getElementById("resetBtn").addEventListener("click", resetView);
  document.getElementById("screenshotBtn").addEventListener("click", exportCurrentMap);
  updateControlVisibility();
}

function buildModeSwitch() {
  const modeSwitch = document.getElementById("modeSwitch");
  modeSwitch.addEventListener("click", event => {
    const btn = event.target.closest("[data-mode]");
    if (!btn) return;
    state.mode = btn.dataset.mode;
    closeMapPopup();
    updateControlVisibility();
    render();
  });
}

function buildTopicControls() {
  const topicGrid = document.getElementById("topicGrid");
  topicGrid.innerHTML = TOPICS.map(t => `<button class="topic-btn ${t.id === state.topic ? "active" : ""}" data-topic="${t.id}">${t.label}</button>`).join("");
  topicGrid.addEventListener("click", event => {
    const btn = event.target.closest("[data-topic]");
    if (!btn) return;
    state.topic = btn.dataset.topic;
    document.querySelectorAll(".topic-btn").forEach(b => b.classList.toggle("active", b.dataset.topic === state.topic));
    render();
  });
}

function buildRangeControls() {
  const rangeFilters = document.getElementById("rangeFilters");
  const ranges = [
    ["core_polygon", "核心街区"],
    ["buffer_500m", "500m影响圈"],
    ["buffer_1000m", "1000m周边圈"]
  ];
  rangeFilters.innerHTML = ranges.map(([id, label]) => `
    <label class="check-row">
      <input type="checkbox" value="${id}" checked />
      <span class="swatch" style="background:${RANGE_COLORS[id] || "#111827"}"></span>
      <span>${label}</span>
      <span class="count">${dataset.meta.rangeSummary[id] || 0}</span>
    </label>`).join("");
  rangeFilters.addEventListener("change", event => {
    if (event.target.type !== "checkbox") return;
    event.target.checked ? state.ranges.add(event.target.value) : state.ranges.delete(event.target.value);
    render();
  });
}

function buildCategoryControls() {
  const categoryFilters = document.getElementById("categoryFilters");
  const cats = sortedCategories();
  categoryFilters.innerHTML = cats.map(([cat, count]) => `
    <label class="check-row">
      <input type="checkbox" value="${cat}" checked />
      <span class="swatch" style="background:${dataset.meta.categoryColors[cat] || "#9CA3AF"}"></span>
      <span>${cat}</span>
      <span class="count">${count}</span>
    </label>`).join("");
  categoryFilters.addEventListener("change", event => {
    if (event.target.type !== "checkbox") return;
    event.target.checked ? state.categories.add(event.target.value) : state.categories.delete(event.target.value);
    render();
  });
}

function buildAnalysisControls() {
  const list = document.getElementById("analysisList");
  list.innerHTML = dataset.analysisViews.map(view => `
    <button class="analysis-btn ${view.id === state.activeViewId ? "active" : ""}" data-view="${view.id}" type="button">
      <strong>${escapeHtml(view.shortTitle || view.title)}</strong>
      <span>${escapeHtml(view.description || "")}</span>
    </button>`).join("");
  list.addEventListener("click", event => {
    const btn = event.target.closest("[data-view]");
    if (!btn) return;
    state.activeViewId = btn.dataset.view;
    document.querySelectorAll(".analysis-btn").forEach(b => b.classList.toggle("active", b.dataset.view === state.activeViewId));
    fitActiveView();
    render();
  });
}

function buildDeepControls() {
  const topicList = document.getElementById("deepTopicList");
  topicList.innerHTML = DEEP_TOPICS.map(topic => `
    <button class="analysis-btn ${topic.id === state.deepTopic ? "active" : ""}" data-deep-topic="${topic.id}" type="button">
      <strong>${escapeHtml(topic.label)}</strong>
      <span>${escapeHtml(topic.description)}</span>
    </button>`).join("");
  topicList.addEventListener("click", event => {
    const btn = event.target.closest("[data-deep-topic]");
    if (!btn) return;
    state.deepTopic = btn.dataset.deepTopic;
    const topic = activeDeepTopic();
    state.deepDimension = topic.dimension;
    document.querySelectorAll("[data-deep-topic]").forEach(b => b.classList.toggle("active", b.dataset.deepTopic === state.deepTopic));
    document.querySelectorAll("[data-deep-dimension]").forEach(b => b.classList.toggle("active", b.dataset.deepDimension === state.deepDimension));
    fitDeepView();
    render();
  });

  const districtFilters = document.getElementById("districtFilters");
  const districts = ["场地内", "东北商圈", "西南商圈", "非重点商圈"];
  districtFilters.innerHTML = districts.map(district => `
    <label class="check-row">
      <input type="checkbox" value="${district}" ${state.deepDistricts.has(district) ? "checked" : ""} />
      <span class="swatch" style="background:${DISTRICT_COLORS[district] || "#9CA3AF"}"></span>
      <span>${district}</span>
      <span class="count">${dataset.meta.deepSummary?.districtTotals?.[district] || 0}</span>
    </label>`).join("");
  districtFilters.addEventListener("change", event => {
    if (event.target.type !== "checkbox") return;
    event.target.checked ? state.deepDistricts.add(event.target.value) : state.deepDistricts.delete(event.target.value);
    fitDeepView();
    render();
  });

  const dimensionGrid = document.getElementById("deepDimensionGrid");
  dimensionGrid.innerHTML = DEEP_DIMENSIONS.map(dimension => `
    <button class="dimension-btn ${dimension.id === state.deepDimension ? "active" : ""}" data-deep-dimension="${dimension.id}" type="button">
      ${escapeHtml(dimension.label)}
    </button>`).join("");
  dimensionGrid.addEventListener("click", event => {
    const btn = event.target.closest("[data-deep-dimension]");
    if (!btn) return;
    state.deepDimension = btn.dataset.deepDimension;
    document.querySelectorAll("[data-deep-dimension]").forEach(b => b.classList.toggle("active", b.dataset.deepDimension === state.deepDimension));
    render();
  });

  const reviewOnlyToggle = document.getElementById("deepReviewOnlyToggle");
  reviewOnlyToggle.checked = state.deepReviewOnly;
  document.getElementById("deepReviewTotal").textContent = dataset.meta.deepSummary?.manualReviewTotal || 0;
  reviewOnlyToggle.addEventListener("change", event => {
    state.deepReviewOnly = event.target.checked;
    fitDeepView();
    render();
  });
}

function updateControlVisibility() {
  document.querySelectorAll("#modeSwitch [data-mode]").forEach(btn => {
    btn.classList.toggle("active", btn.dataset.mode === state.mode);
  });
  document.getElementById("filterControls").hidden = state.mode !== "filter";
  document.getElementById("analysisControls").hidden = state.mode !== "analysis";
  document.getElementById("deepControls").hidden = state.mode !== "deep";
  const reviewOnlyToggle = document.getElementById("deepReviewOnlyToggle");
  if (reviewOnlyToggle) reviewOnlyToggle.checked = state.deepReviewOnly;
  const view = activeView();
  document.getElementById("analysisNote").textContent = view ? view.description : "";
  document.getElementById("screenshotStatus").textContent = "";
  if (state.mode === "deep") fitDeepView();
}

function buildMap() {
  map = new AMap.Map("map", {
    center: dataset.meta.center,
    zoom: 15.8,
    viewMode: "2D",
    mapStyle: "amap://styles/normal",
    resizeEnable: true,
    WebGLParams: { preserveDrawingBuffer: true }
  });
  map.addControl(new AMap.Scale());
  map.addControl(new AMap.ToolBar({ position: { right: "20px", top: "72px" }}));
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
      <g id="staticAnnotations"></g>
      <g id="staticLabels"></g>
    </svg>
    <div id="staticPopup" class="static-popup hidden"></div>
    <div class="static-note">GitHub Pages 静态分析底图 · Vercel/本地服务启用高德在线底图</div>
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
  Object.entries(dataset.meta.businessDistrictPolygons || {}).forEach(([name, polygon]) => {
    const points = polygon.map(([lon, lat]) => staticProject(lon, lat).map(v => v.toFixed(1)).join(",")).join(" ");
    const color = DISTRICT_COLORS[name] || "#5A6ACF";
    const [lx, ly] = staticProject(
      polygon.reduce((sum, p) => sum + p[0], 0) / polygon.length,
      polygon.reduce((sum, p) => sum + p[1], 0) / polygon.length
    );
    base.insertAdjacentHTML("beforeend", `<polygon points="${points}" fill="${color}24" stroke="${color}" stroke-width="2.6" stroke-dasharray="8 6"/>`);
    labels.insertAdjacentHTML("beforeend", `<text x="${lx}" y="${ly}" text-anchor="middle" font-size="13" font-weight="800" fill="${color}">${escapeHtml(name)}</text>`);
  });
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
  const districts = Object.entries(dataset.meta.businessDistrictPolygons || {}).map(([name, path]) => new AMap.Polygon({
    path,
    fillColor: DISTRICT_COLORS[name] || "#5A6ACF",
    fillOpacity: 0.08,
    strokeColor: DISTRICT_COLORS[name] || "#5A6ACF",
    strokeWeight: 2,
    strokeOpacity: 0.88,
    strokeStyle: "dashed",
    zIndex: 90
  }));
  polygons = [core, circle500, circle1000, ...districts];
  map.add(polygons);
}

function activeView() {
  return dataset.analysisViews.find(view => view.id === state.activeViewId) || dataset.analysisViews[0];
}

function activeDeepTopic() {
  return DEEP_TOPICS.find(topic => topic.id === state.deepTopic) || DEEP_TOPICS[0];
}

function activeDeepDimension() {
  return DEEP_DIMENSIONS.find(dimension => dimension.id === state.deepDimension) || DEEP_DIMENSIONS[0];
}

function currentPois() {
  if (state.mode === "analysis") return poisForAnalysisView(activeView());
  if (state.mode === "deep") return poisForDeepView();
  return filteredPois();
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

function poisForAnalysisView(view) {
  const filters = view?.filters || {};
  return dataset.pois.filter(p => {
    if (filters.ranges?.length && !filters.ranges.includes(p.range)) return false;
    const matchers = [];
    if (filters.groups?.length) matchers.push(p.analysisGroups.some(g => filters.groups.includes(g)));
    if (filters.categories?.length) matchers.push(filters.categories.includes(p.category));
    if (filters.visitorDaily?.length) matchers.push(filters.visitorDaily.includes(p.visitorDaily));
    if (filters.nameKeywords?.length) matchers.push(filters.nameKeywords.some(keyword => p.name.includes(keyword)));
    if (filters.typeKeywords?.length) matchers.push(filters.typeKeywords.some(keyword => (p.type || "").includes(keyword)));
    return matchers.length ? matchers.some(Boolean) : true;
  });
}

function poisForDeepView() {
  const topic = activeDeepTopic();
  const dimension = activeDeepDimension();
  const categoryFilters = topic.categories || dimension.categories || null;
  return dataset.pois.filter(p => {
    if (!state.deepDistricts.has(p.businessDistrict || "非重点商圈")) return false;
    if (state.deepReviewOnly && !p.manualReviewFlag) return false;
    if (categoryFilters?.length && !categoryFilters.includes(p.category)) return false;
    if (dimension.id === "cateringSubCategory" && p.category !== "餐饮") return false;
    if (dimension.id === "shoppingSubCategory" && p.category !== "购物") return false;
    return true;
  });
}

function render() {
  const pois = currentPois();
  renderMarkers(pois);
  renderHeat(pois);
  renderAnnotations();
  renderLegend(pois);
  renderStats(pois);
}

function renderMarkers(pois) {
  const showPoints = state.mode === "analysis" ? activeView().showPoints !== false : state.showPoints;
  if (mapMode === "static") {
    renderStaticMarkers(pois, showPoints);
    return;
  }
  if (markers.length) {
    map.remove(markers);
    markers = [];
  }
  if (!showPoints) return;
  const view = state.mode === "analysis" ? activeView() : null;
  markers = pois.map(p => {
    const color = colorForPoi(p, view);
    const marker = new AMap.CircleMarker({
      center: [p.lon, p.lat],
      radius: p.range === "core_polygon" ? 5.4 : state.mode === "analysis" || state.mode === "deep" ? 4.2 : 3.6,
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

function renderStaticMarkers(pois, showPoints) {
  const pointLayer = document.getElementById("staticPoints");
  pointLayer.innerHTML = "";
  if (!showPoints) return;
  const view = state.mode === "analysis" ? activeView() : null;
  pois.slice(0, 2810).forEach(p => {
    const [x, y] = staticProject(p.lon, p.lat);
    const node = document.createElementNS("http://www.w3.org/2000/svg", "circle");
    node.setAttribute("cx", x);
    node.setAttribute("cy", y);
    node.setAttribute("r", p.range === "core_polygon" ? 4.8 : 3.2);
    node.setAttribute("fill", colorForPoi(p, view));
    node.setAttribute("fill-opacity", p.range === "core_polygon" ? "0.92" : "0.68");
    node.setAttribute("stroke", "#ffffff");
    node.setAttribute("stroke-width", "0.7");
    node.style.cursor = "pointer";
    node.addEventListener("click", event => showStaticPopup(p, event));
    pointLayer.appendChild(node);
  });
}

function renderHeat(pois) {
  const showHeat = state.mode === "analysis" ? activeView().showHeat === true : state.mode === "deep" ? false : state.showHeat;
  if (mapMode === "static") {
    renderStaticHeat(pois, showHeat);
    return;
  }
  if (!heatmap) return;
  if (!showHeat) {
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

function renderStaticHeat(pois, showHeat) {
  const heatLayer = document.getElementById("staticHeat");
  heatLayer.innerHTML = "";
  if (!showHeat) return;
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

function renderAnnotations() {
  clearAnnotations();
  if (state.mode !== "analysis") return;
  const view = activeView();
  const annotations = view.annotations || [];
  if (mapMode === "static") {
    renderStaticAnnotations(annotations);
    return;
  }
  annotations.forEach(item => {
    const color = item.color || "#111827";
    if (item.type === "line") {
      const line = new AMap.Polyline({
        path: item.path,
        strokeColor: color,
        strokeWeight: 5,
        strokeOpacity: 0.88,
        lineJoin: "round",
        zIndex: 190
      });
      analysisOverlays.push(line);
      map.add(line);
      const mid = item.path[Math.floor(item.path.length / 2)];
      analysisOverlays.push(makeLabelMarker(mid[0], mid[1], item.title, "", color));
      return;
    }
    if (item.type === "circle") {
      const circle = new AMap.Circle({
        center: [item.lon, item.lat],
        radius: item.radius || 160,
        strokeColor: color,
        strokeWeight: 2,
        strokeOpacity: 0.85,
        fillColor: color,
        fillOpacity: 0.08,
        zIndex: 150
      });
      analysisOverlays.push(circle);
      map.add(circle);
      analysisOverlays.push(makeLabelMarker(item.lon, item.lat, item.title, item.body || "", color));
      return;
    }
    analysisOverlays.push(makeLabelMarker(item.lon, item.lat, item.title, item.body || "", color));
  });
}

function makeLabelMarker(lon, lat, title, body, color) {
  const marker = new AMap.Marker({
    position: [lon, lat],
    content: `<div class="map-label" style="--label-color:${color}"><strong>${escapeHtml(title || "")}</strong>${body ? `<span>${escapeHtml(body)}</span>` : ""}</div>`,
    offset: new AMap.Pixel(10, -12),
    zIndex: 220
  });
  map.add(marker);
  return marker;
}

function renderStaticAnnotations(annotations) {
  const layer = document.getElementById("staticAnnotations");
  layer.innerHTML = "";
  annotations.forEach(item => {
    const color = item.color || "#111827";
    if (item.type === "line") {
      const d = item.path.map(([lon, lat], index) => {
        const [x, y] = staticProject(lon, lat);
        return `${index ? "L" : "M"}${x.toFixed(1)},${y.toFixed(1)}`;
      }).join(" ");
      layer.insertAdjacentHTML("beforeend", `<path d="${d}" fill="none" stroke="${color}" stroke-width="6" stroke-linecap="round" stroke-linejoin="round" opacity=".82"/>`);
      const [lon, lat] = item.path[Math.floor(item.path.length / 2)];
      const [x, y] = staticProject(lon, lat);
      layer.insertAdjacentHTML("beforeend", `<text x="${x + 12}" y="${y - 10}" font-size="15" font-weight="800" fill="${color}">${escapeHtml(item.title || "")}</text>`);
      return;
    }
    const [x, y] = staticProject(item.lon, item.lat);
    if (item.type === "circle") {
      const radius = Math.max(24, (item.radius || 160) / 2.4);
      layer.insertAdjacentHTML("beforeend", `<circle cx="${x}" cy="${y}" r="${radius}" fill="${color}" fill-opacity=".08" stroke="${color}" stroke-width="2.4"/>`);
    }
    layer.insertAdjacentHTML("beforeend", `<g><rect x="${x + 10}" y="${y - 36}" width="178" height="${item.body ? 52 : 30}" rx="8" fill="white" stroke="${color}" opacity=".96"/><text x="${x + 20}" y="${y - 16}" font-size="13" font-weight="800" fill="${color}">${escapeHtml(item.title || "")}</text>${item.body ? `<text x="${x + 20}" y="${y + 4}" font-size="11" fill="#425063">${escapeHtml(item.body)}</text>` : ""}</g>`);
  });
}

function clearAnnotations() {
  if (mapMode === "amap" && analysisOverlays.length) {
    map.remove(analysisOverlays);
  }
  analysisOverlays = [];
  if (mapMode === "static") {
    const layer = document.getElementById("staticAnnotations");
    if (layer) layer.innerHTML = "";
  }
}

function closeMapPopup() {
  if (infoWindow) {
    infoWindow.close();
  }
  if (staticPopup) {
    staticPopup.classList.add("hidden");
  }
}

function showPopup(p) {
  if (mapMode === "static") return;
  const deepTags = deepTagHtml(p);
  const reviewInfo = manualReviewHtml(p);
  infoWindow = new AMap.InfoWindow({
    isCustom: false,
    content: `<div class="poi-popup">
      <h3>${escapeHtml(p.name)}</h3>
      <p><strong>${escapeHtml(p.category)}</strong> · ${escapeHtml(p.rangeLabel)}</p>
      ${p.subCategory ? `<p>${escapeHtml(p.subCategory)} · ${escapeHtml(p.businessDistrict || "")}</p>` : ""}
      <p>${escapeHtml(p.type || "")}</p>
      <p>${escapeHtml(p.address || "地址未返回")}</p>
      <p>距中心约 ${Math.round(p.distance)} m</p>
      ${deepTags}
      ${reviewInfo}
    </div>`,
    offset: new AMap.Pixel(0, -4)
  });
  infoWindow.open(map, [p.lon, p.lat]);
}

function showStaticPopup(p, event) {
  const rect = document.getElementById("map").getBoundingClientRect();
  const deepTags = deepTagHtml(p);
  const reviewInfo = manualReviewHtml(p);
  staticPopup.innerHTML = `<div class="poi-popup">
    <h3>${escapeHtml(p.name)}</h3>
    <p><strong>${escapeHtml(p.category)}</strong> · ${escapeHtml(p.rangeLabel)}</p>
    ${p.subCategory ? `<p>${escapeHtml(p.subCategory)} · ${escapeHtml(p.businessDistrict || "")}</p>` : ""}
    <p>${escapeHtml(p.type || "")}</p>
    <p>${escapeHtml(p.address || "地址未返回")}</p>
    <p>距中心约 ${Math.round(p.distance)} m</p>
    ${deepTags}
    ${reviewInfo}
  </div>`;
  staticPopup.style.left = `${Math.min(event.clientX - rect.left + 12, rect.width - 260)}px`;
  staticPopup.style.top = `${Math.max(event.clientY - rect.top - 20, 12)}px`;
  staticPopup.classList.remove("hidden");
}

function deepTagHtml(p) {
  if (!p.subCategory && !p.consumptionLevel && !p.designAction) return "";
  const tags = [
    p.consumptionLevel,
    p.customerType,
    p.activityTime,
    p.interfaceLevel,
    p.designAction,
    p.manualOverrideApplied ? "已人工修正" : "",
    p.manualReviewFlag ? "需复核" : ""
  ].filter(Boolean);
  return `<div class="tag-row">${tags.map(tag => `<span class="tag">${escapeHtml(tag)}</span>`).join("")}</div>`;
}

function manualReviewHtml(p) {
  const lines = [];
  if (p.manualReviewReason) {
    lines.push(`<strong>${p.manualReviewFlag ? "复核原因" : "原复核原因"}</strong>${escapeHtml(p.manualReviewReason.replaceAll("|", " / "))}`);
  }
  if (p.reviewNote) {
    lines.push(`<strong>人工备注</strong>${escapeHtml(p.reviewNote)}`);
  }
  if (!lines.length && !p.manualOverrideApplied) return "";
  if (p.manualOverrideApplied && !p.reviewNote) {
    lines.push("<strong>人工状态</strong>已人工修正");
  }
  return `<div class="review-note">${lines.join("<br>")}</div>`;
}

function renderLegend(pois) {
  const items = currentLegendItems(pois).slice(0, 10);
  document.getElementById("legend").innerHTML = items.map(item => `
    <div class="legend-item"><span class="swatch" style="background:${item.color}"></span>${escapeHtml(item.label)}</div>
  `).join("");
}

function renderStats(pois) {
  if (state.mode === "deep") {
    renderDeepStats(pois);
    return;
  }
  setMetricLabels(["核心区", "500m", "1000m", "主导业态"]);
  const total = dataset.meta.total || 1;
  const view = state.mode === "analysis" ? activeView() : null;
  const rangeCounts = countBy(pois, "range");
  const statsCounts = statsCounter(pois, view);
  const sortedStats = Object.entries(statsCounts).sort((a, b) => b[1] - a[1]);
  document.getElementById("statModeLabel").textContent = view ? view.shortTitle || view.title : "当前筛选";
  document.getElementById("currentCount").textContent = pois.length;
  document.getElementById("currentShare").textContent = `${view ? "专题样本" : "样本"}占比 ${(pois.length / total * 100).toFixed(1)}%`;
  document.getElementById("metricCore").textContent = rangeCounts.core_polygon || 0;
  document.getElementById("metric500").textContent = rangeCounts.buffer_500m || 0;
  document.getElementById("metric1000").textContent = rangeCounts.buffer_1000m || 0;
  document.getElementById("metricTop").textContent = sortedStats[0] ? sortedStats[0][0] : "-";
  document.getElementById("barTitle").textContent = view ? "专题结构" : "业态占比";
  const max = sortedStats[0] ? sortedStats[0][1] : 1;
  document.getElementById("barList").innerHTML = sortedStats.slice(0, 8).map(([key, count]) => {
    const color = colorForStatKey(key, view);
    return `<div>
      <div class="bar-head"><span>${escapeHtml(key)}</span><strong>${count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${count / max * 100}%; background:${color}"></div></div>
    </div>`;
  }).join("");
  if (view) {
    document.getElementById("insightText").textContent = `${view.description} ${view.judgement || ""}`;
    document.getElementById("drawingTips").innerHTML = `
      <li>${escapeHtml(view.drawingHint || "可作为课程图纸专题底图。")}</li>
      <li>对应静态图纸：${escapeHtml(view.figure || "")}</li>
      <li>可直接导出当前高德底图和专题图层。</li>`;
  } else {
    const topic = TOPICS.find(t => t.id === state.topic);
    const topText = sortedStats[0] ? `当前以“${sortedStats[0][0]}”为主导业态，占筛选结果 ${(sortedStats[0][1] / Math.max(pois.length, 1) * 100).toFixed(1)}%。` : "";
    document.getElementById("insightText").textContent = `${topic ? topic.insight : ""} ${topText}`;
    document.getElementById("drawingTips").innerHTML = `
      <li>截图当前专题作为底图点位表达。</li>
      <li>结合 figures 文件夹中的 PNG/SVG 做汇报排版。</li>
      <li>核心区建议叠加街巷、入口、停车与活力节点。</li>`;
  }
}

function renderDeepStats(pois) {
  const topic = activeDeepTopic();
  const dimension = activeDeepDimension();
  const field = dimension.field;
  const statsCounts = statsCounter(pois, null);
  const sortedStats = Object.entries(statsCounts).sort((a, b) => b[1] - a[1]);
  const districtCounts = countBy(pois, "businessDistrict");
  const manualReview = pois.filter(p => p.manualReviewFlag).length;
  const districtLabel = Array.from(state.deepDistricts).join(" / ");
  setMetricLabels(["场地内", "东北商圈", "西南商圈", "待确认"]);
  document.getElementById("statModeLabel").textContent = topic.label;
  document.getElementById("currentCount").textContent = pois.length;
  document.getElementById("currentShare").textContent = `${dimension.label} · ${districtLabel}${state.deepReviewOnly ? " · 只看待复核" : ""}`;
  document.getElementById("metricCore").textContent = districtCounts["场地内"] || 0;
  document.getElementById("metric500").textContent = districtCounts["东北商圈"] || 0;
  document.getElementById("metric1000").textContent = districtCounts["西南商圈"] || 0;
  document.getElementById("metricTop").textContent = manualReview;
  document.getElementById("barTitle").textContent = `${dimension.label} Top`;
  const max = sortedStats[0] ? sortedStats[0][1] : 1;
  document.getElementById("barList").innerHTML = sortedStats.slice(0, 10).map(([key, count]) => {
    const color = colorForDeepValue(key, field);
    return `<div>
      <div class="bar-head"><span>${escapeHtml(key)}</span><strong>${count}</strong></div>
      <div class="bar-track"><div class="bar-fill" style="width:${count / max * 100}%; background:${color}"></div></div>
    </div>`;
  }).join("");
  document.getElementById("insightText").textContent = `${topic.description} ${topic.insight}`;
  document.getElementById("drawingTips").innerHTML = renderDistrictCompare(pois, field, manualReview);
}

function renderDistrictCompare(pois, field, manualReview) {
  const districts = ["场地内", "东北商圈", "西南商圈"].filter(d => state.deepDistricts.has(d));
  const cards = districts.map(district => {
    const items = pois.filter(p => p.businessDistrict === district);
    const top = Object.entries(countBy(items, field)).sort((a, b) => b[1] - a[1])[0];
    return `<div class="district-card">
      <strong>${escapeHtml(district)}</strong><em>${items.length}</em>
      <span>主导项</span><span>${top ? `${escapeHtml(top[0])} ${top[1]}` : "-"}</span>
    </div>`;
  }).join("");
  return `<div class="district-compare">${cards}</div><span class="review-chip">待人工确认 ${manualReview} 条</span>`;
}

function setMetricLabels(labels) {
  document.querySelectorAll(".metric-grid span").forEach((node, index) => {
    if (labels[index]) node.textContent = labels[index];
  });
}

function statsCounter(pois, view) {
  if (state.mode === "deep") return countBy(pois, activeDeepDimension().field);
  if (!view) return countBy(pois, "category");
  if (view.colorBy === "range") {
    return pois.reduce((acc, p) => {
      acc[p.rangeLabel] = (acc[p.rangeLabel] || 0) + 1;
      return acc;
    }, {});
  }
  if (view.colorBy === "visitorDaily") return countBy(pois, "visitorDaily");
  if (view.colorBy === "group") {
    return pois.reduce((acc, p) => {
      const group = primaryGroup(p, view);
      const label = GROUP_LABELS[group] || "其他";
      acc[label] = (acc[label] || 0) + 1;
      return acc;
    }, {});
  }
  return countBy(pois, "category");
}

function currentLegendItems(pois) {
  const view = state.mode === "analysis" ? activeView() : null;
  if (state.mode === "deep") {
    const dimension = activeDeepDimension();
    return Object.entries(countBy(pois, dimension.field))
      .sort((a, b) => b[1] - a[1])
      .slice(0, 12)
      .map(([label]) => ({ label, color: colorForDeepValue(label, dimension.field) }));
  }
  if (view?.legend?.length) return view.legend;
  if (view?.colorBy === "range") {
    return [
      { label: "核心街区", color: RANGE_COLORS.core_polygon },
      { label: "500m影响圈", color: RANGE_COLORS.buffer_500m },
      { label: "1000m周边圈", color: RANGE_COLORS.buffer_1000m },
    ];
  }
  if (view?.colorBy === "visitorDaily") {
    return Object.entries(VISITOR_COLORS).map(([label, color]) => ({ label, color }));
  }
  if (view?.colorBy === "group") {
    return Object.entries(GROUP_LABELS).map(([group, label]) => ({ label, color: GROUP_COLORS[group] || "#9CA3AF" }));
  }
  const counts = countBy(pois, "category");
  return Object.entries(counts)
    .sort((a, b) => b[1] - a[1])
    .map(([cat]) => ({ label: cat, color: dataset.meta.categoryColors[cat] || "#9CA3AF" }));
}

function colorForPoi(p, view) {
  if (state.mode === "deep") {
    const dimension = activeDeepDimension();
    return colorForDeepValue(p[dimension.field], dimension.field);
  }
  if (view?.colorBy === "range") return RANGE_COLORS[p.range] || "#9CA3AF";
  if (view?.colorBy === "visitorDaily") return VISITOR_COLORS[p.visitorDaily] || VISITOR_COLORS["其他"];
  if (view?.colorBy === "group") return GROUP_COLORS[primaryGroup(p, view)] || "#9CA3AF";
  return dataset.meta.categoryColors[p.category] || "#9CA3AF";
}

function colorForStatKey(key, view) {
  if (state.mode === "deep") return colorForDeepValue(key, activeDeepDimension().field);
  if (!view) return dataset.meta.categoryColors[key] || "#9CA3AF";
  if (view.colorBy === "range") {
    const rangeEntry = Object.entries({
      core_polygon: "核心街区",
      buffer_500m: "500m影响圈",
      buffer_1000m: "1000m周边圈"
    }).find(([, label]) => label === key);
    return rangeEntry ? RANGE_COLORS[rangeEntry[0]] : "#9CA3AF";
  }
  if (view.colorBy === "visitorDaily") return VISITOR_COLORS[key] || "#9CA3AF";
  if (view.colorBy === "group") {
    const group = Object.entries(GROUP_LABELS).find(([, label]) => label === key)?.[0];
    return GROUP_COLORS[group] || "#9CA3AF";
  }
  return dataset.meta.categoryColors[key] || "#9CA3AF";
}

function colorForDeepValue(value, field) {
  const label = value || "未分类";
  if (field === "category") return dataset.meta.categoryColors[label] || "#9CA3AF";
  const fieldColors = dataset.meta.deepFieldColors || {};
  const palette = fieldColors[field] || fieldColors[toCamelField(field)] || {};
  if (palette[label]) return palette[label];
  let hash = 0;
  for (const char of label) hash = (hash * 31 + char.charCodeAt(0)) >>> 0;
  return FALLBACK_PALETTE[hash % FALLBACK_PALETTE.length];
}

function toCamelField(field) {
  return {
    businessDistrict: "businessDistrict",
    consumptionLevel: "consumptionLevel",
    customerType: "customerType",
    designAction: "designAction"
  }[field] || field;
}

function primaryGroup(p, view) {
  const preferred = view?.filters?.groups || ["commercial_vitality", "public_service", "mobility", "tourism", "daily_life"];
  return preferred.find(group => p.analysisGroups.includes(group)) || p.analysisGroups[0] || "other";
}

function resetView() {
  if (mapMode === "amap" && map) {
    map.setZoomAndCenter(15.8, dataset.meta.center);
  }
}

function fitActiveView() {
  if (mapMode !== "amap" || !map) return;
  const view = activeView();
  const pois = poisForAnalysisView(view);
  if (!pois.length) {
    resetView();
    return;
  }
  const points = pois.slice(0, 900).map(p => [p.lon, p.lat]);
  map.setFitView(null, false, [70, 70, 70, 70]);
  if (points.length < 4) {
    resetView();
  }
}

function fitDeepView() {
  if (mapMode !== "amap" || state.mode !== "deep" || !map) return;
  const pois = poisForDeepView();
  if (!pois.length) {
    resetView();
    return;
  }
  const points = pois.slice(0, 900).map(p => [p.lon, p.lat]);
  map.setFitView(null, false, [80, 80, 80, 80]);
  if (points.length < 4) resetView();
}

async function exportCurrentMap() {
  const btn = document.getElementById("screenshotBtn");
  const status = document.getElementById("screenshotStatus");
  const pois = currentPois();
  btn.disabled = true;
  status.textContent = "生成中";
  try {
    const dataUrl = mapMode === "amap" ? await captureAmapDataUrl() : await captureStaticDataUrl();
    const finalUrl = await composeExportImage(dataUrl, pois);
    downloadDataUrl(finalUrl, exportFilename());
    status.textContent = "已下载";
    setTimeout(() => { status.textContent = ""; }, 1800);
  } catch (err) {
    console.error(err);
    status.textContent = "导出失败";
  } finally {
    btn.disabled = false;
  }
}

async function captureAmapDataUrl() {
  if (!screenshotPluginReady || !window.AMap?.Screenshot) {
    throw new Error("高德截图插件未加载");
  }
  const screenshot = new AMap.Screenshot(map);
  try {
    return await screenshot.toDataURL("image/png");
  } finally {
    if (screenshot.destroy) screenshot.destroy();
  }
}

async function captureStaticDataUrl() {
  const clone = svgRoot.cloneNode(true);
  clone.setAttribute("xmlns", "http://www.w3.org/2000/svg");
  const source = new XMLSerializer().serializeToString(clone);
  const svgUrl = URL.createObjectURL(new Blob([source], { type: "image/svg+xml;charset=utf-8" }));
  try {
    const image = await loadImage(svgUrl);
    const canvas = document.createElement("canvas");
    canvas.width = 1600;
    canvas.height = 1200;
    const ctx = canvas.getContext("2d");
    ctx.fillStyle = "#FAFAF7";
    ctx.fillRect(0, 0, canvas.width, canvas.height);
    ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
    return canvas.toDataURL("image/png");
  } finally {
    URL.revokeObjectURL(svgUrl);
  }
}

async function composeExportImage(dataUrl, pois) {
  const image = await loadImage(dataUrl);
  const canvas = document.createElement("canvas");
  canvas.width = image.naturalWidth || image.width;
  canvas.height = image.naturalHeight || image.height;
  const ctx = canvas.getContext("2d");
  ctx.drawImage(image, 0, 0, canvas.width, canvas.height);
  drawExportOverlay(ctx, canvas.width, canvas.height, pois);
  return canvas.toDataURL("image/png");
}

function drawExportOverlay(ctx, width, height, pois) {
  const view = state.mode === "analysis" ? activeView() : null;
  const deepTopic = state.mode === "deep" ? activeDeepTopic() : null;
  const title = deepTopic ? `深层业态模式 · ${deepTopic.label}` : view ? view.title : "POI筛选模式";
  const subtitle = deepTopic ? `${activeDeepDimension().label} · ${deepTopic.description}` : view ? view.description : TOPICS.find(t => t.id === state.topic)?.label || "全部 POI";
  const scale = Math.max(1, width / 1280);
  const pad = 18 * scale;
  const panelWidth = Math.min(width - pad * 2, 560 * scale);
  const panelHeight = 92 * scale;
  ctx.save();
  ctx.font = `${13 * scale}px sans-serif`;
  ctx.fillStyle = "rgba(255,255,255,.94)";
  roundRect(ctx, pad, pad, panelWidth, panelHeight, 10 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(17,24,39,.16)";
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = `800 ${20 * scale}px sans-serif`;
  ctx.fillText(title, pad + 16 * scale, pad + 30 * scale);
  ctx.fillStyle = "#425063";
  ctx.font = `${12 * scale}px sans-serif`;
  wrapText(ctx, subtitle, pad + 16 * scale, pad + 53 * scale, panelWidth - 32 * scale, 17 * scale, 2);
  ctx.fillStyle = "#111827";
  ctx.font = `700 ${12 * scale}px sans-serif`;
  ctx.fillText(`POI ${pois.length} 条 · ${new Date().toLocaleString("zh-CN", { hour12: false })}`, pad + 16 * scale, pad + 80 * scale);
  const legend = currentLegendItems(pois).slice(0, 8);
  const legendWidth = Math.min(width - pad * 2, 390 * scale);
  const rowHeight = 22 * scale;
  const legendHeight = (legend.length + 1) * rowHeight + 12 * scale;
  const lx = pad;
  const ly = height - legendHeight - pad;
  ctx.fillStyle = "rgba(255,255,255,.94)";
  roundRect(ctx, lx, ly, legendWidth, legendHeight, 10 * scale);
  ctx.fill();
  ctx.strokeStyle = "rgba(17,24,39,.16)";
  ctx.stroke();
  ctx.fillStyle = "#111827";
  ctx.font = `800 ${13 * scale}px sans-serif`;
  ctx.fillText("图例", lx + 14 * scale, ly + 22 * scale);
  legend.forEach((item, index) => {
    const y = ly + 44 * scale + index * rowHeight;
    ctx.fillStyle = item.color;
    ctx.beginPath();
    ctx.arc(lx + 19 * scale, y - 5 * scale, 5 * scale, 0, Math.PI * 2);
    ctx.fill();
    ctx.fillStyle = "#263241";
    ctx.font = `${12 * scale}px sans-serif`;
    ctx.fillText(item.label, lx + 32 * scale, y);
  });
  ctx.restore();
}

function roundRect(ctx, x, y, width, height, radius) {
  ctx.beginPath();
  ctx.moveTo(x + radius, y);
  ctx.arcTo(x + width, y, x + width, y + height, radius);
  ctx.arcTo(x + width, y + height, x, y + height, radius);
  ctx.arcTo(x, y + height, x, y, radius);
  ctx.arcTo(x, y, x + width, y, radius);
  ctx.closePath();
}

function wrapText(ctx, text, x, y, maxWidth, lineHeight, maxLines) {
  let line = "";
  let lines = 0;
  for (const char of text) {
    const next = line + char;
    if (ctx.measureText(next).width > maxWidth && line) {
      ctx.fillText(line, x, y + lines * lineHeight);
      line = char;
      lines += 1;
      if (lines >= maxLines) return;
    } else {
      line = next;
    }
  }
  if (line && lines < maxLines) ctx.fillText(line, x, y + lines * lineHeight);
}

function loadImage(src) {
  return new Promise((resolve, reject) => {
    const image = new Image();
    image.onload = () => resolve(image);
    image.onerror = reject;
    image.src = src;
  });
}

function downloadDataUrl(dataUrl, filename) {
  const link = document.createElement("a");
  link.href = dataUrl;
  link.download = filename;
  document.body.appendChild(link);
  link.click();
  link.remove();
}

function exportFilename() {
  const view = state.mode === "analysis" ? activeView()?.id : state.mode === "deep" ? `${state.deepTopic}-${state.deepDimension}` : state.topic;
  const timestamp = new Date().toISOString().replace(/[-:]/g, "").replace(/\..+/, "").replace("T", "-");
  return `dongqian-poi-${state.mode}-${view}-${timestamp}.png`;
}

function sortedCategories() {
  return Object.entries(dataset.meta.categorySummary).sort((a, b) => b[1] - a[1]);
}

function countBy(items, key) {
  return items.reduce((acc, item) => {
    const value = item[key] || "未分类";
    acc[value] = (acc[value] || 0) + 1;
    return acc;
  }, {});
}

function escapeHtml(value) {
  return String(value ?? "").replace(/[&<>"']/g, s => ({ "&": "&amp;", "<": "&lt;", ">": "&gt;", '"': "&quot;", "'": "&#39;" }[s]));
}

function fallbackAnalysisViews() {
  return [
    { id: "fig01", title: "fig01 研究范围总图", shortTitle: "研究范围", description: "显示研究范围、圈层和全部 POI。", filters: {}, showPoints: true, showHeat: false, colorBy: "category" }
  ];
}

init();
