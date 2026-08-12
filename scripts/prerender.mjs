// Post-build prerender: renders every route to static HTML in dist/ with
// per-page meta tags, and generates dist/sitemap.xml. Run after `vite build`.
import { createServer } from 'vite'
import { readFileSync, writeFileSync, mkdirSync } from 'node:fs'
import { dirname, join, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

const root = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const dist = join(root, 'dist')

// --- minimal browser shims so page components render in node ---------------
globalThis.window ??= { innerWidth: 1280, innerHeight: 800 }
globalThis.localStorage ??= {
  getItem: () => null,
  setItem: () => {},
  removeItem: () => {},
}

const vite = await createServer({
  root,
  logLevel: 'error',
  server: { middlewareMode: true },
  appType: 'custom',
})

try {
  const { render } = await vite.ssrLoadModule('/src/entry-server.tsx')
  const { ORIGIN, PAGE_META, articleMeta } = await vite.ssrLoadModule('/src/lib/seo.ts')
  const { articles } = await vite.ssrLoadModule('/src/data/articles/index.ts')

  const routes = [
    ...Object.entries(PAGE_META).map(([path, meta]) => ({ path, ...meta })),
    ...articles.map((a) => ({ path: `/practice/${a.id}`, ...articleMeta(a), article: a })),
  ]

  const template = readFileSync(join(dist, 'index.html'), 'utf8')
  const esc = (s) => s.replace(/&/g, '&amp;').replace(/"/g, '&quot;').replace(/</g, '&lt;')

  for (const route of routes) {
    const url = ORIGIN + (route.path === '/' ? '/' : route.path)
    let html = template
      .replace(/<title>[^<]*<\/title>/, `<title>${esc(route.title)}</title>`)
      .replace(/(<meta name="description" content=")[^"]*(")/, `$1${esc(route.desc)}$2`)
      .replace(/(<link rel="canonical" href=")[^"]*(")/, `$1${url}$2`)
      .replace(/(<meta property="og:title" content=")[^"]*(")/, `$1${esc(route.title)}$2`)
      .replace(/(<meta property="og:description" content=")[^"]*(")/, `$1${esc(route.desc)}$2`)
      .replace(/(<meta property="og:url" content=")[^"]*(")/, `$1${url}$2`)

    if (route.noindex) {
      html = html.replace('</head>', '  <meta name="robots" content="noindex" />\n  </head>')
    }

    if (route.article) {
      const a = route.article
      const ld = {
        '@context': 'https://schema.org',
        '@type': 'LearningResource',
        name: a.title,
        alternateName: [a.title_zh, a.title_en].filter(Boolean),
        url,
        inLanguage: 'ja',
        educationalLevel: a.kind === 'story' ? undefined : `JLPT ${a.level}`,
        learningResourceType: 'typing practice',
        isPartOf: { '@type': 'WebSite', name: 'NihongoType', url: ORIGIN },
      }
      html = html.replace(
        '</head>',
        `  <script type="application/ld+json">${JSON.stringify(ld)}</script>\n  </head>`,
      )
    }

    const app = await render(route.path)
    html = html.replace('<div id="root"></div>', `<div id="root">${app}</div>`)

    const outFile =
      route.path === '/' ? join(dist, 'index.html') : join(dist, route.path, 'index.html')
    mkdirSync(dirname(outFile), { recursive: true })
    writeFileSync(outFile, html)
  }

  // --- sitemap --------------------------------------------------------------
  const urls = routes
    .filter((r) => !r.noindex)
    .map((r) => {
      const loc = ORIGIN + (r.path === '/' ? '/' : r.path)
      const priority = r.path === '/' ? '1.0' : r.article ? '0.6' : '0.8'
      return `  <url><loc>${loc}</loc><priority>${priority}</priority></url>`
    })
  writeFileSync(
    join(dist, 'sitemap.xml'),
    `<?xml version="1.0" encoding="UTF-8"?>\n<urlset xmlns="http://www.sitemaps.org/schemas/sitemap/0.9">\n${urls.join('\n')}\n</urlset>\n`,
  )

  console.log(`prerendered ${routes.length} routes + sitemap.xml`)
} finally {
  await vite.close()
}
