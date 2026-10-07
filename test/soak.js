// 120-second offline trend probe, about 200 simulated device-hours per device.
const { mock } = require('node:test')
const { performance } = require('node:perf_hooks')
const { environment, device } = require('./helpers')
const history = require('../lib/history')
if (!global.gc) throw new Error('Run with --expose-gc')
mock.timers.enable({ apis: ['Date'], now: 1700000000000 })
const env = environment({ mock })
const accessories = ['one', 'two', 'three'].map(id => device(env, 'Valve', id))
global.gc()
const start = performance.now(), startHeap = process.memoryUsage().heapUsed
let ticks = 0, updates = 0
const interval = setInterval(async () => {
	try {
		ticks++
		for (let i = 0; i < 1500; i++) {
			updates++
			mock.timers.tick(4000)
			for (const accessory of accessories) accessory.updateState({ ...accessory.state, power: Math.floor(updates / 500) % 2, power_consumption: 1000 })
		}
		// Stall the first 20 seconds, then recover, including intermittent EIO.
		if (ticks > 20) {
			env.drain(ticks % 17 === 0 ? new Error('EIO') : undefined)
			env.runTimers()
			env.drain()
		}
		if (ticks % 5 === 0) {
			global.gc()
			console.log(JSON.stringify({ wallSeconds: +((performance.now() - start) / 1000).toFixed(3),
				simulatedHoursPerDevice: +(updates * 4 / 3600).toFixed(3), updatesPerDevice: updates,
				heapGrowthMiB: +((process.memoryUsage().heapUsed - startHeap) / 1024 / 1024).toFixed(3),
				retryTimers: env.timers.size, pendingDiskWrites: env.writes.length,
				historyEntries: accessories.map(item => item.loggingService.history.length) }))
		}
		if (ticks === 120) {
			clearInterval(interval)
			const completion = history.shutdown(env.api)
			env.drain()
			console.log(JSON.stringify({ shutdownSaved: await completion, remainingTimers: env.timers.size, remainingWrites: env.writes.length }))
			mock.restoreAll(); mock.timers.reset()
		}
	} catch (error) {
		clearInterval(interval)
		mock.restoreAll(); mock.timers.reset()
		console.error(error); process.exitCode = 1
	}
}, 1000)
