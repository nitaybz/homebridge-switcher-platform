// Bounded offline probe: actual FakeGato, mocked HomeKit and stalled filesystem.
// Run with node --expose-gc test/memory-probe.js (no sockets or real files).
const { mock } = require('node:test')
const { environment, device } = require('./helpers')
const { performance } = require('node:perf_hooks')
if (!global.gc) throw new Error('Run with --expose-gc')
const env = environment({ mock })
const accessories = ['one', 'two', 'three'].map(id => device(env, 'Valve', id))
global.gc()
const startHeap = process.memoryUsage().heapUsed
const start = performance.now()
let previous = 0
for (const updates of (process.argv.includes('--sustained') ? [1000, 5000, 10000, 20000] : [100, 300, 600, 1000])) {
	for (let i = previous; i < updates; i++) {
		for (const accessory of accessories) accessory.updateState({ ...accessory.state, power: i % 2, power_consumption: i })
	}
	previous = updates
	global.gc()
	console.log(JSON.stringify({ updatesPerDevice: updates, devices: 3, retryTimers: env.timers.size,
		pendingDiskWrites: env.writes.length, heapGrowthMiB: +( (process.memoryUsage().heapUsed - startHeap) / 1024 / 1024 ).toFixed(3),
		elapsedMs: +(performance.now() - start).toFixed(1) }))
}
mock.restoreAll()
