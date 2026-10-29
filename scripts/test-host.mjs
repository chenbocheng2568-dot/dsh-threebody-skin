// Host-half checks for dsh-threebody-skin: the ghost image route and its whitelist.
//
//   node scripts/test-host.mjs
import assert from 'node:assert/strict'
import { createServer } from 'node:http'
import { statSync } from 'node:fs'
import { fileURLToPath } from 'node:url'
import { __test } from '../lib/index.js'

const { mediaHandler, MEDIA_PREFIX } = __test
const server = createServer((req, res) => mediaHandler(req, res))
await new Promise((resolve) => server.listen(0, '127.0.0.1', resolve))
const base = `http://127.0.0.1:${server.address().port}${MEDIA_PREFIX}/`
const size = statSync(fileURLToPath(new URL('../media/threebody-sky.jpg', import.meta.url))).size

let response = await fetch(base + 'threebody-sky.jpg?v=0.1.0')
assert.equal(response.status, 200)
assert.equal(response.headers.get('content-type'), 'image/jpeg')
assert.equal((await response.arrayBuffer()).byteLength, size)
console.log('ok - ghost image served')

for (const bad of ['..%2Fpackage.json', '../lib/index.js', 'other.jpg', '']) {
  response = await fetch(base + bad)
  assert.equal(response.status, 404, bad)
}
console.log('ok - whitelist')

response = await fetch(base + 'threebody-sky.jpg', { method: 'POST' })
assert.equal(response.status, 405)
console.log('ok - POST refused')
server.close()
