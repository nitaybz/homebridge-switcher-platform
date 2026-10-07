// Accelerate six hours of 4-second broadcasts. Real FakeGato serialization,
// mocked HomeKit and an immediately completing filesystem, no real devices.
const { mock } = require('node:test')
const { performance } = require('node:perf_hooks')
const { environment, device } = require('./helpers')
mock.timers.enable({ apis: ['Date'], now: 1700000000000 })
const env = environment({ mock })
const accessories = ['one', 'two', 'three'].map(id => device(env, 'Valve', id))
const startCpu = process.cpuUsage(), start = performance.now()
let writes = 0, bytes = 0
for (let i = 0; i < 5400; i++) {
	mock.timers.tick(4000)
	for (const accessory of accessories) accessory.updateState({ ...accessory.state, power: 1, power_consumption: 1000 })
	do {
		while (env.writes.length) {
			const write = env.writes.shift()
			writes++; bytes += Buffer.byteLength(write.data)
			write.callback()
		}
		env.runTimers()
	} while (env.writes.length || env.timers.size)
}
const cpu = process.cpuUsage(startCpu)
console.log(JSON.stringify({ simulatedHours: 6, devices: 3, broadcastsPerDevice: 5400, historyWrites: writes,
	serializedMiB: +(bytes / 1024 / 1024).toFixed(3), cpuMs: +((cpu.user + cpu.system) / 1000).toFixed(1),
	elapsedMs: +(performance.now() - start).toFixed(1), energyKWh: accessories.map(item => +item.totalEnergy.toFixed(6)) }))
mock.restoreAll()
mock.timers.reset()
