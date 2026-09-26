#!/usr/bin/env node
/**
 * lyric-slides 生成器
 *
 * 读取 songs/*.txt（歌曲源文件）与 band.yaml（演出配置），
 * 生成 Slidev 源文件：pages/<slug>.md（每首歌）与 slides.md（主文件）。
 *
 * 之后照常使用 slidev dev / slidev build，技术栈不变。
 *
 * 用法：node scripts/generate.mjs
 */

import {
  readdirSync, readFileSync, writeFileSync, mkdirSync, rmSync,
} from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SONGS_DIR = join(ROOT, 'songs')
const PAGES_DIR = join(ROOT, 'pages')
const BAND_FILE = join(ROOT, 'band.yaml')

/* ---------------------------------- 解析 ---------------------------------- */

const STYLES = new Set(['rock', 'romantic', 'ethereal', 'inspiring'])

// 解析 band.yaml（仅支持本项目用到的扁平结构：标量 + members 列表）
function parseBandYaml(text) {
  const band = { event_title: 'My Band', event_subtitle: 'Live', members: [] }
  let inMembers = false
  for (const rawLine of text.split('\n')) {
    const line = rawLine.replace(/#.*$/, '').trimEnd()
    if (!line.trim()) continue
    if (/^members:/.test(line)) { inMembers = true; continue }
    if (inMembers) {
      const m = /-\s*\{\s*name:\s*(.+?)\s*,\s*role:\s*(.+?)\s*\}/.exec(line)
      if (m) band.members.push({ name: m[1], role: m[2] })
      continue
    }
    const kv = /^(\w+):\s*(.+)$/.exec(line)
    if (kv) band[kv[1]] = kv[2].trim()
  }
  return band
}

// 解析单个歌曲源文件 → { slug, head, blocks[] }
function parseSong(file) {
  const slug = file.replace(/\.txt$/, '').replace(/^\d+-/, '')
  const text = readFileSync(join(SONGS_DIR, file), 'utf8')
  const parts = text.split(/^---\s*$/m).map(s => s.replace(/^\n+|\n+$/g, ''))

  const head = { title: slug, style: 'romantic', background: '', artist: '' }
  const headLines = (parts[1] ?? '').split('\n')
  for (const rawLine of headLines) {
    const line = rawLine.replace(/\s+#.*$/, '').trim()
    const kv = /^(\w+):\s*(.*)$/.exec(line)
    if (kv && kv[1] in head) head[kv[1]] = kv[2].trim()
  }

  const blocks = parts.slice(2).filter(b => b.trim().length > 0)
  return { slug, head, blocks }
}

/* -------------------------------- 渲染辅助 -------------------------------- */

function lyricClass(style) {
  return STYLES.has(style) ? `lyrics-${style}` : 'lyrics-cn'
}

const isAscii = s => /^[\x20-\x7E]+$/.test(s)

// 标题过长（≥9 个字符）时降一档字号，避免溢出
function titleTag(title) {
  if (isAscii(title)) return `<h1 class="text-7xl title-en tracking-widest">${title}</h1>`
  const size = [...title].length >= 9 ? 'text-6xl' : 'text-7xl'
  return `<h1 class="${size} title-cn tracking-wider">${title}</h1>`
}

// 渲染一行歌词：'! ' 强调（大字号+呼吸光效），'~ ' 间奏标记（小字号淡化）
function lyricLine(line, style, extraClass = '') {
  if (line.startsWith('! ')) {
    const cls = `text-6xl ${lyricClass(style)} lyrics-emphasis ${extraClass}`.trim()
    return `<p class="${cls}">${line.slice(2)}</p>`
  }
  if (line.startsWith('~ ')) {
    const cls = `text-4xl ${lyricClass(style)} ${extraClass}`.trim()
    return `<p class="${cls}" style="opacity: 0.7;">${line.slice(2)}</p>`
  }
  const cls = `text-5xl ${lyricClass(style)} ${extraClass}`.trim()
  return `<p class="${cls}">${line}</p>`
}

/* -------------------------------- 页面渲染 -------------------------------- */

function renderSong({ head, blocks }) {
  const style = head.style
  const out = []

  // 封面页
  out.push(`---
layout: cover
${head.background ? `background: /${head.background}\n` : ''}class: text-center
---

<div class="slide-cover song-start">
  ${titleTag(head.title)}
  ${head.artist ? `<p class="text-xl subtitle mb-4">${head.artist}</p>\n  ` : ''}<div class="divider"></div>
</div>
`)

  // 歌词页
  for (const block of blocks) {
    const lines = block.split('\n').map(l => l.trimEnd()).filter(l => l.trim())
    const duo = lines[0] === '@duo'
    const lyricLines = duo ? lines.slice(1) : lines

    let containerClass = 'lyrics-container'
    let body
    if (lyricLines.length === 2 && duo) {
      containerClass += ' lyrics-duo'
      body = `  ${lyricLine(lyricLines[0], style, 'line-1')}\n  ${lyricLine(lyricLines[1], style, 'line-2')}`
    } else if (lyricLines.length === 2) {
      containerClass += ' lyrics-diagonal'
      body = `  ${lyricLine(lyricLines[0], style)}\n  ${lyricLine(lyricLines[1], style)}`
    } else {
      body = lyricLines.map(l => `  ${lyricLine(l, style)}`).join('\n')
    }

    out.push(`---
layout: center
---

<div class="${containerClass}">
${body}
</div>
`)
  }

  // 收尾页
  out.push(`---
layout: center
---

<div class="slide-cover song-end">
  <div class="divider"></div>
  <p class="text-3xl subtitle mt-4">${head.title}</p>
</div>
`)

  return out.join('\n')
}

function renderSlides(band, songs) {
  const fm = `---
theme: seriph
title: ${band.event_title} - ${band.event_subtitle}
class: text-center
highlighter: shiki
lineNumbers: false
info: |
  ## ${band.event_title}
  ${band.event_subtitle}
drawings:
  persist: false
transition: fade
css: unocss
colorSchema: dark
themeConfig:
  primary: "#e8c49a"
---

<div class="slide-cover">
  <h1 class="text-7xl title-cn mb-6">${band.event_title}</h1>
  <p class="text-3xl subtitle">${band.event_subtitle}</p>
</div>
`

  const songRefs = songs
    .map(s => `---\nsrc: ./pages/${s.slug}.md\n---`)
    .join('\n\n')

  const members = band.members
    .map(m => `    <div><span class="font-bold" style="color: #fff;">${m.name}</span> <span class="text-amber-200">${m.role}</span></div>`)
    .join('\n')

  const credits = `---
layout: center
---

<div class="text-center rounded-xl px-12 py-10">
  <h1 class="text-5xl title-cn mb-8" style="text-shadow: 0 0 20px rgba(232, 196, 154, 0.5);">${band.event_title} 乐队</h1>

  <div class="grid grid-cols-2 gap-x-16 gap-y-4 max-w-2xl mx-auto text-xl text-white" style="text-shadow: 0 2px 8px rgba(0,0,0,0.9), 0 0 20px rgba(0,0,0,0.5);">
${members}
  </div>

  <div class="divider mt-10 mb-8"></div>
  <p class="text-3xl title-cn" style="text-shadow: 0 0 15px rgba(232, 196, 154, 0.4);">谢谢大家</p>
</div>
`
  return [fm, songRefs, credits].join('\n\n')
}

/* ---------------------------------- 主流程 ---------------------------------- */

const band = parseBandYaml(readFileSync(BAND_FILE, 'utf8'))
const files = readdirSync(SONGS_DIR).filter(f => f.endsWith('.txt')).sort()
if (files.length === 0) {
  console.error('songs/ 目录下没有歌曲源文件（*.txt）')
  process.exit(1)
}

mkdirSync(PAGES_DIR, { recursive: true })
const songs = files.map(parseSong)
const expected = new Set()
for (const song of songs) {
  writeFileSync(join(PAGES_DIR, `${song.slug}.md`), renderSong(song))
  expected.add(`${song.slug}.md`)
}

// 清理 pages/ 下不再生成的旧文件
for (const f of readdirSync(PAGES_DIR)) {
  if (f.endsWith('.md') && !expected.has(f)) {
    rmSync(join(PAGES_DIR, f))
    console.log(`removed stale pages/${f}`)
  }
}

writeFileSync(join(ROOT, 'slides.md'), renderSlides(band, songs))

console.log(`generated ${songs.length} song pages + slides.md`)
for (const s of songs) {
  console.log(`  ${s.slug}: ${s.blocks.length} lyric slides`)
}
