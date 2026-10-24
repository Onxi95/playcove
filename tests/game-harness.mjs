import assert from 'node:assert/strict'
import { readFile } from 'node:fs/promises'
import { resolve, dirname } from 'node:path'
import vm from 'node:vm'
import ts from 'typescript'

export async function loadGame(game, locale = 'en', stored = {}) {
  let cursor = 0
  let dirty = false
  let tree
  let clock = 1000
  let nextFrame = 0
  let seed = 12345
  let drawCalls = 0
  const slots = []
  const effects = []
  const frames = new Map()
  const storage = new Map(Object.entries(stored))
  const listeners = new Map()
  class Element { closest() { return null } }
  const body = new Element()
  function emit(target, name, event = {}) {
    const input = { target: body, preventDefault() { this.defaultPrevented = true }, ...event }
    for (const callback of [...(listeners.get(`${target}:${name}`) ?? [])]) callback(input)
    flush()
    return input
  }
  function events(target) {
    return {
      addEventListener(name, callback) {
        const key = `${target}:${name}`
        if (!listeners.has(key)) listeners.set(key, new Set())
        listeners.get(key).add(callback)
      },
      removeEventListener(name, callback) { listeners.get(`${target}:${name}`)?.delete(callback) },
    }
  }
  const context2d = new Proxy({}, {
    get(target, key) {
      if (key in target) return target[key]
      if (String(key).startsWith('create')) return () => ({ addColorStop() {} })
      if (key === 'measureText') return (text) => ({ width: String(text).length * 7 })
      return (...args) => {
        drawCalls += 1
        for (const value of args) if (typeof value === 'number') assert.ok(Number.isFinite(value), `${game}: ${String(key)} received ${value}`)
      }
    },
    set(target, key, value) { target[key] = value; return true },
  })
  const canvas = { getContext: () => context2d, getBoundingClientRect: () => ({ left: 0, top: 0, width: 800, height: 440 }), setPointerCapture() {} }
  const react = {
    useState(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { kind: 'state', value: typeof initial === 'function' ? initial() : initial }
      return [slots[index].value, (update) => {
        const value = typeof update === 'function' ? update(slots[index].value) : update
        if (!Object.is(value, slots[index].value)) { slots[index].value = value; dirty = true }
      }]
    },
    useRef(initial) {
      const index = cursor++
      if (!slots[index]) slots[index] = { kind: 'ref', value: { current: initial } }
      return slots[index].value
    },
    useEffect(callback, dependencies) {
      const index = cursor++
      const previous = slots[index]
      if (!previous || dependencies === undefined || dependencies.some((value, i) => !Object.is(value, previous.dependencies?.[i]))) {
        effects.push(() => {
          previous?.cleanup?.()
          slots[index] = { kind: 'effect', dependencies, cleanup: callback() }
        })
      }
    },
  }
  const jsx = (type, props) => ({ type, props: props ?? {} })
  const random = Object.create(Math)
  random.random = () => { seed = (seed * 1664525 + 1013904223) >>> 0; return seed / 4294967296 }
  const document = { hidden: false, ...events('document') }
  const window = { ...events('window'), cancelAnimationFrame: (id) => frames.delete(id) }
  const context = vm.createContext({
    console, Math: random, HTMLElement: Element, window, document,
    performance: { now: () => clock },
    requestAnimationFrame(callback) { const id = ++nextFrame; frames.set(id, callback); return id },
    localStorage: { getItem: (key) => storage.get(key) ?? null, setItem: (key, value) => storage.set(key, value) },
  })
  const modules = new Map()
  async function moduleAt(path) {
    if (modules.has(path)) return modules.get(path)
    if (path === 'react' || path === 'react/jsx-runtime') {
      const exports = path === 'react' ? react : { jsx, jsxs: jsx, Fragment: 'fragment' }
      const module = new vm.SyntheticModule(Object.keys(exports), function () { for (const [key, value] of Object.entries(exports)) this.setExport(key, value) }, { context })
      modules.set(path, module)
      return module
    }
    const source = await readFile(path, 'utf8')
    const compiled = ts.transpileModule(source, { compilerOptions: { module: ts.ModuleKind.ESNext, target: ts.ScriptTarget.ES2022, jsx: ts.JsxEmit.ReactJSX } }).outputText
    const module = new vm.SourceTextModule(compiled, { context, identifier: path })
    modules.set(path, module)
    await module.link((specifier) => moduleAt(specifier.startsWith('.') ? resolve(dirname(path), specifier) : specifier))
    return module
  }
  const module = await moduleAt(resolve(`src/games/${game}/Game.tsx`))
  await module.evaluate()
  function walk(node, visit, expand = false) {
    if (!node || typeof node !== 'object') return
    if (Array.isArray(node)) { for (const child of node) walk(child, visit, expand); return }
    visit(node)
    if (expand && typeof node.type === 'function') walk(node.type(node.props), visit, expand)
    else walk(node.props?.children, visit, expand)
  }
  function flush() {
    let renders = 0
    while (dirty) {
      assert.ok(++renders < 25, `${game}: render loop`)
      cursor = 0
      dirty = false
      tree = module.namespace.Game({ locale })
      walk(tree, (node) => { if (node.type === 'canvas') node.props.ref.current = canvas })
      for (const effect of effects.splice(0)) effect()
    }
  }
  dirty = true
  flush()
  function find(predicate, expand = false) {
    let result
    walk(tree, (node) => { if (predicate(node)) result ??= node }, expand)
    return result
  }
  function overlay() { return find((node) => node.type?.name === 'GameOverlay').props }
  return {
    get status() { return overlay().status },
    get drawCalls() { return drawCalls },
    storage, overlay, find,
    scene() {
      return slots.find((slot) => slot.kind === 'ref' && slot.value.current && ['snake', 'ballX', 'players', 'obstacles', 'enemies'].some((key) => key in slot.value.current))?.value.current
    },
    act(callback) { callback(); flush() },
    start() { overlay().onAction(); flush() },
    emit,
    key(key, pressed = true, extra = {}) {
      const code = key === ' ' ? 'Space' : key === 'Enter' ? 'Enter' : key
      return emit('window', pressed ? 'keydown' : 'keyup', { key, code, repeat: false, ...extra })
    },
    advance(seconds, fps = 60, beforeFrame) {
      for (let index = 0; index < Math.ceil(seconds * fps); index += 1) {
        if (beforeFrame) { beforeFrame(this, index); flush() }
        clock += 1000 / fps
        const callbacks = [...frames.values()]
        frames.clear()
        for (const callback of callbacks) callback(clock)
        flush()
      }
    },
    destroy() { for (const slot of slots) if (slot.kind === 'effect') slot.cleanup?.(); frames.clear() },
  }
}
