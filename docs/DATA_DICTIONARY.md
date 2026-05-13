# 数据字典

本文档说明 `data/` 目录下 CSV、GeoJSON 和 JSON 的主要字段。缺失字段保留为空，不进行人工补造。

## 原始 POI 表

文件：

- `data/raw_poi/raw_poi_core.csv`
- `data/raw_poi/raw_poi_500m.csv`
- `data/raw_poi/raw_poi_1000m.csv`

主要字段：

| 字段 | 说明 |
|---|---|
| `id` | 高德 POI ID，去重的优先依据。 |
| `name` | POI 名称。 |
| `type` | 高德返回的类型文本，可能含多级分类。 |
| `typecode` | 高德类型编码，可能包含多个编码。 |
| `lon` | 经度，从 `location` 解析。 |
| `lat` | 纬度，从 `location` 解析。 |
| `address` | 地址。 |
| `pname` | 省份名称。 |
| `cityname` | 城市名称。 |
| `adname` | 行政区名称。 |
| `source` | 数据来源，本项目为 Amap。 |
| `query_type` | 查询方式，如 polygon、around、keyword。 |
| `query_category` | 本项目定义的功能分类。 |
| `range_level` | 原始采集所属圈层。 |
| `采集时间` | 脚本运行采集时间。 |
| `tel` | 电话，高德返回则保留。 |
| `distance` | 高德 around 查询返回距离。 |
| `biz_ext` | 高德扩展商业字段，原样 JSON 字符串保存。 |
| `photos` | 高德照片字段，原样 JSON 字符串保存。 |
| `parent` | 父 POI 信息。 |
| `childtype` | 子 POI 类型。 |
| `entr_location` | 入口位置，高德返回则保留。 |
| `exit_location` | 出口位置，高德返回则保留。 |
| `business_area` | 商圈字段。 |
| `raw_location` | 高德原始 `location` 字符串。 |
| `query_keyword` | 关键词验证查询使用的关键词。 |
| `query_types` | 查询使用的高德 typecode。 |
| `query_page` | 分页页码。 |
| `query_center` | around 查询中心点。 |
| `query_radius` | around 查询半径。 |

## 清洗总表

文件：`data/processed/poi_cleaned.csv`

除原始字段外，增加：

| 字段 | 说明 |
|---|---|
| `main_category` | 用于统计和制图的主功能分类，如餐饮、购物、生活服务等。 |
| `in_core_polygon` | 是否位于核心街区 polygon 内。 |
| `in_buffer_500m` | 是否位于中心点 500m 圈内。 |
| `in_buffer_1000m` | 是否位于中心点 1000m 圈内。 |
| `distance_to_center_m` | 到核心中心点的距离，单位米。 |
| `dedupe_key` | 去重键，优先使用高德 ID，缺失 ID 时由名称、坐标和类型构成。 |

`range_level` 在清洗后表示 POI 归属的最小圈层，优先级为 `core_polygon`、`buffer_500m`、`buffer_1000m`。

## GIS 文件

文件：`data/gis/poi_cleaned.geojson`

坐标为高德返回的 GCJ-02 数值坐标，未进行 WGS84 转换。GeoJSON 中每个 `Feature` 的 `geometry` 为点，`properties` 保留主要制图字段：

- `id`
- `name`
- `type`
- `typecode`
- `address`
- `range_level`
- `main_category`
- `distance_to_center_m`

无坐标或坐标不可解析的记录不写入 GeoJSON。

## 汇总表

文件：

- `data/summaries/poi_summary_by_type.csv`
- `data/summaries/poi_summary_by_range.csv`

`poi_summary_by_type.csv` 按 `main_category` 汇总各圈层数量。

`poi_summary_by_range.csv` 按最小圈层汇总各主功能数量。

## 可视化 JSON

文件：`data/visual_json/poi_visual_data.json`

该文件是交互地图使用的轻量化数据，主要包含：

- `pois`：POI 点数组。
- `ranges`：圈层标签和样式信息。
- `categories`：功能分类颜色和显示名称。
- `topics`：专题筛选口径，如商业活力、公共服务、交通到达、旅游/本地生活。
- `corePolygon`：核心区边界。
- `center`：分析中心点。

每个 POI 记录会保留 `name`、`main_category`、`type`、`address`、`range_level`、`distance_to_center_m`、`analysis_groups` 等字段，供地图筛选和弹窗显示。

