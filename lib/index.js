/**
 * Host half of dsh-threebody-skin.
 *
 * The skin is browser-side (lib/client.js): a `--dsw-*` token ladder in the
 * film's cold palette, the dark-mode hold, and the 远景虚影 — a faint image of
 * the closing landscape of the 三体 launch film laid over the interface.
 *
 * This half does two things a client bundle cannot:
 *
 *   media    serves the ghost image from inside the package (one whitelisted
 *            file). Same-origin in a browser; on the Desktop `dsh-app://app/`
 *            forwards non-asset paths to this host.
 *   version  injects `__dshThreebodySkinVersion`, so dsh-threebody-boot and the
 *            settings rows can tell the skin is installed without asking.
 *
 * @module dsh-threebody-skin
 */

import { readFileSync, statSync } from 'node:fs'
import { dirname, resolve } from 'node:path'
import { fileURLToPath } from 'node:url'

export const name = 'skin-threebody'

/** lib/client.js VERSION_GLOBAL — keep in sync. */
const VERSION_GLOBAL = '__dshThreebodySkinVersion'
/** lib/client.js MEDIA_ROUTE — keep in sync. */
const MEDIA_PREFIX = '/dsh-threebody-skin/media'
const PACKAGE_ROOT = resolve(dirname(fileURLToPath(import.meta.url)), '..')
const MEDIA_ROOT = resolve(PACKAGE_ROOT, 'media')
const MEDIA_FILES = new Map([
  ['threebody-sky.jpg', 'image/jpeg'],
  ['threebody-ground.webp', 'image/webp'],
])

function packageVersion() {
  try {
    return JSON.parse(readFileSync(resolve(PACKAGE_ROOT, 'package.json'), 'utf8')).version ?? null
  } catch (error) {
    return null
  }
}

const VERSION = packageVersion()

/** GET/HEAD /dsh-threebody-skin/media/<file> — whitelist only. */
function mediaHandler(req, res) {
  if (req.method !== 'GET' && req.method !== 'HEAD') {
    res.writeHead(405, { allow: 'GET, HEAD' })
    res.end()
    return
  }
  let fileName
  try {
    const url = new URL(req.url ?? '/', 'http://127.0.0.1')
    fileName = decodeURIComponent(url.pathname.slice(MEDIA_PREFIX.length)).replace(/^\/+/, '')
  } catch (error) {
    res.writeHead(400, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('bad request')
    return
  }
  const type = MEDIA_FILES.get(fileName)
  if (type === undefined) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
    return
  }
  let body
  try {
    const file = resolve(MEDIA_ROOT, fileName)
    statSync(file)
    body = readFileSync(file)
  } catch (error) {
    res.writeHead(404, { 'content-type': 'text/plain; charset=utf-8' })
    res.end('not found')
    return
  }
  // The client asks with ?v=<version>, so a long cache is safe across upgrades.
  res.writeHead(200, {
    'content-type': type,
    'content-length': String(body.length),
    'cache-control': 'private, max-age=31536000, immutable',
  })
  res.end(req.method === 'HEAD' ? undefined : body)
}

/**
 * @param ctx - the plugin context.
 */
export function apply(ctx) {
  ctx.on('webserver/index-inject', (table) => {
    if (VERSION !== null) table.push({ kind: 'global', name: VERSION_GLOBAL, value: VERSION })
  })

  ctx.inject(['webServer'], (webCtx) => {
    webCtx.effect(
      () =>
        webCtx.webServer.register({
          kind: 'prefix',
          path: MEDIA_PREFIX,
          handler: mediaHandler,
        }),
      `skin-threebody: GET ${MEDIA_PREFIX}/*`,
    )
  })
}

/** Exposed for scripts/test-host.mjs only. */
export const __test = { mediaHandler, MEDIA_PREFIX }
