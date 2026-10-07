const { test } = require('node:test')
const assert = require('node:assert/strict')
const { environment } = require('./helpers')
const state = require('../lib/stateManager')
const plugin = require('../lib/switcher')
test('shutdown cancels queued Breeze commands and processing timers', async t => {
	const env = environment(t)
	let commands = 0
	const owner = { api: env.api, log: env.log, state: {}, switcher: { set_breeze_command: () => commands++ }, updateState: () => {} }
	state.set.ACActive.call(owner, 1, () => {})
	assert.equal(env.timers.size, 1)
	Object.assign(env.platform, { switcherDevices: {} })
	await plugin.shutdown.call(env.platform)
	assert.equal(env.timers.size, 0)
	env.runTimers()
	assert.equal(commands, 0)
})
