// Bound work before serialization across all Switcher histories.
const queues = new WeakMap()
const RETRY_MS = 5000

function queueFor(storage) {
	let queue = queues.get(storage)
	if (!queue) {
		queue = { pending: new Set(), histories: new Set(), writing: false, retryTimer: null, stopped: false, closing: false }
		queues.set(storage, queue)
	}
	return queue
}
function scheduleSave(storage, history) {
	const queue = queueFor(storage)
	if (queue.stopped) return
	queue.pending.add(history)
	flush(storage, queue)
}
function flush(storage, queue) {
	if (queue.stopped || queue.writing || queue.retryTimer !== null) return
	if (!queue.pending.size) {
		if (queue.finish) queue.finish(!queue.failed)
		return
	}
	const history = queue.pending.values().next().value
	queue.pending.delete(history)
	queue.writing = true
	const complete = (error) => {
		queue.writing = false
		if (error) {
			history.log.debug('Error saving Switcher history:', error)
			if (queue.closing) queue.failed = true
			else if (!queue.stopped) {
				queue.pending.add(history)
				queue.retryTimer = setTimeout(() => {
					queue.retryTimer = null
					flush(storage, queue)
				}, RETRY_MS)
				queue.retryTimer.unref?.()
			}
		}
		flush(storage, queue)
	}
	let writerStarted = false
	const wasWriting = !!storage.writing
	try {
		// Preserve FakeGato's existing file schema, filenames and Eve API.
		const data = JSON.stringify({
			firstEntry: history.firstEntry, lastEntry: history.lastEntry,
			usedMemory: history.usedMemory, refTime: history.refTime,
			initialTime: history.initialTime, history: history.history, extra: history.extra
		})
		writerStarted = true
		storage.write({ service: history, data, callback: args => complete(args[0]) })
	} catch (error) {
		// FakeGato leaves its busy flag set if its fs adapter throws synchronously.
		if (writerStarted && !wasWriting) storage.writing = false
		complete(error)
	}
}

module.exports = (accessory, api, log) => {
	const FakeGatoHistoryService = require('fakegato-history')(api)
	const history = new FakeGatoHistoryService('custom', accessory, {
		storage: 'fs', path: api.user.persistPath() + '/../switcher-persist', disableTimer: true, log
	})
	queueFor(api.globalFakeGatoStorage).histories.add(history)
	history.save = () => {
		if (history.isHistoryLoaded()) scheduleSave(api.globalFakeGatoStorage, history)
	}
	return history
}

// Final metadata includes energy changes between samples. Homebridge's shutdown
// event does not await listeners, so finish within its process grace period.
module.exports.shutdown = (api, timeoutMs = 2000) => {
	const storage = api.globalFakeGatoStorage
	if (!storage || !queues.has(storage)) return Promise.resolve(true)
	const queue = queues.get(storage)
	if (queue.shutdownPromise) return queue.shutdownPromise
	queue.closing = true
	queue.failed = [...queue.histories].some(history => !history.isHistoryLoaded())
	clearTimeout(queue.retryTimer)
	queue.retryTimer = null
	for (const history of queue.histories) {
		if (history.isHistoryLoaded()) queue.pending.add(history)
	}
	queue.shutdownPromise = new Promise(resolve => {
		const timer = setTimeout(() => queue.finish(false), timeoutMs)
		timer.unref?.()
		queue.finish = success => {
			clearTimeout(timer)
			clearTimeout(queue.retryTimer)
			queue.retryTimer = null
			queue.stopped = true
			queue.pending.clear()
			queue.histories.clear()
			queue.finish = null
			resolve(success)
		}
		flush(storage, queue)
	})
	return queue.shutdownPromise
}
