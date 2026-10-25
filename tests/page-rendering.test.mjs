import assert from 'node:assert/strict'
import test from 'node:test'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import { Writable } from 'node:stream'
import * as React from 'react'
import * as jsxRuntime from 'react/jsx-runtime'
import { renderToPipeableStream } from 'react-dom/server'
import { transform } from 'lightningcss'
import ts from 'typescript'
import { themeBootstrap } from '../src/theme.ts'
import { siteUrl } from '../src/site.ts'

async function createRenderer() {
  const context = vm.createContext({ console, URL })
  const modules = new Map()
  async function moduleAt(path) {
    if (modules.has(path)) return modules.get(path)
    if (path === 'react' || path === 'react/jsx-runtime') {
      const exports = path === 'react' ? React : jsxRuntime
      const module = new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value) }, { context })
      modules.set(path, module)
      return module
    }
    let file = path
    let source
    for (const candidate of [path, `${path}.ts`, `${path}.tsx`]) {
      try { source = await readFile(candidate, 'utf8'); file = candidate; break } catch { continue }
    }
    assert.ok(source, `Cannot load ${path}`)
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = new vm.SourceTextModule(compiled, {
      context, identifier: file,
      initializeImportMeta(meta) { meta.env = { VITE_SITE_URL: 'https://playcove.test' } },
      async importModuleDynamically(specifier) {
        const child = await moduleAt(resolve(dirname(file), specifier))
        if (child.status === 'linked') await child.evaluate()
        return child
      },
    })
    modules.set(path, module)
    await module.link((specifier) => moduleAt(specifier.startsWith('.') ? resolve(dirname(file), specifier) : specifier))
    return module
  }
  return async (path, name, props) => {
    const module = await moduleAt(resolve(path))
    if (module.status === 'linked') await module.evaluate()
    return new Promise((resolveHtml, reject) => {
      let html = ''
      const output = new Writable({ write(chunk, encoding, done) { html += chunk; done() } })
      output.on('finish', () => resolveHtml(html))
      const stream = renderToPipeableStream(React.createElement(module.namespace[name], props), { onAllReady() { stream.pipe(output) }, onError: reject })
    })
  }
}

test('Landing SSR contains playable content, one main heading, useful links, and matching game schema in both languages', async () => {
  const render = await createRenderer()
  for (const locale of ['en', 'pl']) {
    const html = await render('src/pages/HomePage.tsx', 'HomePage', { locale })
    assert.equal((html.match(/<h1[ >]/g) ?? []).length, 1)
    assert.ok(html.includes(locale === 'pl' ? 'Darmowe gry w przeglądarce' : 'Free browser games'))
    assert.ok(html.includes('home-feature-stage') && html.includes('<canvas'))
    assert.ok(html.includes('game-start-button'))
    const json = html.match(/<script type="application\/ld\+json">(.*?)<\/script>/s)?.[1]
    assert.ok(json)
    const schema = JSON.parse(json)
    const entries = schema.mainEntity.itemListElement
    assert.equal(entries.length, (html.match(/data-game=/g) ?? []).length)
    assert.equal(schema.url, `https://playcove.test/${locale}`)
    for (const entry of entries) {
      assert.ok(html.includes(entry.item.name))
      assert.ok(entry.item.url.startsWith(`https://playcove.test/${locale}/games/`))
    }
    for (const genre of ['arcade', 'sports', 'two-player']) assert.ok(html.includes(`href="/${locale}/genres/${genre}"`))
    assert.ok(html.includes('home-faq'))
    assert.equal(html.includes('home-hero'), false)
  }
})

test('Two-player discovery includes football and paddle games, with their own crawlable pages', async () => {
  const render = await createRenderer()
  const html = await render('src/pages/GenrePage.tsx', 'GenrePage', { locale: 'en', slug: 'two-player' })
  assert.ok(html.includes('href="/en/games/paddle-duel"'))
  assert.ok(html.includes('href="/en/games/soccer-duel"'))
  assert.equal((html.match(/data-game=/g) ?? []).length, 9)
  for (const game of ['blast-arena', 'bubble-tower', 'volley-clash', 'tank-tactics', 'ricochet-rivals', 'circuit-clash', 'twin-tethers']) assert.ok(html.includes(`/en/games/${game}`))
})

test('Actual React server rendering keeps all games browser-API-free until hydration', async () => {
  const render = await createRenderer()
  for (const game of ['brick-breaker', 'neon-snake', 'rooftop-runner', 'star-patrol', 'paddle-duel', 'soccer-duel', 'asteroid-drift', 'maze-chase', 'block-cascade', 'river-crossing', 'blast-arena', 'bubble-tower', 'barrel-ascent', 'formation-rescue', 'coastal-rush', 'iron-front', 'volley-clash', 'tank-tactics', 'ricochet-rivals', 'circuit-clash', 'twin-tethers']) {
    const html = await render(`src/games/${game}/Game.tsx`, 'Game', { locale: 'pl' })
    assert.ok(html.includes('<canvas') && html.includes('game-start-screen'))
    assert.ok(html.includes('game-records-panel'))
  }
})

test('Saved themes apply before paint while invalid or inaccessible storage leaves system preferences intact', () => {
  for (const preference of ['light', 'dark', null, 'broken']) {
    const root = { dataset: {}, style: {} }
    vm.runInNewContext(themeBootstrap, { localStorage: { getItem: () => preference }, document: { documentElement: root } })
    if (preference === 'light' || preference === 'dark') {
      assert.equal(root.dataset.theme, preference)
      assert.equal(root.style.colorScheme, preference)
    } else assert.equal(root.dataset.theme, undefined)
  }
  assert.doesNotThrow(() => vm.runInNewContext(themeBootstrap, { localStorage: { getItem() { throw Error('Storage disabled') } } }))
})

test('SEO URLs honor a configured origin and safely support static hosting without one', () => {
  assert.equal(siteUrl('/pl/games/soccer-duel', 'https://playcove.test'), 'https://playcove.test/pl/games/soccer-duel')
  assert.equal(siteUrl('/en', ''), '/en')
  assert.equal(siteUrl('/en', 'not a URL'), '/en')
  assert.equal(siteUrl('/en', 'javascript:alert(1)'), '/en')
})

test('Portal and game styles compile with the CSS engine used by the production tooling', async () => {
  for (const filename of ['src/styles.css', 'src/design-system.css', 'src/game-styles.css']) {
    const code = await readFile(filename)
    const result = transform({ filename, code, minify: true, errorRecovery: false })
    assert.ok(result.code.length > 0)
    assert.deepEqual(result.warnings, [])
  }
})
