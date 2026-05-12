# 东前街 POI 可视化分析说明

## 成果清单
- `index.html`：高德在线底图交互地图。
- `data/poi_visual_data.json`：地图与图表使用的轻量化 POI 数据。
- `figures/fig01_study_area_overview.png/svg`：研究范围总图。
- `figures/fig02_function_mix_by_range.png/svg`：圈层业态结构图。
- `figures/fig03_function_category_map.png/svg`：POI 分类点图。
- `figures/fig04_commercial_vitality_heatmap.png/svg`：商业活力热力图。
- `figures/fig05_public_service_map.png/svg`：公共服务完整度图。
- `figures/fig06_arrival_transport_map.png/svg`：交通与到达性图。
- `figures/fig07_tourism_vs_daily_life.png/svg`：文旅商业与本地生活关系图。
- `figures/fig08_problem_strategy_diagram.png/svg`：问题诊断与设计策略图。

## 数据口径
- 数据源：`poi_cleaned.csv`，共 2810 条 POI。
- 坐标：高德 GCJ-02，经度在前、纬度在后。
- 圈层：核心街区 47 条，500m影响圈 1130 条，1000m周边圈 1633 条。
- 专题字段：脚本根据 `main_category`、`name`、`type` 派生 `analysis_groups`，用于交互地图专题筛选。

## 主要结论
- 业态结构以购物、餐饮、生活服务为主，购物 1062 条、餐饮 425 条、生活服务 413 条。
- 商业活力类 POI 1602 条，说明东前街及周边具备较强消费型活力基础。
- 公共服务类 POI 369 条，核心区内部相对偏少，适合在图纸中表达公厕、休憩、社区服务补点。
- 交通到达相关 POI 250 条，停车场与公交/路口节点可作为慢行导向和换乘组织的切入点。
- 居民日常相关 POI 869 条，可与文旅消费型 POI 对照，判断老城更新中游客商业与本地生活的平衡。

## 使用方式
1. 在项目根目录执行：`source ~/.zshrc && python3 visual_analysis/serve_visual_analysis.py`
2. 浏览器打开：`http://127.0.0.1:8765/`
3. 在左侧切换专题、圈层和业态；打开热力图用于截图表达商业活力。

## 制图提示
- 汇报图纸中建议把 `fig01` 放在分析开篇，说明研究范围和样本基础。
- `fig02` 适合做业态结构定量依据。
- `fig04`、`fig06`、`fig08` 可以串成“活力-到达-策略”的设计推导链。
- `fig05` 与 `fig07` 适合支撑公共服务补足和旅游商业/居民生活平衡的论证。
