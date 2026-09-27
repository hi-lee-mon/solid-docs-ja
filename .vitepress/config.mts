import { defineConfig } from 'vitepress'
// @ts-ignore
import container from 'markdown-it-container'
import { execSync } from 'node:child_process'
import fs from 'node:fs'
import path from 'node:path'
import { fileURLToPath } from 'node:url'

const VP = path.dirname(fileURLToPath(import.meta.url))
const REPO = path.dirname(VP)

const git = (args: string, fallback = ''): string => {
  try {
    return execSync(`git ${args}`, { cwd: REPO }).toString().trim()
  } catch {
    return fallback
  }
}
process.env.VITE_BUILD_SHA = (
  process.env.GITHUB_SHA || git('rev-parse HEAD', 'dev')
).slice(0, 7)
process.env.VITE_BUILD_DATE = git('log -1 --format=%cs', 'unknown')
const ORDER: Record<string, number> = JSON.parse(
  fs.readFileSync(path.join(VP, 'order.json'), 'utf8')
)
const BLOG_META: Record<string, { title: string; date: string; author: string }> =
  JSON.parse(fs.readFileSync(path.join(VP, 'blog-meta.json'), 'utf8'))

const SECTION_TITLES: Record<string, string> = {
  'getting-started': 'はじめに',
  concepts: '概念',
  'building-apps': 'アプリの構築',
  routing: 'ルーティング',
  guides: 'ガイド',
  migration: '移行',
  reference: 'リファレンス',
}

