const { test } = require('node:test')
const assert = require('node:assert/strict')
const { environment, device } = require('./helpers')

for (const Type of ['Valve', 'Outlet', 'Switch']) {
	test(`${Type}: stalled disk keeps persistence work bounded and flushes latest energy`, t => {
		const env = environment(t)
		const accessories = [device(env, Type, 'one'), device(env, Type, 'two'), device(env, Type, 'three')]
		for (let i = 0; i < 1000; i++) {
			for (const accessory of accessories) accessory.updateState({ ...accessory.state, power: i % 2, power_consumption: i })
		}
		assert.ok(env.timers.size <= accessories.length, `retry timers grew to ${env.timers.size}`)
		assert.equal(env.writes.length, 1)
		const saved = env.drain()
		assert.ok(saved.length <= 4, `queued ${saved.length} obsolete snapshots`)
		for (const accessory of accessories) {
			const latest = saved.filter(item => item.savedPath.includes(`_${accessory.name}_persist.json`)).at(-1)
			assert.ok(latest)
			assert.equal(latest.extra.totalEnergy, accessory.totalEnergy)
			assert.ok(latest.history.some(item => item.power === 999))
		}
	})
}

test('delayed history load does not accumulate retry timers or lose accumulated energy', t => {
	const env = environment(t, false)
	const accessory = device(env)
	for (let i = 0; i < 1000; i++) accessory.updateState({ ...accessory.state, power: 1, power_consumption: 1000 })
	assert.equal(env.timers.size, 0)
	assert.equal(env.writes.length, 0)
	const accumulated = accessory.totalEnergyTemp
	env.reads.shift()(new Error('ENOENT'))
	accessory.updateState(accessory.state)
	assert.ok(accessory.totalEnergy >= accumulated)
	assert.equal(accessory.totalEnergyTemp, 0)
	assert.equal(env.drain().length, 1)
})

test('six hours of broadcasts sample history once per minute and retain power transitions', t => {
	t.mock.timers.enable({ apis: ['Date'], now: 1700000000000 })
	const env = environment(t)
	const accessory = device(env)
	let saves = 0
	for (let i = 0; i < 5400; i++) {
		t.mock.timers.tick(4000)
		accessory.updateState({ ...accessory.state, power: 1, power_consumption: 1000 })
		saves += env.drain().length
	}
	assert.ok(saves <= 361, `serialized history ${saves} times`)
	assert.ok(Math.abs(accessory.totalEnergy - 6) < 1e-8, `energy was ${accessory.totalEnergy}`)
	accessory.updateState({ ...accessory.state, power: 0, power_consumption: 0 })
	assert.equal(env.drain().at(-1).history.at(-1).status, false)
})

test('repeated stalled/recovered storage cycles keep ring and pending work bounded', t => {
	const env = environment(t)
	const accessories = ['one', 'two', 'three'].map(id => device(env, 'Valve', id))
	for (let cycle = 0; cycle < 100; cycle++) {
		for (let i = 0; i < 100; i++) {
			for (const accessory of accessories) accessory.updateState({ ...accessory.state, power: i % 2, power_consumption: i })
		}
		assert.equal(env.timers.size, 0)
		assert.equal(env.writes.length, 1)
		assert.ok(env.drain().length <= 4)
	}
	for (const accessory of accessories) assert.equal(accessory.loggingService.history.length, 4032)
	assert.equal(env.storage.getWriters().length, 3)
})

test('failed writes release queue and later updates can persist', t => {
	const env = environment(t)
	const accessory = device(env)
	accessory.updateState(accessory.state)
	env.drain(new Error('EIO'))
	assert.equal(env.timers.size, 0)
	accessory.updateState({ ...accessory.state, power: 1 })
	assert.equal(env.drain().length, 1)
})

test('another FakeGato writer busy on the shared storage creates at most one retry', t => {
	const env = environment(t)
	const accessory = device(env)
	env.storage.writing = true
	for (let i = 0; i < 1000; i++) accessory.updateState({ ...accessory.state, power: i % 2 })
	assert.equal(env.timers.size, 1)
	for (let i = 0; i < 100; i++) {
		env.runTimers()
		assert.equal(env.timers.size, 1)
	}
	env.storage.writing = false
	env.runTimers()
	assert.equal(env.timers.size, 0)
	assert.equal(env.drain().length, 2)
})

test('existing persisted history and energy/reset metadata survive load and next save', t => {
	const env = environment(t, false)
	const accessory = device(env)
	const persisted = { firstEntry: 0, lastEntry: 2, usedMemory: 2, refTime: 721692800, initialTime: 1700000000,
		history: ['noValue', { time: 1700000000, setRefTime: 1 }, { time: 1700000000, power: 100, status: false }],
		extra: { totalEnergy: 12.5, lastReset: 123 } }
	env.reads.shift()(null, JSON.stringify(persisted))
	accessory.updateState(accessory.state)
	const saved = env.drain()[0]
	assert.equal(saved.extra.totalEnergy, 12.5)
	assert.equal(saved.extra.lastReset, 123)
	assert.equal(saved.initialTime, persisted.initialTime)
	assert.deepEqual(saved.history[2], persisted.history[2])
})
