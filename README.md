# 嵊州老城·东前街 POI 可视化分析

这是浙江省绍兴市嵊州市“嵊州老城·东前街”及周边环境的 POI 可视化展示仓库。页面用于城市设计课程图纸表达，重点呈现研究范围、业态结构、街区活力、公共服务、交通到达性，以及旅游商业与本地生活之间的关系。

在线访问：

- GitHub Pages: https://t2860270510-maker.github.io/dongqian-poi-visual-analysis/
- Vercel: https://dongqian-poi-visual-analysis.vercel.app/

## 数据口径

- 数据来源：高德地图 Web 服务 API 可检索 POI 样本。
- 坐标系：高德 GCJ-02，经纬度顺序为 `lon,lat`。
- 核心中心点：`120.823632,29.587196`。
- 研究圈层：`core_polygon`、`buffer_500m`、`buffer_1000m`。
- 清洗后 POI：2810 条。

本成果不等同于政府全量设施数据库，也不代表真实客流或经营状态。接口未返回的字段不人工补造。

## 研究范围

核心区 polygon：

```text
120.821971,29.587232|120.822111,29.58672|120.823303,29.58698|120.823511,29.586596|120.82545,29.587243|120.825447,29.588404|120.821971,29.587232
```

圈层统计：

| 圈层 | POI 数量 |
|---|---:|
| core_polygon | 47 |
| buffer_500m | 1130 |
| buffer_1000m | 1633 |

主要业态：

| 主功能 | 数量 |
|---|---:|
| 购物 | 1062 |
| 餐饮 | 425 |
| 生活服务 | 413 |
| 停车场 | 196 |
| 政府公共服务 | 129 |
| 医疗 | 121 |
| 住宅小区 | 72 |
| 公共设施 | 65 |
| 休闲娱乐 | 61 |
| 住宿 | 54 |
| 教育文化 | 54 |
| 文旅景点 | 35 |

## 页面功能

交互地图支持：

- 按圈层筛选：核心区、500m、1000m。
- 按业态筛选：餐饮、购物、生活服务、停车场、公共服务、文旅景点等。
- 按专题筛选：全部 POI、商业活力、公共服务、交通到达、旅游/本地生活。
- 点图和热力图切换。
- 点击 POI 查看名称、类型、地址、圈层和到中心点距离。

静态图纸素材位于 `figures/`，包括研究范围总图、业态结构图、分类点图、商业活力热力图、公共服务图、交通到达性图、旅游/本地生活关系图、问题诊断与策略图。

## 目录结构

```text
.
  index.html
  app.js
  styles.css
  config.js
  api/
    config.js
  data/
    poi_visual_data.json
  figures/
    fig01_study_area_overview.png
    ...
  docs/
    PROJECT_OVERVIEW.md
    DATA_DICTIONARY.md
    DATA_COLLECTION_METHOD.md
    VISUALIZATION_GUIDE.md
    DEPLOYMENT_GUIDE.md
    LIMITATIONS.md
  visual_analysis_report.md
  vercel.json
```

## GitHub Pages 与 Vercel

GitHub Pages 是纯静态托管版本，不保存高德 Key。页面会在没有 Key 时回退到静态分析底图，仍可展示 POI 点位、筛选、统计和图纸素材。

Vercel 版本通过 `api/config.js` 从环境变量读取高德 JS API 配置：

- `AMAP_KEY`
- `AMAP_SECURITY_KEY`

真实 Key 不提交到仓库。`config.js` 只作为无 Key fallback。

## 本地预览

静态预览：

```bash
python3 -m http.server 8766
```

然后打开：

```text
http://127.0.0.1:8766/
```

若需要高德在线底图，请使用课程本地项目中的 `visualization/local_web_app/serve_visual_analysis.py`，或在 Vercel 中配置环境变量后访问 Vercel 地址。

## 城市设计解读

- 业态结构以购物、餐饮、生活服务为主，说明东前街是商业消费和居民日常服务叠合的老城街区。
- 商业活力类 POI 集中，可作为夜间经济、步行商业和街巷节点设计的依据。
- 公共服务类 POI 在周边圈层较完整，但核心区内部仍应关注公厕、休憩、社区服务和导向设施补足。
- 停车场、公交站、路口和出入口适合形成“到达节点 + 慢行导向 + 公共空间节点”的设计链条。
- 游客消费型 POI 明显多于文旅景点本身，更新策略应避免单一商业化，保留本地生活服务。

## 文档

- [项目总览](docs/PROJECT_OVERVIEW.md)
- [数据字典](docs/DATA_DICTIONARY.md)
- [采集与清洗方法](docs/DATA_COLLECTION_METHOD.md)
- [可视化指南](docs/VISUALIZATION_GUIDE.md)
- [可视化分析报告](docs/VISUAL_ANALYSIS_REPORT.md)
- [部署说明](docs/DEPLOYMENT_GUIDE.md)
- [局限性说明](docs/LIMITATIONS.md)
