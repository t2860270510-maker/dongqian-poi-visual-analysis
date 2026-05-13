# 部署说明

## 发布仓库

发布仓库本地路径：

```text
/Users/tht/Documents/学校课程/25-26T2BigData/dongqian_street_poi_project/publish/dongqian-poi-visual-analysis-pages/
```

远程仓库：

```text
https://github.com/t2860270510-maker/dongqian-poi-visual-analysis
```

线上地址：

- GitHub Pages: https://t2860270510-maker.github.io/dongqian-poi-visual-analysis/
- Vercel: https://dongqian-poi-visual-analysis.vercel.app/

## GitHub Pages

GitHub Pages 只能安全托管静态文件，因此公开版不保存高德 Key。

页面加载逻辑：

1. 先尝试读取 `/api/config`。
2. GitHub Pages 不支持该 API，读取失败后回退到 `config.js`。
3. `config.js` 中不写入真实 Key。
4. 没有 Key 时，页面使用静态分析底图和 POI 点图，仍可展示数据与筛选结果。

## Vercel

Vercel 支持 Serverless Function，项目中 `api/config.js` 会从环境变量读取 Key：

- `AMAP_KEY`
- `AMAP_SECURITY_KEY`

安全原则：

- 不在 `index.html`、`app.js`、`config.js`、README 或 Git 历史中提交真实 Key。
- 只在 Vercel 控制台或 Vercel CLI 的环境变量系统中保存 Key。
- `/api/config` 只用于前端加载高德 JS API 所需配置。

## 本地运行

本地课程目录中的 `visualization/local_web_app/serve_visual_analysis.py` 会从本机环境变量读取 Key：

```bash
cd /Users/tht/Documents/学校课程/25-26T2BigData/dongqian_street_poi_project
source ~/.zshrc
python3 visualization/local_web_app/serve_visual_analysis.py
```

打开：

```text
http://127.0.0.1:8765/
```

## 推送更新

```bash
cd /Users/tht/Documents/学校课程/25-26T2BigData/dongqian_street_poi_project/publish/dongqian-poi-visual-analysis-pages
git status
git add README.md docs visual_analysis_report.md
git commit -m "Update project documentation"
git push
```

推送后 GitHub Pages 和 Vercel 会根据仓库更新自动刷新。

## 安全检查

推送前建议执行：

```bash
rg -n "<GitHub token prefix>|<hard-coded Amap key>|<security code literal>" .
```

命中 `process.env.AMAP_KEY`、`process.env.AMAP_SECURITY_KEY` 这类变量名是正常的；不应出现真实 Key 值。
