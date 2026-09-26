# lyric-slides

歌词幻灯片模板：用简单的文本文件管理歌单，自动生成 [Slidev](https://sli.dev) 演出字幕页，一键部署到 GitHub Pages。

适合乐队演出、年会节目、Livehouse 提词大屏：**改文本，不改代码**。

本仓库自带示例为 **AfterWork 乐队 2026 年会演出**歌单（9 首歌，成员名单已匿名化，集中在 `band.yaml` 一处可改）。

## 效果特性

- 🎵 **一首歌 = 一个文本文件**（`songs/*.txt`），歌词按 `---` 分页
- 📐 **自动排版**：两行歌词对角排布，单行居中；支持交错（zigzag）、强调、间奏标记
- 🎨 **4 种曲风字体**：摇滚 `rock` / 抒情 `romantic` / 空灵 `ethereal` / 励志 `inspiring`
- ⬇️ **歌词抓取脚本**：一行命令从 LRCLIB 抓歌词并自动切片成分页
- 🎤 **演职员表配置化**：`band.yaml` 一处管理乐队名与名单
- 🚀 **GitHub Pages 自动部署**：push 即发布

## 快速开始

```bash
bun install        # 或 npm install
bun run dev        # 开发预览（自动生成 pages/ 与 slides.md 后启动 Slidev）
bun run build      # 构建到 dist/
bun run export     # 导出 PDF（需要 playwright-chromium）
```

## 添加一首歌

### 方式 A：自动抓取 + 切片

```bash
bun run fetch -- "鲜花" --artist "回春丹" --style romantic --lines 2
```

从 [LRCLIB](https://lrclib.net) 抓取歌词，剥掉时间戳，每 2 行切成一页，写入 `songs/10-xxx.txt`（序号自动续）。抓不到时可用本地文件兜底：

```bash
bun run fetch -- --from ./歌词.lrc --title "鲜花" --style romantic
```

> ⚠️ 抓到的歌词请务必人工校对，并按演出需要删减、调整分页。

### 方式 B：手写源文件

新建 `songs/10-我的歌.txt`：

```
---
title: 鲜花            # 歌名（必填）
style: romantic        # 曲风：rock | romantic | ethereal | inspiring
background: bg.png     # 背景图，放进 public/ 后在此填文件名（可选）
artist: 回春丹         # 封面副标题（可选）
---

我的心啊我的心          # 两行一页 → 对角排版（左上 / 右下）
整栋出租
---
处处都给你            # 单行一页 → 居中
---
! 永远开满了鲜花        # 「! 」前缀 → 强调行（大字号 + 呼吸光效）
---
~ 🎸 solo 🎸          # 「~ 」前缀 → 间奏标记（小字号淡化）
---
@duo                  # 「@duo」开头 → 两行交错排版（zigzag）
信我白手起的 辛苦赚给我的
值得更好 的一个理由
```

文件名前缀数字决定演出顺序。保存后 `bun run dev` 即可看到新歌。

### 背景图

把图片放进 `public/`（建议 1920×1080 PNG），在歌曲头部填 `background: 文件名`。不配图也能用，默认深色渐变背景。

## 演职员表

编辑 `band.yaml`：

```yaml
event_title: AfterWork        # 头页大标题 / 结尾页乐队名
event_subtitle: 2026 Annual Party
members:
  - { name: 王耀晖, role: 主唱 }
  - { name: 颜秋宇, role: 主唱 }
```

## 部署

### GitHub Pages（推荐，已内置 workflow）

1. push 到 GitHub
2. 仓库 **Settings → Pages → Source** 选 **GitHub Actions**
3. 之后每次 push 到 `main` 自动构建发布

站点地址为 `https://<用户名>.github.io/<仓库名>/`，子路径由 workflow 自动适配（fork 后改仓库名也能直接用）。

### Netlify / Vercel

已内置 `netlify.toml` 与 `vercel.json`，直接导入仓库即可（构建命令 `npm run build`，产物目录 `dist`）。

## 目录结构

```
songs/               # 歌曲源文件（你主要编辑这里）
  01-choose_c.txt
  ...
band.yaml            # 乐队/演出配置（演职员表）
scripts/
  generate.mjs       # 生成器：songs/ + band.yaml → pages/ + slides.md
  fetch-lyrics.mjs   # 歌词抓取 + 切片
pages/               # 生成产物（Slidev 页面，请勿手改）
slides.md            # 生成产物（Slidev 主文件）
styles/index.css     # 全部样式（曲风字体、排版、动效）
public/              # 背景图等静态资源
```

> `pages/` 与 `slides.md` 由 `npm run generate` 自动生成（`dev`/`build` 前会自动执行）。要改内容请改 `songs/` 和 `band.yaml`；要改样式请改 `styles/index.css`。

## 版权与免责声明

- 本**模板代码**以 [MIT](LICENSE) 协议开源。
- 仓库内**演示歌词**版权归原作者 / 唱片公司所有，仅作非商业演示之用。
- 使用 `fetch` 脚本抓取或自行填写的歌词，请确保你的使用方式已获得授权或符合当地法律；公开部署含他人歌词的站点风险自负。
- 背景图为 AI 生成示意图，可自由替换。

## 致谢

- 基于 [Slidev](https://sli.dev) 构建
- 歌词数据来自 [LRCLIB](https://lrclib.net)
- 示例歌单来自 AfterWork 乐队 2026 年会演出