function frontmatter(file: string): Record<string, string> {
  try {
    const head = fs.readFileSync(file, 'utf8').slice(0, 4000)
    const m = head.match(/^---\r?\n([\s\S]*?)\r?\n---/)
    const out: Record<string, string> = {}
    if (m) {
      for (const line of m[1].split('\n')) {
        const kv = line.match(/^(\w[\w-]*)\s*:\s*(.*)$/)
        if (kv) out[kv[1]] = kv[2].replace(/^["']|["']$/g, '').trim()
      }
    }
    return out
  } catch {
    return {}
  }
}

const SKIP_DIRS = new Set(['images', 'assets', 'node_modules', '.vitepress', '.github'])

function docsItems(dirAbs: string): any[] {
  const items: any[] = []
  const entries = fs
    .readdirSync(dirAbs, { withFileTypes: true })
    .filter(
      (e) => (e.isDirectory() && !SKIP_DIRS.has(e.name)) || e.name.endsWith('.md')
    )
  const key = (e: fs.Dirent) => {
    const rel = path.relative(REPO, path.join(dirAbs, e.name)).replace(/\\/g, '/')
    const noext = e.isDirectory() ? rel : rel.replace(/\.md$/, '')
    return ORDER[noext] ?? 999
  }
  entries.sort((a, b) => key(a) - key(b) || a.name.localeCompare(b.name))
  for (const e of entries) {
    const abs = path.join(dirAbs, e.name)
    const rel = path.relative(REPO, abs).replace(/\\/g, '/')
    if (e.isDirectory()) {
      const idx = path.join(abs, 'index.md')
      const hasIdx = fs.existsSync(idx)
      const fm = hasIdx ? frontmatter(idx) : {}
      const text = fm.title || SECTION_TITLES[e.name] || e.name
      items.push({
        text,
        link: hasIdx ? `/${rel}/` : undefined,
        items: docsItems(abs),
        collapsed: true,
      })
    } else {
      if (e.name === 'index.md') continue
      const fm = frontmatter(abs)
      items.push({
        text: fm.title || e.name.replace(/\.md$/, ''),
        link: '/' + rel.replace(/\.md$/, ''),
      })
    }
  }
  return items
}

function docsSidebar(): any[] {
  const base = path.join(REPO, 'docs')
  const items: any[] = [{ text: '概要', link: '/docs/' }]
  const entries = fs
    .readdirSync(base, { withFileTypes: true })
    .filter((e) => (e.isDirectory() && !SKIP_DIRS.has(e.name)) || e.name.endsWith('.md'))
  entries.sort((a, b) => (ORDER[`docs/${a.name.replace(/\.md$/, '')}`] ?? 999) - (ORDER[`docs/${b.name.replace(/\.md$/, '')}`] ?? 999) || a.name.localeCompare(b.name))
  for (const e of entries) {
    const abs = path.join(base, e.name)
    if (e.isDirectory()) {
      const idx = path.join(abs, 'index.md')
      const hasIdx = fs.existsSync(idx)
      const fm = hasIdx ? frontmatter(idx) : {}
      items.push({
        text: fm.title || SECTION_TITLES[e.name] || e.name,
        link: hasIdx ? `/docs/${e.name}/` : undefined,
        items: docsItems(abs),
        collapsed: true,
      })
    } else if (e.name !== 'index.md') {
      const fm = frontmatter(abs)
      items.push({
        text: fm.title || e.name.replace(/\.md$/, ''),
        link: '/docs/' + e.name.replace(/\.md$/, ''),
      })
    }
  }
  return items
}

function blogSidebar(): any[] {
  const dir = path.join(REPO, 'blog')
  const files = fs.readdirSync(dir).filter((f) => f.endsWith('.md') && f !== 'index.md')
  const items = files
    .map((f) => {
      const slug = f.replace(/\.md$/, '')
      const meta = BLOG_META[slug] || { title: slug, date: '', author: '' }
      return { text: meta.title, link: `/blog/${slug}`, _date: meta.date }
    })
    .sort((a, b) => (b._date || '').localeCompare(a._date || ''))
    .map(({ _date, ...rest }) => rest)
  return [{ text: 'ブログ', link: '/blog/', items, collapsed: false }]
}

function tutorialSidebar(): any[] {
  const tj: { lessonName: string; internalName: string }[] = JSON.parse(
    fs.readFileSync(path.join(REPO, 'tutorial', 'directory.json'), 'utf8')
  )
  const groups: Record<string, { text: string; link: string }[]> = {}
  for (const e of tj) {
    const [g, sub] = e.lessonName.split('/')
    const label = sub || g
    ;(groups[g] ||= []).push({
      text: label,
      link: `/tutorial/${e.internalName}/lesson`,
    })
  }
  return [
    { text: 'チュートリアル', link: '/tutorial/', items: [] },
    ...Object.entries(groups).map(([g, items]) => ({
      text: g,
      items,
      collapsed: true,
    })),
  ]
}

function legacySidebar(): any[] {
  const gj: { resource: string; title: string }[] = JSON.parse(
    fs.readFileSync(path.join(REPO, 'legacy', 'guides', 'directory.json'), 'utf8')
  )
  return [
    {
      text: '旧版ドキュメント',
      link: '/legacy/',
      items: [
        {
          text: 'ガイド',
          collapsed: true,
          items: gj.map((e) => ({
            text: e.title,
            link: `/legacy/guides/${e.resource}`,
          })),
        },
        { text: 'API リファレンス', link: '/legacy/api' },
      ],
    },
  ]
}

// :::name[Title] -> ::: <mapped-name> **Title**  (colon count preserved for nesting)
const CONTAINER_MAP: Record<string, string> = {
  note: 'jnote',
  'deep-dive': 'jdeep',
  solution: 'jsol',
  tab: 'jtab',
  'tab-group': 'jtabg',
  advanced: 'jadv',
  caution: 'jcaution',
  pitfall: 'jpit',
  tip: 'tip',
  info: 'info',
  warning: 'warning',
  danger: 'danger',
}
const CONTAINER_RE = /^(\s*)(:{3,4})(note|deep-dive|solution|tab|tab-group|advanced|caution|pitfall|tip|info|warning|danger)\[([^\]]*)\]/gm

export default defineConfig({
  title: 'Solid 2.0 非公式日本語ドキュメント',
  description:
    'v2.solidjs.com・公式ブログ・チュートリアルの非公式日本語翻訳',
  lang: 'ja',
  srcDir: '.',
  base: process.env.VP_BASE || '/',
  ignoreDeadLinks: true,
  cleanUrls: true,
  srcExclude: ['**/node_modules/**', '.github/**', '.vitepress/**', 'TRANSLATING.md'],
  markdown: {
    config(md) {
      const reg = (
        name: string,
        cls: string,
        opts: { details?: boolean; defaultTitle?: string } = {}
      ) => {
        md.use(container, name, {
          render(tokens: any[], idx: number) {
            const t = tokens[idx]
            if (t.nesting !== 1) return opts.details ? '</details>' : '</div>'
            const info = String(t.info || '')
              .replace(new RegExp(`^\\s*${name}\\s*`), '')
              .trim()
            const title = md.renderInline(info)
            if (opts.details)
              return `<details class="custom-block ${cls}"><summary>${title || opts.defaultTitle || ''}</summary>`
            return `<div class="custom-block ${cls}">${title ? `<p class="custom-block-title">${title}</p>` : ''}`
          },
        })
      }
      reg('jnote', 'note')
      reg('jsol', 'solution', { defaultTitle: '解答例' })
      reg('jdeep', 'deep-dive', { details: true, defaultTitle: '深掘り' })
      reg('jtab', 'dtab')
      reg('jtabg', 'dtab-group')
      reg('jadv', 'advanced')
      reg('jcaution', 'caution')
      reg('jpit', 'pitfall')
    },
  },
  vite: {
    plugins: [
      {
        name: 'mdx-syntax-fix',
        enforce: 'pre',
        transform(code, id) {
          if (!id.endsWith('.md')) return
          let out = code.replace(
            CONTAINER_RE,
            (_m, ind, colons, name, title) =>
              `${ind}${colons} ${CONTAINER_MAP[name] || name} **${title}**`
          )
          // MDX comments -> drop
          out = out.replace(/\{\/\*[\s\S]*?\*\/\}/g, '')
          // break Vue interpolation inside inline code: `{{` -> `{\u200b{`
          out = out.replace(/`[^`\n]*`/g, (s) =>
            s.replace(/\{\{/g, '{\u200b{').replace(/\}\}/g, '}\u200b}')
          )
          return out
        },
      },
    ],
  },
  themeConfig: {
    nav: [
      { text: 'ドキュメント', link: '/docs/' },
      { text: 'ブログ', link: '/blog/' },
      { text: 'チュートリアル', link: '/tutorial/' },
      { text: '旧版', link: '/legacy/' },
      { text: '用語集', link: '/docs/glossary' },
    ],
    sidebar: {
      '/docs/': docsSidebar(),
      '/blog/': blogSidebar(),
      '/tutorial/': tutorialSidebar(),
      '/legacy/': legacySidebar(),
    },
    search: { provider: 'local' },
    outline: { level: [2, 3], label: 'このページの内容' },
    docFooter: { prev: '前のページ', next: '次のページ' },
    editLink: {
      pattern: 'https://github.com/hi-lee-mon/solid-docs-ja/edit/main/:path',
      text: 'このページを編集',
    },
    lastUpdated: { text: '最終更新', formatOptions: { dateStyle: 'short' } },
    footer: {
      message:
        '非公式翻訳です。正確な情報は <a href="https://v2.solidjs.com/">v2.solidjs.com</a> を参照してください。',
    },
    socialLinks: [
      { icon: 'github', link: 'https://github.com/hi-lee-mon/solid-docs-ja' },
    ],
  },
})
