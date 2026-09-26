#!/usr/bin/env node
/**
 * lyric-slides 歌词抓取 + 切片脚本
 *
 * 从 LRCLIB 免费歌词库抓取歌词（免 key），或导入本地 .lrc/.txt 文件，
 * 自动剥掉时间戳，并把整首歌词「切片」成每页 1–2 行的幻灯片分组，
 * 直接产出可用的 songs/NN-<slug>.txt 源文件。
 *
 * 用法：
 *   node scripts/fetch-lyrics.mjs "鲜花" --artist "回春丹" --style romantic --lines 2
 *   node scripts/fetch-lyrics.mjs --from ./my-lyrics.lrc --title "鲜花" --style romantic
 *
 * 注意：抓到的歌词请务必人工校对、按演出需要删减；
 *       歌词版权归原著作权人所有，请确保你的使用方式合法合规。
 */

import { readFileSync, readdirSync, writeFileSync } from 'node:fs'
import { join } from 'node:path'

const ROOT = new URL('..', import.meta.url).pathname
const SONGS_DIR = join(ROOT, 'songs')

/* --------------------------------- 参数解析 --------------------------------- */

function parseArgs(argv) {
  const args = { title: '', artist: '', style: 'romantic', lines: 2, from: '', slug: '' }
  const positional = []
  for (let i = 0; i < argv.length; i++) {
    const a = argv[i]
    if (a.startsWith('--')) {
      const key = a.slice(2)
      args[key] = argv[++i] ?? ''
    } else {
      positional.push(a)
    }
  }
  if (positional[0]) args.title = positional[0]
  args.lines = Math.max(1, parseInt(args.lines, 10) || 2)
  return args
}

/* --------------------------------- 歌词清洗 --------------------------------- */

// 剥掉 LRC 时间戳（[mm:ss.xx] 与逐字 <mm:ss.xxx>）与元信息标签（[ti:...] 等），
// 过滤空行与词曲署名行
function cleanLyrics(text) {
  return text
    .split('\n')
    .map(l => l
      .replace(/(\[\d{1,2}:\d{1,2}[.:]\d{1,3}\])+/g, '')
      .replace(/(<\d{1,2}:\d{1,2}[.:]\d{1,3}>)+/g, '')
      .trim())
    .filter(l => l
      && !/^\[[^\d][^\]]*\]$/.test(l)
      && !/^(作词|作曲|编曲|制作人|演唱|监制|混音|母带|和声|吉他|贝斯|鼓|键盘|词|曲)\s*[:：]/.test(l))
}

/* --------------------------------- 网络抓取 --------------------------------- */

async function fetchFromLrclib(title, artist) {
  const url = new URL('https://lrclib.net/api/get')
  url.searchParams.set('track_name', title)
  if (artist) url.searchParams.set('artist_name', artist)
  const res = await fetch(url, {
    headers: { 'User-Agent': 'lyric-slides (https://github.com)' },
  })
  if (!res.ok) return null
  const data = await res.json()
  // 优先同步歌词（时间戳会被剥掉），退化为纯文本歌词
  return data.syncedLyrics || data.plainLyrics || null
}

/* --------------------------------- 主流程 --------------------------------- */

const args = parseArgs(process.argv.slice(2))

if (!args.from && !args.title) {
  console.error('用法: node scripts/fetch-lyrics.mjs "歌名" [--artist 歌手] [--style rock|romantic|ethereal|inspiring] [--lines 2]')
  console.error('      node scripts/fetch-lyrics.mjs --from 歌词文件.lrc --title "歌名" [其他选项同上]')
  process.exit(1)
}

let raw
if (args.from) {
  raw = readFileSync(args.from, 'utf8')
  if (!args.title) {
    console.error('使用 --from 时必须用 --title 指定歌名')
    process.exit(1)
  }
} else {
  console.log(`正在从 LRCLIB 抓取「${args.title}」${args.artist ? `（${args.artist}）` : ''} …`)
  raw = await fetchFromLrclib(args.title, args.artist)
  if (!raw) {
    console.error('未找到歌词。可以试试：')
    console.error('  1. 加上 --artist "歌手名" 提高命中率')
    console.error('  2. 自己下载 .lrc 文件后用 --from 导入')
    process.exit(1)
  }
}

const lines = cleanLyrics(raw)
if (lines.length === 0) {
  console.error('歌词清洗后为空（可能是纯音乐或文件格式不对）')
  process.exit(1)
}

// 切片：每 N 行一组 = 一页幻灯片（默认 2 行 = 对角排版）
const blocks = []
for (let i = 0; i < lines.length; i += args.lines) {
  blocks.push(lines.slice(i, i + args.lines).join('\n'))
}

// 文件名：序号自动续；slug 用 --slug 或标题的 ASCII 化，中文标题退化为 song-NN
const existing = readdirSync(SONGS_DIR).filter(f => /^\d+-.+\.txt$/.test(f))
const nextNum = existing.reduce((m, f) => Math.max(m, parseInt(f, 10)), 0) + 1
const num = String(nextNum).padStart(2, '0')
let slug = (args.slug || args.title).toLowerCase()
  .replace(/[^a-z0-9]+/g, '-').replace(/^-+|-+$/g, '')
if (!slug) slug = `song-${num}`

const head = [
  '---',
  `title: ${args.title}`,
  args.artist ? `artist: ${args.artist}` : null,
  `style: ${args.style}`,
  'background:  # 把背景图放进 public/ 后在此填写文件名，例如 bg_xxx.png',
  '---',
].filter(Boolean).join('\n')

const outFile = join(SONGS_DIR, `${num}-${slug}.txt`)
writeFileSync(outFile, head + '\n\n' + blocks.join('\n---\n') + '\n')

console.log(`✓ ${lines.length} 行歌词切成 ${blocks.length} 页 → songs/${num}-${slug}.txt`)
console.log('接下来：')
console.log('  1. 打开该文件校对歌词、按演出需要删减/调整分页（用 --- 分页）')
console.log('  2. 把背景图放进 public/ 并填写 background 字段')
console.log('  3. 运行 npm run dev（或 bun run dev）预览')
