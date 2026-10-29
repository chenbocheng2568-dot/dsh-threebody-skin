window.__ModuleLoader__.load({
	id: "dsh-threebody-skin",
	factory: (require) => {
		var module = { exports: {} };
		var exports = module.exports;

		/**
		 * dsh-threebody-skin — browser half.
		 *
		 * Modelled on dsh-550c-skin (MIT, Ziyang Song): the same three mechanisms,
		 * learned there the hard way, carry this skin too —
		 *
		 *   ladder     the whole `--dsw-*` colour ladder is written as ONE stylesheet
		 *              rule, `html[data-tbskin]:root body{…}`. Not inline properties on
		 *              <body>: DSH's ThemePresenter owns those and retracts whatever it
		 *              recorded on every theme change. The extra `:root` outranks
		 *              550C's `html[data-550c] body` should both ever be on.
		 *   dark mode  DSH declares a couple of hundred tokens only under
		 *              `body[data-ds-dark-theme]`; the marker is an attribute, which no
		 *              stylesheet can set, so a MutationObserver holds it down while the
		 *              skin is on and hands it back to the theme service afterwards.
		 *   no layout  colour, not geometry: no padding, size or display of any app
		 *              element is touched.
		 *
		 * What is this skin's own is the 远景虚影: the closing landscape of the 三体
		 * launch film (rendered by the same Remotion code, graded up), laid over the
		 * whole interface as a fixed, click-through layer in `screen` blend. On a
		 * dark UI that only ever lightens — the false dawn on the horizon, the sky
		 * gradient, the stars — while the mountain ridge stays a dark silhouette, so
		 * the range reads as a ghost behind the conversation and text stays legible.
		 * dsh-threebody-boot ends its film on the very same frame and fades into it.
		 *
		 * The ghost is three layers inside one screen-blended group: the sky (graded
		 * still), the stars (a canvas, so the sky can turn slowly about its pole the
		 * way it does when you lie on the ground and look up), and the ridge and
		 * ground (a graded still with alpha) in front of them, so stars that turn
		 * below the ridge disappear behind the mountains. At angle 0 the canvas puts
		 * the film's own 160 stars exactly where the boot's last frame left them, and
		 * the turning only starts once the boot overlay is gone.
		 *
		 * Two more touches make the shell read as the game's screen: a faint inner
		 * glow in the four corners with the film's HUD corner brackets, and the
		 * 三体舰队 — a 水滴 probe leading a small formation with live exhaust plumes
		 * and long dust trails — riding the top edge of the composer.
		 */

		const React = require('react')

		const ON_KEY = 'dsh-threebody-skin:on'
		const GHOST_KEY = 'dsh-threebody-skin:ghost'
		const GHOST_VALUES = ['off', 'faint', 'mid', 'strong']
		const DEFAULT_GHOST = 'mid'
		/** Opacity of the ghost layer per setting. */
		const GHOST_LEVEL = { off: 0, faint: 0.3, mid: 0.48, strong: 0.7 }
		/** lib/index.js VERSION_GLOBAL / MEDIA_PREFIX — keep in sync. */
		const VERSION_GLOBAL = '__dshThreebodySkinVersion'
		const MEDIA_ROUTE = '/dsh-threebody-skin/media/'
		const SKY_FILE = 'threebody-sky.jpg'
		const GROUND_FILE = 'threebody-ground.webp'
		/** 星空转动：静止 / 缓慢（4 小时一圈）/ 稍快（40 分钟一圈）。 */
		const SPIN_KEY = 'dsh-threebody-skin:spin'
		const SPIN_VALUES = ['still', 'slow', 'fast']
		const DEFAULT_SPIN = 'slow'
		const SPIN_RATE = { still: 0, slow: (2 * Math.PI) / (4 * 3600), fast: (2 * Math.PI) / (40 * 60) }
		/** 四角光晕与 HUD 角标；输入框上缘的三体舰队。 */
		const FRAME_KEY = 'dsh-threebody-skin:frame'
		const FLEET_KEY = 'dsh-threebody-skin:fleet'
		const FRAME_CLASS = 'dshtbs-frame'
		const FLEET_CLASS = 'dshtbs-fleet'
		/** dsh-threebody-boot's overlay; while it is up the sky does not turn yet. */
		const BOOT_SELECTOR = 'body>.dshtb-host'
		/** dsh-550c-boot's splash, when it is the one playing. */
		const SPLASH_550C = 'body>.dsh550c-host'
		/** dsh-threebody-boot reads this attribute to choose its slow fade into the ghost. */
		const ATTR = 'data-tbskin'
		const DARK_ATTRIBUTE = 'data-ds-dark-theme'
		const LADDER_STYLE_ID = 'dsh-threebody-skin-ladder'
		const SKIN_STYLE_ID = 'dsh-threebody-skin-style'
		const ROW_STYLE_ID = 'dsh-threebody-skin-row-style'
		const GHOST_CLASS = 'dshtbs-ghost'
		const STATE_GLOBAL = '__dshThreebodySkinState'

		/* ── palette ─────────────────────────────────────────────────────────── */

		/**
		 * The film's own palette (three-body-login/src/theme.ts): near-black blue,
		 * steel grey, ice white, one cold cyan accent. `secondary` and `textDim` sit
		 * one step brighter than the film's decorative inks so captions keep >4.5:1.
		 */
		const SCHEME = {
		  accent: '#86d6ff',
		  accentBright: '#dcf1fc',
		  accentDim: '#2c6f94',
		  bg: '#05070b',
		  bgPanel: '#080b11',
		  bgWin: '#0c1118',
		  sidebar: '#06090e',
		  text: '#d2e3ef',
		  secondary: '#9bb7c9',
		  textDim: '#6c8798',
		  textFaint: '#2f4252',
		  red: '#ff6f7d',
		  redBright: '#ffa1aa',
		  green: '#7fe0c0',
		  cyan: '#86d6ff',
		}

		function channels(hex) {
		  let body = hex.replace('#', '')
		  if (body.length === 3) body = body[0] + body[0] + body[1] + body[1] + body[2] + body[2]
		  return [parseInt(body.slice(0, 2), 16), parseInt(body.slice(2, 4), 16), parseInt(body.slice(4, 6), 16)]
		}

		function alpha(hex, amount) {
		  return 'rgba(' + channels(hex).join(',') + ',' + String(amount) + ')'
		}

		function mix(a, b, amount) {
		  const left = channels(a)
		  const right = channels(b)
		  return '#' + left.map((value, index) => Math.round(value + (right[index] - value) * amount).toString(16).padStart(2, '0')).join('')
		}

		/** The `--dsw-*` ladder; token set and geometry follow dsh-550c-skin's tokensFor. */
		function tokensFor(s) {
		  const black = '#000000'
		  const surface = mix(s.bgWin, s.accent, 0.06)
		  const chrome = mix(s.bgPanel, s.accent, 0.08)
		  return {
		    '--dsw-alias-bg-base': s.bg,
		    '--dsw-alias-bg-layer-1': s.bgPanel,
		    '--dsw-alias-bg-layer-2': s.bgWin,
		    '--dsw-alias-bg-layer-3': surface,
		    '--dsw-alias-bg-overlay': chrome,
		    '--dsw-alias-bg-module-platform': surface,
		    '--dsw-alias-bg-multi-select': mix(s.bgPanel, s.accent, 0.05),
		    '--dsw-alias-bg-skeleton': alpha(s.accent, 0.08),
		    '--dsw-alias-bg-mask-1': alpha(black, 0.62),
		    '--dsw-alias-bg-mask-2': alpha(black, 0.3),
		    '--dsw-alias-bg-mask-3': alpha(black, 0.52),
		    '--dsw-alias-bg-mask-drop': alpha(mix(s.bg, black, 0.4), 0.72),
		    '--dsw-alias-bg-mask-photo': alpha(black, 0.88),
		    '--dsw-specific-sidebar-fill': s.sidebar,
		    '--dsw-specific-bubble': mix(s.bgWin, s.accent, 0.05),
		    '--dsw-specific-bubble-highlight': chrome,
		    '--dsw-specific-input-major': s.bgWin,
		    '--dsw-specific-login-input': s.sidebar,
		    '--dsw-specific-menu': chrome,
		    '--dsw-menu-surface-fill': alpha(chrome, 0.97),
		    '--dsw-alias-menu-group-header-fill': alpha(chrome, 0.97),
		    '--dsw-specific-selector': chrome,
		    '--dsw-specific-tip': chrome,
		    '--dsw-specific-sidebar-nav-item-hover': alpha(s.accent, 0.08),
		    '--dsw-specific-sidebar-nav-item-active': alpha(s.accent, 0.15),
		    '--dsw-specific-sidebar-nav-item-active-accent': chrome,
		    '--dsw-alias-toast-bg': chrome,
		    '--dsw-alias-tooltip-bg': chrome,
		    '--dsw-alias-markdown-code-block': mix(s.bg, black, 0.35),
		    '--dsw-alias-markdown-code-block-banner': chrome,
		    '--dsw-alias-markdown-code-segment-selected': surface,
		    '--dsw-alias-markdown-code-segment-unselected': mix(s.bg, black, 0.35),
		    '--dsw-alias-markdown-inline-code': chrome,
		    '--dsw-alias-markdown-placeholder': mix(s.bgPanel, s.accent, 0.05),
		    '--dsw-alias-markdown-tag': s.bgWin,
		    '--dsw-alias-markdown-citation': surface,

		    '--dsw-alias-label-primary': s.text,
		    '--dsw-alias-label-primary-bluish': s.text,
		    '--dsw-alias-label-primary-dimmed': s.secondary,
		    '--dsw-alias-label-secondary': s.secondary,
		    '--dsw-alias-label-tertiary': s.textDim,
		    '--dsw-alias-label-caption': mix(s.textDim, s.textFaint, 0.3),
		    '--dsw-alias-label-dimmed': s.textFaint,
		    '--dsw-alias-label-primary-foreground': s.bg,
		    '--dsw-alias-label-primary-inverted': chrome,
		    '--dsw-alias-brand-text': s.text,
		    '--dsw-alias-link': s.accent,

		    '--dsw-alias-brand-primary': s.accent,
		    '--dsw-alias-brand-primary-invert': s.text,
		    '--dsw-alias-brand-primary-new-colorprimary-new-color': s.accent,
		    '--dsw-alias-interactive-bg-hover': alpha(s.accent, 0.09),
		    '--dsw-alias-interactive-bg-active': alpha(s.accent, 0.16),
		    '--dsw-alias-interactive-bg-hover-solid': surface,
		    '--dsw-alias-interactive-bg-hover-accent': alpha(s.accent, 0.24),
		    '--dsw-alias-interactive-bg-hover-danger': alpha(s.red, 0.16),

		    '--dsw-alias-button-primary-fill': s.accent,
		    '--dsw-alias-button-primary-hover': s.accentBright,
		    '--dsw-alias-button-primary-dimmed': s.accentDim,
		    '--dsw-alias-button-contrast-fill': s.text,
		    '--dsw-alias-button-elevated-fill': chrome,
		    '--dsw-alias-button-floating-fill': surface,
		    '--dsw-alias-button-floating-hover': chrome,
		    '--dsw-alias-button-ghost-active-border': alpha(s.accent, 0.5),
		    '--dsw-alias-button-ghost-active-fill': alpha(s.accent, 0.14),
		    '--dsw-alias-button-ghost-active-hover': alpha(s.accent, 0.24),
		    '--dsw-alias-button-info-fill': s.accent,
		    '--dsw-alias-button-info-hover': s.accentBright,
		    '--dsw-alias-button-tool-bar-fill': alpha(s.accent, 0.12),
		    '--dsw-alias-button-tool-bar-fill-invisible': alpha(s.accent, 0.05),
		    '--dsw-alias-button-tool-bar-hover': alpha(s.accent, 0.22),

		    // The running line shimmers in the app's own way, in the film's cyan.
		    '--dsw-alias-label-deep-diving': s.accent,
		    '--dsw-alias-label-deep-diving-shimmer': s.accentBright,
		    '--dsw-alias-label-shimmer': alpha(s.accentBright, 0.5),
		    '--dsw-linear-gradient-think': 'linear-gradient(180deg, ' + s.bg + ' 20.19%, ' + alpha(s.bg, 0) + ' 100%)',
		    '--dsw-linear-think-select':
		      'linear-gradient(180deg, ' + mix(s.bg, s.accent, 0.06) + ' 20.19%, ' + alpha(mix(s.bg, s.accent, 0.06), 0) + ' 100%)',

		    // Rules stay close to invisible: separation comes from the surface ladder.
		    '--dsw-alias-border-l1': alpha(s.accent, 0.05),
		    '--dsw-alias-border-l2': alpha(s.accent, 0.09),
		    '--dsw-alias-border-l2-darkmode-thin': alpha(s.accent, 0.04),
		    '--dsw-alias-border-l3': alpha(s.accent, 0.13),
		    '--dsw-alias-border-l4': alpha(s.accent, 0.18),
		    '--dsw-alias-border-inverted': alpha(s.accent, 0.05),
		    '--dsw-alias-border-inverted2': alpha(s.accent, 0.08),

		    '--dsw-alias-scrollbar-bg-l1': alpha(s.accent, 0.2),
		    '--dsw-alias-scrollbar-bg-l2': alpha(s.accent, 0.3),
		    '--dsw-alias-scrollbar-hover-l1': alpha(s.accent, 0.4),
		    '--dsw-alias-scrollbar-hover-l2': alpha(s.accent, 0.52),

		    '--dsw-alias-state-error-primary': s.red,
		    '--dsw-alias-state-error-secondary': s.redBright,
		    '--dsw-alias-state-success-primary': s.green,
		    '--dsw-alias-state-success-secondary': mix(s.green, s.text, 0.35),
		    '--dsw-alias-state-success-tertiary': mix(s.bg, s.green, 0.14),
		    '--dsw-alias-state-warn-primary': '#e8c27a',
		    '--dsw-alias-state-warn-secondary': '#f5dcae',
		    '--dsw-alias-state-warn-tertiary': mix(s.bg, '#e8c27a', 0.14),
		    '--dsw-alias-state-warn-label': '#f5dcae',
		    '--dsw-alias-state-business-primary': s.accent,
		    '--dsw-alias-state-business-tertiary': mix(s.bg, s.accent, 0.16),
		    '--dsw-alias-state-idle-primary': s.textDim,

		    '--shiki-background': mix(s.bg, black, 0.35),
		    '--shiki-foreground': s.text,
		    '--shiki-token-comment': s.textDim,
		    '--shiki-token-constant': s.accentBright,
		    '--shiki-token-function': s.cyan,
		    '--shiki-token-keyword': '#a9b8ff',
		    '--shiki-token-link': s.accent,
		    '--shiki-token-parameter': mix(s.accent, s.red, 0.35),
		    '--shiki-token-punctuation': mix(s.textDim, s.text, 0.3),
		    '--shiki-token-string': s.green,
		    '--shiki-token-string-expression': mix(s.green, s.text, 0.3),

		    '--dsw-static-neutral-bluish-400': s.textDim,
		    '--dsw-static-neutral-bluish-500': mix(s.textDim, s.textFaint, 0.4),
		    '--dsw-static-neutral-bluish-600': mix(s.textDim, s.textFaint, 0.6),
		    '--dsw-static-neutral-bluish-700': s.textFaint,
		    '--dsw-static-neutral-bluish-800': surface,
		    '--dsw-static-neutral-bluish-850': s.bgWin,
		    '--dsw-static-neutral-bluish-875': mix(s.bgWin, s.accent, 0.06),
		    '--dsw-static-neutral-bluish-900': s.sidebar,
		    '--dsw-static-neutral-bluish-950': s.bg,
		    '--dsw-static-neutral-bluish-1000': black,
		    '--dsw-static-deepseek-300': mix(s.accent, s.text, 0.45),
		    '--dsw-static-deepseek-400': s.accentBright,
		    '--dsw-static-deepseek-450': s.accent,
		    '--dsw-static-deepseek-500': s.accent,
		    '--dsw-static-deepseek-600': s.accentDim,
		    '--dsw-static-deepseek-700-delete': mix(s.accentDim, s.bg, 0.35),
		  }
		}

		/* ── preferences ─────────────────────────────────────────────────────── */

		function readOn() {
		  try {
		    return window.localStorage.getItem(ON_KEY) !== '0'
		  } catch (error) {
		    return true
		  }
		}

		function readGhost() {
		  try {
		    const raw = window.localStorage.getItem(GHOST_KEY)
		    return GHOST_VALUES.indexOf(raw) >= 0 ? raw : DEFAULT_GHOST
		  } catch (error) {
		    return DEFAULT_GHOST
		  }
		}

		function readToggle(key) {
		  try {
		    return window.localStorage.getItem(key) !== '0'
		  } catch (error) {
		    return true
		  }
		}

		function readSpin() {
		  try {
		    const raw = window.localStorage.getItem(SPIN_KEY)
		    return SPIN_VALUES.indexOf(raw) >= 0 ? raw : DEFAULT_SPIN
		  } catch (error) {
		    return DEFAULT_SPIN
		  }
		}

		function write(key, value) {
		  try {
		    window.localStorage.setItem(key, value)
		  } catch (error) {
		    /* private mode: the choice simply does not persist */
		  }
		}

		function installedVersion() {
		  const value = window[VERSION_GLOBAL]
		  return typeof value === 'string' && value !== '' ? value : null
		}

		function mediaUrl(file) {
		  const version = installedVersion()
		  return MEDIA_ROUTE + file + (version === null ? '' : '?v=' + encodeURIComponent(version))
		}

		/* ── 转动的星空 ─────────────────────────────────────────────────────── */

		/**
		 * Remotion's random() (mulberry32 over a 32-bit string hash), ported verbatim
		 * so the film's own 160 stars come back at exactly the positions the boot's
		 * last frame shows (three-body-login/src/scenes/World.tsx).
		 */
		function mulberry32(a) {
		  let t = a + 0x6d2b79f5
		  t = Math.imul(t ^ (t >>> 15), t | 1)
		  t ^= t + Math.imul(t ^ (t >>> 7), t | 61)
		  return ((t ^ (t >>> 14)) >>> 0) / 4294967296
		}

		function seeded(seed) {
		  let hash = 0
		  for (let i = 0; i < seed.length; i++) {
		    hash = (hash << 5) - hash + seed.charCodeAt(i)
		    hash |= 0
		  }
		  return mulberry32(hash)
		}

		/** World.tsx geometry at the frame the skin's stills were taken from. */
		const SCENE_W = 1920
		const SCENE_H = 1080
		const HORIZON = 742
		/** The closing push-in (1.045 about (960, HORIZON)) and the dawn's dimming of the stars. */
		const PUSH = 1.045
		const DAWN_DIM = 1 - 0.55 * 0.4
		const START_FRAME = 299
		/** The celestial pole, in scene coordinates: upper sky, right of centre. */
		const POLE_X = 1180
		const POLE_Y = 120
		/** Every point this far from the pole can turn into view (farthest scene corner + margin). */
		const SKY_RADIUS = 1750
		/** The stills were graded ×3.2 with gamma 0.85; stars are drawn to match. */
		const GRADE = 3.2

		const pushX = (x) => 960 + (x - 960) * PUSH
		const pushY = (y) => HORIZON + (y - HORIZON) * PUSH

		let starCache = null

		function buildStars() {
		  if (starCache !== null) return starCache
		  const stars = []
		  for (let i = 0; i < 160; i++) {
		    stars.push({
		      x: pushX(seeded('ws-x-' + i) * SCENE_W),
		      y: pushY(seeded('ws-y-' + i) * (HORIZON - 120)),
		      r: (0.4 + seeded('ws-r-' + i) * 0.9) * PUSH,
		      a: 0.1 + Math.pow(seeded('ws-a-' + i), 2) * 0.6,
		      ph: i,
		    })
		  }
		  // Stars outside the closing frame, seen only once the sky turns them into
		  // view: same size and brightness distribution, same density, filling the
		  // disc around the pole. Inside the frame's sky only the film's own stars
		  // exist, so angle 0 is exactly the boot's last frame.
		  let seed = 20261029
		  const rnd = () => {
		    seed = (Math.imul(seed, 1664525) + 1013904223) | 0
		    return (seed >>> 0) / 4294967296
		  }
		  const left = pushX(0)
		  const right = pushX(SCENE_W)
		  const top = pushY(0)
		  const density = 160 / (SCENE_W * (HORIZON - 120))
		  const count = Math.round(Math.PI * SKY_RADIUS * SKY_RADIUS * density)
		  for (let k = 0; k < count; k++) {
		    const angle = rnd() * Math.PI * 2
		    const radius = SKY_RADIUS * Math.sqrt(rnd())
		    const x = POLE_X + radius * Math.cos(angle)
		    const y = POLE_Y + radius * Math.sin(angle)
		    const r = (0.4 + rnd() * 0.9) * PUSH
		    const a = 0.1 + Math.pow(rnd(), 2) * 0.6
		    const ph = rnd() * 1000
		    if (x > left && x < right && y > top && y < HORIZON) continue
		    stars.push({ x: x, y: y, r: r, a: a, ph: ph })
		  }
		  starCache = stars
		  return stars
		}

		/**
		 * Draw the stars (and the flying star) on the ghost's canvas, turned about the
		 * pole. Laid out exactly like the stills (`background-size: cover`, centred).
		 * The angle accumulates only while the boot overlay is gone, the speed can
		 * change at any time without a jump, and nothing is drawn while hidden.
		 *
		 * @returns a disposer
		 */
		function mountStars(canvas) {
		  const stars = buildStars()
		  const ctx = canvas.getContext('2d')
		  let raf = 0
		  let last = 0
		  let angle = 0
		  let twinkle = 0
		  let width = 0
		  let height = 0

		  const resize = () => {
		    const dpr = window.devicePixelRatio || 1
		    width = window.innerWidth
		    height = window.innerHeight
		    canvas.width = Math.round(width * dpr)
		    canvas.height = Math.round(height * dpr)
		  }

		  const draw = () => {
		    if (ctx === null) return
		    const dpr = window.devicePixelRatio || 1
		    const s = Math.max(width / SCENE_W, height / SCENE_H)
		    const ox = (width - SCENE_W * s) / 2
		    const oy = (height - SCENE_H * s) / 2
		    ctx.setTransform(1, 0, 0, 1, 0, 0)
		    ctx.clearRect(0, 0, canvas.width, canvas.height)
		    ctx.setTransform(dpr * s, 0, 0, dpr * s, dpr * ox, dpr * oy)
		    ctx.translate(POLE_X, POLE_Y)
		    // Counter-clockwise on screen, as the northern sky turns.
		    ctx.rotate(-angle)
		    ctx.translate(-POLE_X, -POLE_Y)
		    const frame = START_FRAME + twinkle
		    ctx.fillStyle = 'rgb(236,246,255)'
		    for (const star of stars) {
		      const a = star.a * DAWN_DIM * (0.8 + 0.2 * Math.sin(frame / 9 + star.ph))
		      ctx.globalAlpha = Math.pow(Math.min(1, a * GRADE), 0.85)
		      ctx.beginPath()
		      ctx.arc(star.x, star.y, star.r, 0, Math.PI * 2)
		      ctx.fill()
		    }
		    // The flying star: World.tsx's 60 px disc whose CSS gradient runs to the
		    // farthest corner (about 42 px), clipped to its 30 px radius.
		    const fx = pushX(1294)
		    const fy = pushY(444)
		    const R = 42.4 * PUSH
		    const o = 0.8 + 0.2 * Math.sin(frame / 4)
		    const g = ctx.createRadialGradient(fx, fy, 0, fx, fy, R)
		    g.addColorStop(0, 'rgba(255,255,255,' + o + ')')
		    g.addColorStop(0.07, 'rgba(225,242,255,' + Math.min(1, 0.5 * GRADE) * o + ')')
		    g.addColorStop(0.3, 'rgba(190,225,255,' + 0.08 * GRADE * o + ')')
		    g.addColorStop(0.6, 'rgba(160,210,255,0)')
		    ctx.globalAlpha = 1
		    ctx.fillStyle = g
		    ctx.beginPath()
		    ctx.arc(fx, fy, 30 * PUSH, 0, Math.PI * 2)
		    ctx.fill()
		  }

		  const onResize = () => {
		    resize()
		    draw()
		  }
		  resize()
		  window.addEventListener('resize', onResize)

		  const tick = (now) => {
		    raf = window.requestAnimationFrame(tick)
		    if (document.hidden) {
		      last = now
		      return
		    }
		    // About 15 fps is plenty: at the slow setting a star moves well under a pixel a frame.
		    if (now - last < 66) return
		    const dt = Math.min(0.25, (now - last) / 1000)
		    last = now
		    twinkle += dt * 30
		    if (document.querySelector(BOOT_SELECTOR) === null) angle += SPIN_RATE[readSpin()] * dt
		    draw()
		  }
		  draw()
		  raf = window.requestAnimationFrame((now) => {
		    last = now
		    tick(now)
		  })

		  return () => {
		    window.cancelAnimationFrame(raf)
		    window.removeEventListener('resize', onResize)
		  }
		}

		/* ── 四角光晕与 HUD 角标 ─────────────────────────────────────────────── */

		/**
		 * A faint cold glow sunk into the four corners (screen blend, so it only ever
		 * lightens) plus the film's HUD corner brackets (HudFrame.tsx), thin and dim.
		 */
		const FRAME_CSS =
		  'body>.' + FRAME_CLASS + '{position:fixed;inset:0;pointer-events:none;z-index:2147480001}\n' +
		  'body>.' + FRAME_CLASS + '>.glow{position:absolute;inset:0;mix-blend-mode:screen;background:' +
		  'radial-gradient(ellipse 30% 34% at 0% 0%,rgba(134,214,255,.085),rgba(134,214,255,.03) 45%,rgba(134,214,255,0) 75%),' +
		  'radial-gradient(ellipse 30% 34% at 100% 0%,rgba(134,214,255,.07),rgba(134,214,255,.025) 45%,rgba(134,214,255,0) 75%),' +
		  'radial-gradient(ellipse 30% 34% at 0% 100%,rgba(134,214,255,.07),rgba(134,214,255,.025) 45%,rgba(134,214,255,0) 75%),' +
		  'radial-gradient(ellipse 30% 34% at 100% 100%,rgba(134,214,255,.085),rgba(134,214,255,.03) 45%,rgba(134,214,255,0) 75%);' +
		  'box-shadow:inset 0 0 60px rgba(134,214,255,.035)}\n' +
		  'body>.' + FRAME_CLASS + '>i{position:absolute;width:22px;height:22px;border:0 solid rgba(142,174,193,.34)}\n' +
		  'body>.' + FRAME_CLASS + '>.tl{top:7px;left:7px;border-top-width:1px;border-left-width:1px}\n' +
		  'body>.' + FRAME_CLASS + '>.tr{top:7px;right:7px;border-top-width:1px;border-right-width:1px}\n' +
		  'body>.' + FRAME_CLASS + '>.bl{bottom:7px;left:7px;border-bottom-width:1px;border-left-width:1px}\n' +
		  'body>.' + FRAME_CLASS + '>.br{bottom:7px;right:7px;border-bottom-width:1px;border-right-width:1px}\n'

		function mountFrame() {
		  const node = document.createElement('div')
		  node.className = FRAME_CLASS
		  node.setAttribute('aria-hidden', 'true')
		  node.innerHTML = '<div class="glow"></div><i class="tl"></i><i class="tr"></i><i class="bl"></i><i class="br"></i>'
		  document.body.appendChild(node)
		  return () => node.remove()
		}

		/* ── 三体舰队 ────────────────────────────────────────────────────────── */

		/**
		 * The fleet: a 水滴 probe out in front, then a staggered formation of seven
		 * ships heading left, each with a flickering plasma plume and a long faint
		 * trail through the dust behind it — the image of the Trisolaran fleet's
		 * wakes. Ships further back are smaller and dimmer. It rides the top edge of
		 * the composer, drifts a few pixels over half a minute, never takes a click,
		 * and hides while a dialog is open or the boot overlay is up.
		 */
		const FLEET_W = 320
		const FLEET_H = 46

		const FLEET_CSS =
		  'body>.' + FLEET_CLASS + '{position:fixed;left:0;top:0;width:' + FLEET_W + 'px;height:' + FLEET_H + 'px;pointer-events:none;z-index:2147480002;opacity:0;transition:opacity .9s ease}\n' +
		  'body>.' + FLEET_CLASS + '.on{opacity:.92}\n' +
		  'body>.' + FLEET_CLASS + ' svg{display:block;overflow:visible}\n' +
		  'body>.' + FLEET_CLASS + ' .drift{animation:dshtbs-drift 28s ease-in-out infinite}\n' +
		  'body>.' + FLEET_CLASS + ' .bob{animation:dshtbs-bob 7s ease-in-out infinite}\n' +
		  'body>.' + FLEET_CLASS + ' .flame{transform-box:fill-box;transform-origin:0% 50%;animation:dshtbs-flicker .16s ease-in-out infinite alternate}\n' +
		  'body>.' + FLEET_CLASS + ' .core{animation:dshtbs-core .23s ease-in-out infinite alternate}\n' +
		  'body>.' + FLEET_CLASS + ' .halo{transform-box:fill-box;transform-origin:50% 50%;animation:dshtbs-halo 4.2s ease-in-out infinite}\n' +
		  '@keyframes dshtbs-drift{0%,100%{transform:translate(0px,0px)}50%{transform:translate(-14px,-1.5px)}}\n' +
		  '@keyframes dshtbs-bob{0%,100%{transform:translate(0px,0px)}50%{transform:translate(0px,.8px)}}\n' +
		  '@keyframes dshtbs-flicker{from{transform:scaleX(1);opacity:.95}to{transform:scaleX(.8);opacity:.72}}\n' +
		  '@keyframes dshtbs-core{from{opacity:1}to{opacity:.7}}\n' +
		  '@keyframes dshtbs-halo{0%,100%{opacity:.35;transform:scale(1)}50%{opacity:.7;transform:scale(1.25)}}\n' +
		  '@media (prefers-reduced-motion: reduce){body>.' + FLEET_CLASS + ' *{animation:none !important}}\n'

		/** [x, y, scale] of each ship's nose, front to back. */
		const SHIPS = [
		  [70, 17, 1],
		  [72, 32, 0.95],
		  [104, 10, 0.82],
		  [106, 24, 0.88],
		  [104, 38, 0.8],
		  [138, 16, 0.7],
		  [140, 31, 0.7],
		]

		function fleetSvg() {
		  const defs =
		    '<defs>' +
		    '<linearGradient id="dshtbs-hull" x1="0" y1="0" x2="0" y2="1"><stop offset="0" stop-color="#4b6274"/><stop offset=".45" stop-color="#1c2833"/><stop offset="1" stop-color="#0b1118"/></linearGradient>' +
		    '<linearGradient id="dshtbs-plume" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#ffffff"/><stop offset=".12" stop-color="#cdeeff" stop-opacity=".95"/><stop offset=".45" stop-color="#86d6ff" stop-opacity=".55"/><stop offset="1" stop-color="#2c6f94" stop-opacity="0"/></linearGradient>' +
		    '<linearGradient id="dshtbs-trail" x1="0" y1="0" x2="1" y2="0"><stop offset="0" stop-color="#86d6ff" stop-opacity=".34"/><stop offset=".6" stop-color="#86d6ff" stop-opacity=".1"/><stop offset="1" stop-color="#86d6ff" stop-opacity="0"/></linearGradient>' +
		    '<radialGradient id="dshtbs-drop" cx=".32" cy=".3" r=".8"><stop offset="0" stop-color="#ffffff"/><stop offset=".18" stop-color="#e6f2fb"/><stop offset=".55" stop-color="#7f97a8"/><stop offset="1" stop-color="#26323d"/></radialGradient>' +
		    '<radialGradient id="dshtbs-glow"><stop offset="0" stop-color="#86d6ff" stop-opacity=".55"/><stop offset="1" stop-color="#86d6ff" stop-opacity="0"/></radialGradient>' +
		    '</defs>'
		  let trails = ''
		  let ships = ''
		  SHIPS.forEach(([x, y, k], i) => {
		    const stern = x + 24 * k
		    const plume = (34 + (i % 3) * 6) * k
		    const dur = (0.13 + (i % 4) * 0.025).toFixed(3)
		    const delay = (-(i * 0.071)).toFixed(3)
		    const dim = (1 - (1 - k) * 1.2).toFixed(2)
		    trails += '<line x1="' + (stern + plume * 0.6) + '" y1="' + (y + 0.1) + '" x2="' + FLEET_W + '" y2="' + (y + 0.1) + '" stroke="url(#dshtbs-trail)" stroke-width="' + (0.85 * k).toFixed(2) + '" opacity="' + dim + '"/>'
		    ships +=
		      '<g class="bob" style="animation-delay:' + (-i * 0.9).toFixed(1) + 's" opacity="' + dim + '">' +
		      '<g transform="translate(' + stern + ' ' + y + ') scale(' + k + ')">' +
		      '<path class="flame" style="animation-duration:' + dur + 's;animation-delay:' + delay + 's" d="M0,-1.3 C9,-1.1 22,-0.6 ' + plume / k + ',0 C22,0.6 9,1.1 0,1.3 Z" fill="url(#dshtbs-plume)"/>' +
		      '<ellipse class="core" style="animation-delay:' + delay + 's" cx="0.6" cy="0" rx="2.2" ry="1.5" fill="#ffffff"/>' +
		      '</g>' +
		      '<g transform="translate(' + x + ' ' + (y - 2.5 * k) + ') scale(' + k + ')">' +
		      '<path d="M0,2.5 L6,0.7 L19,0 L24,0.8 L24,4.2 L19,5 L6,4.3 Z" fill="url(#dshtbs-hull)"/>' +
		      '<path d="M6,0.7 L19,0 L24,0.8" fill="none" stroke="rgba(190,225,245,.6)" stroke-width=".45"/>' +
		      '<path d="M13,0.3 L17,-1.6 L19,0" fill="#1c2833" stroke="rgba(190,225,245,.35)" stroke-width=".3"/>' +
		      '</g>' +
		      '</g>'
		  })
		  // 水滴: a perfect mirror teardrop, nose forward, a cold halo breathing round it.
		  const drop =
		    '<g class="bob" style="animation-delay:-2.3s">' +
		    '<ellipse class="halo" cx="27" cy="24" rx="15" ry="8" fill="url(#dshtbs-glow)"/>' +
		    '<path transform="translate(18 21)" d="M0,3 C0,1 2.2,0 4.8,0 C8.6,0 13.5,1.7 17,3 C13.5,4.3 8.6,6 4.8,6 C2.2,6 0,5 0,3 Z" fill="url(#dshtbs-drop)"/>' +
		    '<ellipse cx="22.4" cy="22.4" rx="1.6" ry=".6" fill="#ffffff" opacity=".9"/>' +
		    '</g>'
		  return '<svg width="' + FLEET_W + '" height="' + FLEET_H + '" viewBox="0 0 ' + FLEET_W + ' ' + FLEET_H + '">' + defs + '<g class="drift">' + trails + ships + drop + '</g></svg>'
		}

		/** The composer card: the bottom-most visible text box, widened to its rounded frame. */
		function findComposer() {
		  const boxes = Array.from(document.querySelectorAll('textarea, [contenteditable="true"], [role="textbox"]')).filter((el) => {
		    if (el.closest('[role="dialog"]') !== null) return false
		    const r = el.getBoundingClientRect()
		    return r.width > 160 && r.height > 8 && r.bottom > window.innerHeight * 0.45 && r.top < window.innerHeight
		  })
		  if (boxes.length === 0) return null
		  boxes.sort((a, b) => b.getBoundingClientRect().bottom - a.getBoundingClientRect().bottom)
		  const editor = boxes[0]
		  const width = editor.getBoundingClientRect().width
		  let el = editor
		  for (let i = 0; i < 8 && el.parentElement !== null && el.parentElement !== document.body; i++) {
		    el = el.parentElement
		    const cs = getComputedStyle(el)
		    const r = el.getBoundingClientRect()
		    const framed = cs.backgroundColor !== 'rgba(0, 0, 0, 0)' || parseFloat(cs.borderTopWidth) > 0
		    if (parseFloat(cs.borderTopLeftRadius) >= 10 && r.width >= width && framed) return el
		  }
		  return editor
		}

		function mountFleet() {
		  const node = document.createElement('div')
		  node.className = FLEET_CLASS
		  node.setAttribute('aria-hidden', 'true')
		  node.innerHTML = fleetSvg()
		  document.body.appendChild(node)

		  const place = () => {
		    const blocked = document.querySelector(BOOT_SELECTOR) !== null || document.querySelector(SPLASH_550C) !== null || document.querySelector('[role="dialog"]') !== null
		    const composer = blocked ? null : findComposer()
		    const r = composer === null ? null : composer.getBoundingClientRect()
		    if (r === null || r.width < FLEET_W + 60 || r.top < 120) {
		      node.classList.remove('on')
		      return
		    }
		    // Right part of the card, formation just above its top edge.
		    const left = Math.round(r.right - FLEET_W - Math.min(48, r.width * 0.06))
		    const top = Math.round(r.top - FLEET_H + 3)
		    node.style.transform = 'translate(' + left + 'px,' + top + 'px)'
		    node.classList.add('on')
		  }
		  place()
		  const timer = window.setInterval(place, 400)
		  window.addEventListener('resize', place)
		  return () => {
		    window.clearInterval(timer)
		    window.removeEventListener('resize', place)
		    node.remove()
		  }
		}

		/* ── the style layer ─────────────────────────────────────────────────── */

		/**
		 * The ghost layer and a few finishing touches, all scoped to html[data-tbskin].
		 *
		 * The ghost is a body-level element rather than a pseudo-element so it cannot
		 * collide with anyone else's ::before/::after. z-index sits above the app and
		 * its menus (they are part of the scene too) and below dsh-threebody-boot's
		 * overlay (2147483500), whose last frame is this same picture.
		 */
		function skinCss() {
		  return (
		    'html[' + ATTR + '] body>.' + GHOST_CLASS + '{position:fixed;inset:0;z-index:2147480000;pointer-events:none;' +
		    'mix-blend-mode:screen;isolation:isolate;' +
		    'opacity:var(--dshtbs-ghost,' + String(GHOST_LEVEL[DEFAULT_GHOST]) + ');transition:opacity 1.2s ease}\n' +
		    // The three layers composite normally inside the group; the group as a
		    // whole is what screens onto the app.
		    'body>.' + GHOST_CLASS + '>.sky,body>.' + GHOST_CLASS + '>.ground{position:absolute;inset:0;background-position:center;background-size:cover;background-repeat:no-repeat}\n' +
		    'body>.' + GHOST_CLASS + '>.sky{background-image:url("' + mediaUrl(SKY_FILE) + '")}\n' +
		    'body>.' + GHOST_CLASS + '>.ground{background-image:url("' + mediaUrl(GROUND_FILE) + '")}\n' +
		    'body>.' + GHOST_CLASS + '>canvas{position:absolute;inset:0;width:100%;height:100%}\n' +
		    FRAME_CSS +
		    FLEET_CSS +
		    'html[' + ATTR + '="off"] body>.' + GHOST_CLASS + '{opacity:0}\n' +
		    'html[' + ATTR + '="faint"]{--dshtbs-ghost:' + String(GHOST_LEVEL.faint) + '}\n' +
		    'html[' + ATTR + '="mid"]{--dshtbs-ghost:' + String(GHOST_LEVEL.mid) + '}\n' +
		    'html[' + ATTR + '="strong"]{--dshtbs-ghost:' + String(GHOST_LEVEL.strong) + '}\n' +
		    // macOS: DSH's base sheet turns every direct body child into a no-drag
		    // region; opting out keeps the title strip draggable (as 550C does).
		    'html[data-platform="darwin"][' + ATTR + '] body>.' + GHOST_CLASS + ',html[data-platform="darwin"][' + ATTR + '] body>.' + FRAME_CLASS + ',html[data-platform="darwin"][' + ATTR + '] body>.' + FLEET_CLASS + '{-webkit-app-region:initial !important}\n' +
		    'html[' + ATTR + '] ::selection{background:' + alpha(SCHEME.accent, 0.28) + ';color:' + SCHEME.accentBright + '}\n' +
		    'html[' + ATTR + '] body{background-color:' + SCHEME.bg + '}\n'
		  )
		}

		function ensureStyle(id, text) {
		  let style = document.getElementById(id)
		  if (style === null) {
		    style = document.createElement('style')
		    style.id = id
		    document.head.appendChild(style)
		  }
		  if (style.textContent !== text) style.textContent = text
		}

		function removeStyle(id) {
		  const style = document.getElementById(id)
		  if (style !== null) style.remove()
		}

		function ladderCss() {
		  const declarations = Object.entries(tokensFor(SCHEME))
		    .map(([name, value]) => name + ':' + value)
		    .join(';')
		  return 'html[' + ATTR + ']:root body{' + declarations + '}'
		}

		/* ── dark mode hold (after dsh-550c-skin's holdDarkMode) ─────────────── */

		let darkGuard = null
		let themeService = null

		function setDarkMode(dark) {
		  document.documentElement.style.colorScheme = dark ? 'dark' : 'light'
		  if (document.body === null) return
		  if (dark) document.body.setAttribute(DARK_ATTRIBUTE, '')
		  else document.body.removeAttribute(DARK_ATTRIBUTE)
		}

		function holdDarkMode() {
		  setDarkMode(true)
		  if (darkGuard !== null) return
		  const assert = () => {
		    if (!live) return
		    if (document.body !== null && !document.body.hasAttribute(DARK_ATTRIBUTE)) document.body.setAttribute(DARK_ATTRIBUTE, '')
		    if (document.documentElement.style.colorScheme !== 'dark') document.documentElement.style.colorScheme = 'dark'
		  }
		  darkGuard = new MutationObserver(assert)
		  darkGuard.observe(document.documentElement, { attributes: true, attributeFilter: ['style'] })
		  if (document.body !== null) darkGuard.observe(document.body, { attributes: true, attributeFilter: [DARK_ATTRIBUTE] })
		}

		function releaseDarkMode() {
		  if (darkGuard === null) return
		  darkGuard.disconnect()
		  darkGuard = null
		}

		/* ── activation ──────────────────────────────────────────────────────── */

		let live = false
		let ghostNode = null
		let stopStars = null
		let stopFrame = null
		let stopFleet = null

		/** Mount or remove the optional touches to match the stored switches. */
		function syncExtras() {
		  if (!live) return
		  if (readToggle(FRAME_KEY)) {
		    if (stopFrame === null) stopFrame = mountFrame()
		  } else if (stopFrame !== null) {
		    stopFrame()
		    stopFrame = null
		  }
		  if (readToggle(FLEET_KEY)) {
		    if (stopFleet === null) stopFleet = mountFleet()
		  } else if (stopFleet !== null) {
		    stopFleet()
		    stopFleet = null
		  }
		}

		function activate() {
		  if (document.body === null) {
		    document.addEventListener('DOMContentLoaded', () => syncSkin(), { once: true })
		    return
		  }
		  const root = document.documentElement
		  root.setAttribute(ATTR, readGhost())
		  ensureStyle(LADDER_STYLE_ID, ladderCss())
		  ensureStyle(SKIN_STYLE_ID, skinCss())
		  if (ghostNode === null || !ghostNode.isConnected) {
		    ghostNode = document.createElement('div')
		    ghostNode.className = GHOST_CLASS
		    ghostNode.setAttribute('aria-hidden', 'true')
		    const sky = document.createElement('div')
		    sky.className = 'sky'
		    const canvas = document.createElement('canvas')
		    const ground = document.createElement('div')
		    ground.className = 'ground'
		    ghostNode.appendChild(sky)
		    ghostNode.appendChild(canvas)
		    ghostNode.appendChild(ground)
		    document.body.appendChild(ghostNode)
		    if (stopStars !== null) stopStars()
		    stopStars = mountStars(canvas)
		  }
		  live = true
		  holdDarkMode()
		  syncExtras()
		}

		function deactivate() {
		  if (!live) return
		  live = false
		  for (const stop of [stopStars, stopFrame, stopFleet]) if (stop !== null) stop()
		  stopStars = null
		  stopFrame = null
		  stopFleet = null
		  if (ghostNode !== null) ghostNode.remove()
		  ghostNode = null
		  removeStyle(SKIN_STYLE_ID)
		  removeLadder()
		  document.documentElement.removeAttribute(ATTR)
		  // Hand dark mode back to whatever the theme service is resolving now.
		  releaseDarkMode()
		  let dark = false
		  try {
		    dark = themeService !== null && themeService.getTheme().active.colorScheme === 'dark'
		  } catch (error) {
		    dark = false
		  }
		  setDarkMode(dark)
		}

		function removeLadder() {
		  removeStyle(LADDER_STYLE_ID)
		}

		function syncSkin() {
		  if (readOn()) activate()
		  else deactivate()
		}

		/* ── settings rows ───────────────────────────────────────────────────── */

		const ROW_CSS =
		  '.dshtbs-row{display:flex;align-items:center;gap:16px;padding:10px 0;flex-wrap:wrap;min-width:0;max-width:100%}\n' +
		  '.dshtbs-row-text{flex:1;min-width:220px}\n' +
		  '.dshtbs-row-title{font-size:13px;line-height:1.5;color:var(--dsw-alias-label-primary,#191919)}\n' +
		  '.dshtbs-row-desc{margin-top:2px;font-size:12px;line-height:1.6;color:var(--dsw-alias-label-secondary,#666)}\n' +
		  '.dshtbs-row-note{margin-top:4px;font-size:12px;line-height:1.6;color:var(--dsw-alias-state-warn-primary,#b26a00)}\n' +
		  '.dshtbs-seg{display:inline-flex;border:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35));border-radius:8px;overflow:hidden}\n' +
		  '.dshtbs-seg button{border:0;background:transparent;color:var(--dsw-alias-label-secondary,#666);font-family:inherit;font-size:12.5px;line-height:1.4;padding:5px 14px;cursor:pointer}\n' +
		  '.dshtbs-seg button+button{border-left:1px solid var(--dsw-alias-border-l2,rgba(127,127,127,.35))}\n' +
		  '.dshtbs-seg button:hover{background:var(--dsw-alias-interactive-bg-hover,rgba(127,127,127,.14))}\n' +
		  '.dshtbs-seg button.on{background:#111;color:#fff;font-weight:600}\n' +
		  '.dshtbs-meta{margin-top:4px;font-size:11.5px;color:var(--dsw-alias-label-tertiary,#999)}\n'

		const h = React.createElement

		function Segmented(props) {
		  return h(
		    'div',
		    { className: 'dshtbs-seg' },
		    props.options.map((option) =>
		      h(
		        'button',
		        { key: option.value, type: 'button', className: props.value === option.value ? 'on' : '', onClick: () => props.onChange(option.value) },
		        option.label,
		      ),
		    ),
		  )
		}

		function Row(props) {
		  React.useEffect(() => ensureStyle(ROW_STYLE_ID, ROW_CSS), [])
		  return h(
		    'div',
		    { className: 'dshtbs-row' },
		    h(
		      'div',
		      { className: 'dshtbs-row-text' },
		      h('div', { className: 'dshtbs-row-title' }, props.title),
		      h('div', { className: 'dshtbs-row-desc' }, props.desc),
		      props.note ? h('div', { className: 'dshtbs-row-note' }, props.note) : null,
		      props.meta ? h('div', { className: 'dshtbs-meta' }, props.meta) : null,
		    ),
		    h('div', { style: { display: 'flex', alignItems: 'center', gap: '8px' } }, props.children),
		  )
		}

		function SkinRow() {
		  const [on, setOn] = React.useState(readOn)
		  const version = installedVersion()
		  const other = document.documentElement.hasAttribute('data-550c')
		  const choose = (next) => {
		    write(ON_KEY, next ? '1' : '0')
		    setOn(next)
		    syncSkin()
		  }
		  return h(
		    Row,
		    {
		      title: '三体皮肤',
		      desc: '把界面换成《三体》启动片头的冷色调：近黑的蓝底、钢灰与冰白的文字、冷青强调色，片尾的群山远景以虚影叠在界面上。只改颜色，不动布局。',
		      note: on && other ? '550C 皮肤也在启用，两套配色会叠在一起：请到 设置 → 550C → 外观 把配色设为「关闭」。' : null,
		      meta: version === null ? null : 'dsh-threebody-skin v' + version,
		    },
		    h(Segmented, {
		      value: on ? 'on' : 'off',
		      onChange: (value) => choose(value === 'on'),
		      options: [
		        { value: 'off', label: '关闭' },
		        { value: 'on', label: '开启' },
		      ],
		    }),
		  )
		}

		function GhostRow() {
		  const [ghost, setGhost] = React.useState(readGhost)
		  const choose = (next) => {
		    write(GHOST_KEY, next)
		    setGhost(next)
		    if (live) document.documentElement.setAttribute(ATTR, next)
		  }
		  return h(
		    Row,
		    { title: '远景虚影', desc: '片尾群山远景在界面上的浓淡：天边的假曙光、星点与山脊轮廓。只会提亮，不会压暗文字。' },
		    h(Segmented, {
		      value: ghost,
		      onChange: choose,
		      options: [
		        { value: 'off', label: '无' },
		        { value: 'faint', label: '淡' },
		        { value: 'mid', label: '中' },
		        { value: 'strong', label: '浓' },
		      ],
		    }),
		  )
		}

		function SpinRow() {
		  const [spin, setSpin] = React.useState(readSpin)
		  const choose = (next) => {
		    write(SPIN_KEY, next)
		    setSpin(next)
		  }
		  return h(
		    Row,
		    { title: '星空转动', desc: '虚影里的星空绕天极缓慢转动，像躺在荒原上仰望星空。从片头最后一帧的位置开始转，山峦不动；星星转到山后会被挡住。缓慢约 4 小时一圈，稍快约 40 分钟一圈。' },
		    h(Segmented, {
		      value: spin,
		      onChange: choose,
		      options: [
		        { value: 'still', label: '静止' },
		        { value: 'slow', label: '缓慢' },
		        { value: 'fast', label: '稍快' },
		      ],
		    }),
		  )
		}

		/** One on/off row for an optional touch. */
		function ToggleRow(props) {
		  const [on, setOn] = React.useState(() => readToggle(props.storageKey))
		  const choose = (value) => {
		    write(props.storageKey, value === 'on' ? '1' : '0')
		    setOn(value === 'on')
		    syncExtras()
		  }
		  return h(
		    Row,
		    { title: props.title, desc: props.desc },
		    h(Segmented, {
		      value: on ? 'on' : 'off',
		      onChange: choose,
		      options: [
		        { value: 'off', label: '关闭' },
		        { value: 'on', label: '开启' },
		      ],
		    }),
		  )
		}

		const FrameRow = () =>
		  h(ToggleRow, {
		    storageKey: FRAME_KEY,
		    title: '四角光晕',
		    desc: '窗口四角淡淡的冷色内陷光晕，配片中 HUD 的细线角标。只提亮边角，不影响阅读。',
		  })

		const FleetRow = () =>
		  h(ToggleRow, {
		    storageKey: FLEET_KEY,
		    title: '三体舰队',
		    desc: '输入框上缘的一支小舰队：“水滴”在前，七艘战舰喷着尾焰，身后拖着穿过星际尘埃的航迹。不挡点击，打开设置或对话框时隐去。',
		  })

		/**
		 * Rows land on the 三体 page when dsh-threebody-boot declares it, else on
		 * 通用设置. Same "land, then move" order as dsh-550c-boot: the general page is
		 * declared first, so the rows go there and move once the page appears (an id
		 * may live in only one list at a time, so the old placement is disposed first).
		 */
		function installSettings(ctx) {
		  let inGeneral = null
		  let onPage = null

		  const placeInGeneral = () => {
		    const placed = [
		      ctx.slots.register({ name: 'settings.general.item', id: 'skin-threebody', order: 41 }, SkinRow),
		      ctx.slots.register({ name: 'settings.general.item', id: 'skin-threebody-ghost', order: 42 }, GhostRow),
		      ctx.slots.register({ name: 'settings.general.item', id: 'skin-threebody-spin', order: 43 }, SpinRow),
		      ctx.slots.register({ name: 'settings.general.item', id: 'skin-threebody-frame', order: 44 }, FrameRow),
		      ctx.slots.register({ name: 'settings.general.item', id: 'skin-threebody-fleet', order: 45 }, FleetRow),
		    ]
		    inGeneral = () => {
		      for (const dispose of placed) dispose()
		    }
		  }

		  const placeOnPage = () => {
		    const placed = [
		      ctx.slots.register({ name: 'settings.threebody.item', id: 'skin-threebody', order: 40 }, SkinRow),
		      ctx.slots.register({ name: 'settings.threebody.item', id: 'skin-threebody-ghost', order: 50 }, GhostRow),
		      ctx.slots.register({ name: 'settings.threebody.item', id: 'skin-threebody-spin', order: 60 }, SpinRow),
		      ctx.slots.register({ name: 'settings.threebody.item', id: 'skin-threebody-frame', order: 70 }, FrameRow),
		      ctx.slots.register({ name: 'settings.threebody.item', id: 'skin-threebody-fleet', order: 80 }, FleetRow),
		    ]
		    onPage = () => {
		      for (const dispose of placed) dispose()
		    }
		  }

		  ctx.slots.inject('settings.threebody.item', () => {
		    inGeneral?.()
		    inGeneral = null
		    placeOnPage()
		    return () => {
		      onPage?.()
		      onPage = null
		      try {
		        if (inGeneral === null) placeInGeneral()
		      } catch (error) {
		        /* the general page is gone too */
		      }
		    }
		  })

		  ctx.slots.inject('settings.general.item', () => {
		    if (onPage === null) placeInGeneral()
		    return () => {
		      inGeneral?.()
		      inGeneral = null
		    }
		  })
		}

		function apply(ctx) {
		  const state = window[STATE_GLOBAL] || (window[STATE_GLOBAL] = { applied: false })
		  if (state.applied === true) return
		  state.applied = true
		  themeService = ctx.theme ?? null
		  installSettings(ctx)
		  ctx.effect(() => {
		    syncSkin()
		    return () => deactivate()
		  }, 'dsh-threebody-skin: skin layer')
		}

		/**
		 * Paint at MODULE EVALUATION time, before the shell mounts, so the first frame
		 * of the app is already in the skin's colours; apply() then owns the lifecycle.
		 */
		syncSkin()

		exports.name = 'skin-threebody'
		exports.inject = ['theme', 'slots']
		exports.apply = apply
		return module.exports;
	}
});
