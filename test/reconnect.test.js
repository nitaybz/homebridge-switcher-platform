const { test } = require('node:test')
const assert = require('node:assert/strict')
const { EventEmitter } = require('node:events')
const dgram = require('node:dgram')
const Switcher = require('switcher-js2')
const plugin = require('../lib/switcher')
const { environment } = require('./helpers')

function setup(t) {
	const env = environment(t), sockets = [], active = new Set()
	Object.assign(env.platform, { switcherDevices: {}, devices: [], customTimers: [], secondsToRemove: 0 })
	t.mock.method(dgram, 'createSocket', (type, handler) => {
		const socket = new EventEmitter()
		socket.on('message', handler)
		socket.bind = () => active.add(socket)
		socket.close = callback => {
			if (!active.delete(socket)) throw Object.assign(new Error('not running'), { code: 'ERR_SOCKET_DGRAM_NOT_RUNNING' })
			queueMicrotask(() => { socket.emit('close'); callback?.() })
		}
		sockets.push(socket)
		return socket
	})
	let refreshes = 0
	t.mock.method(Switcher.prototype, 'status', () => { refreshes++ })
	plugin.init.call(env.platform)
	return { ...env, sockets, active, refreshes: () => refreshes }
}
function packet() {
	const buffer = Buffer.alloc(168)
	buffer.writeUInt16BE(0xfef0, 0)
	buffer.writeUInt16BE(0x030b, 74)
	buffer.write('boiler', 38)
	return buffer
}
const settle = async () => { for (let i = 0; i < 10; i++) await Promise.resolve() }

test('reconnect reattaches handlers and leaves exactly four active UDP sockets', async t => {
	const env = setup(t)
	env.sockets[0].emit('error', new Error('offline'))
	await settle()
	assert.equal(env.timers.size, 1)
	env.runTimers()
	await settle()
	assert.equal(env.active.size, 4)
	env.sockets.at(-1).emit('message', packet(), { address: '192.0.2.1' })
	assert.equal(Object.keys(env.platform.switcherDevices).length, 1)
	const completion = plugin.shutdown.call(env.platform)
	env.drain()
	await completion
	assert.equal(env.active.size, 0)
})
test('error storms schedule one reconnect; shutdown cancels it', async t => {
	const env = setup(t)
	for (const socket of env.sockets) socket.emit('error', new Error('offline'))
	await settle()
	assert.equal(env.timers.size, 1)
	await plugin.shutdown.call(env.platform)
	assert.equal(env.timers.size, 0)
	assert.equal(env.active.size, 0)
	env.runTimers()
	assert.equal(env.sockets.length, 4)
})
test('100 reconnect/shutdown cycles keep sockets and listener refreshes bounded', async t => {
	const env = setup(t)
	for (let i = 0; i < 100; i++) {
		env.sockets.at(-1).emit('error', new Error('offline'))
		await settle()
		env.runTimers()
		await settle()
		assert.equal(env.active.size, 4)
	}
	env.sockets.at(-1).emit('message', packet(), { address: '192.0.2.1' })
	const accessory = Object.values(env.platform.switcherDevices)[0]
	for (let i = 0; i < 100; i++) accessory.switcher.emit('state', 1)
	assert.equal(env.timers.size, 1)
	const shutdown = plugin.shutdown.call(env.platform)
	env.drain()
	await shutdown
	assert.equal(env.active.size, 0)
	assert.equal(env.timers.size, 0)
	env.runTimers()
	assert.equal(env.refreshes(), 0)
})
test('Breeze replacement closes old TCP client and cancels its delayed status work', async t => {
	t.mock.method(Switcher.prototype, '_get_breeze_remote', async () => ({}))
	const env = setup(t)
	const message = { device_id: 'breeze', device_ip: '192.0.2.1', name: 'breeze', type: 'breeze', remote: 'OLD', state: { power: 'OFF' } }
	env.platform.switcherDevices.breeze = { remote: 'OLD', switcher: new Switcher('breeze', '192.0.2.1', env.log, false, 'breeze', 'OLD'), updateState: () => {} }
	const old = env.platform.switcherDevices.breeze.switcher
	old.socket = { destroyed: false, destroy() { this.destroyed = true } }
	// Existing client is discovered without constructing a replacement accessory.
	const proxy = env.platform._switcherRuntime?.proxy
	assert.ok(proxy, 'runtime must own discovery proxy')
	proxy.emit('message', { ...message, remote: 'NEW' })
	assert.equal(old.socket === null || old.socket.destroyed, true)
	assert.equal(old.listenerCount('state'), 0)
	await plugin.shutdown.call(env.platform)
})
test('unsupported discovery packets do not retain a new client on every broadcast', async t => {
	const env = setup(t)
	for (let i = 0; i < 1000; i++) env.platform._switcherRuntime.proxy.emit('message', {
		device_id: 'unsupported', device_ip: '192.0.2.1', name: 'unsupported', type: 'unknown_ffff'
	})
	assert.equal(env.platform._switcherRuntime.clients.size, 0)
	await plugin.shutdown.call(env.platform)
})
