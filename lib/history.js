// FakeGato's fs writer retries every busy write with a timer retaining a full
// serialized history. Coalesce saves before serialization, across our devices.
const queues = new WeakMap()

function scheduleSave(storage, history) {
	let queue = queues.get(storage)
	if (!queue) {
		queue = { pending: new Set(), writing: false }
		queues.set(storage, queue)
	}
	queue.pending.add(history)
	flush(storage, queue)
}

function flush(storage, queue) {
	if (queue.writing || !queue.pending.size) return
	const history = queue.pending.values().next().value
	queue.pending.delete(history)
	queue.writing = true
	// Keep FakeGato's existing file format, filenames and load/Eve transfer API.
	const data = JSON.stringify({
		firstEntry: history.firstEntry,
		lastEntry: history.lastEntry,
		usedMemory: history.usedMemory,
		refTime: history.refTime,
		initialTime: history.initialTime,
		history: history.history,
		extra: history.extra
	})
	storage.write({
		service: history,
		data,
		callback: (args) => {
			// FakeGatoStorage passes the fs callback's arguments as one object.
			if (args[0]) history.log.debug('Error saving Switcher history:', args[0])
			queue.writing = false
			flush(storage, queue)
		}
	})
}

module.exports = (accessory, api, log) => {
	const FakeGatoHistoryService = require('fakegato-history')(api)
	const history = new FakeGatoHistoryService('custom', accessory, {
		storage: 'fs', path: api.user.persistPath() + '/../switcher-persist', disableTimer: true, log
	})
	history.save = () => {
		if (history.isHistoryLoaded()) scheduleSave(api.globalFakeGatoStorage, history)
	}
	return history
}
