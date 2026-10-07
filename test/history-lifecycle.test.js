const { test } = require('node:test')
const assert = require('node:assert/strict')
const { environment, device } = require('./helpers')

test('shutdown flushes energy updates since the last history sample and waits for disk', async t => {
	t.mock.timers.enable({ apis: ['Date'], now: 1700000000000 })
	const env = environment(t), accessory = device(env)
	accessory.updateState({ ...accessory.state, power: 1, power_consumption: 1000 })
	env.drain()
	t.mock.timers.tick(4000)
	accessory.updateState(accessory.state)
	assert.equal(env.writes.length, 0)
	const completion = require('../lib/history').shutdown(env.api)
	assert.equal(env.writes.length, 1)
	const saved = env.drain()[0]
	assert.equal(saved.extra.totalEnergy, accessory.totalEnergy)
	assert.equal(await completion, true)
	assert.equal(env.timers.size, 0)
})

test('failed writes retry the latest state using one bounded timer', t => {
	const env = environment(t), accessory = device(env)
	accessory.updateState(accessory.state)
	env.drain(new Error('EIO'))
	assert.equal(env.timers.size, 1)
	for (let i = 0; i < 1000; i++) accessory.updateState({ ...accessory.state, power: i % 2, power_consumption: i })
	assert.equal(env.timers.size, 1)
	assert.equal(env.writes.length, 0)
	env.runTimers()
	const saved = env.drain().at(-1)
	assert.ok(saved.history.some(item => item.power === 999))
	assert.equal(env.timers.size, 0)
})

test('shutdown times out a stalled disk and leaves no retry timers or later writes', async t => {
	const env = environment(t), accessory = device(env)
	accessory.updateState(accessory.state)
	const completion = require('../lib/history').shutdown(env.api)
	env.runTimers()
	assert.equal(await completion, false)
	assert.equal(env.timers.size, 0)
	assert.equal(env.drain().length, 1)
	accessory.updateState({ ...accessory.state, power: 1 })
	assert.equal(env.writes.length, 0)
})

test('synchronous writer exception releases queue instead of wedging future saves', t => {
	const env = environment(t), accessory = device(env)
	const writer = env.storage.getWriter(accessory.loggingService)
	const original = writer.storageHandler.writeFile
	writer.storageHandler.writeFile = () => { throw new Error('EIO') }
	assert.doesNotThrow(() => accessory.updateState(accessory.state))
	writer.storageHandler.writeFile = original
	env.runTimers()
	assert.equal(env.drain().length, 1)
})
