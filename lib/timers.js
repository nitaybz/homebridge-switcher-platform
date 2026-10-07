const owners = new WeakMap()
const stateFor = api => {
	if (!owners.has(api)) owners.set(api, { stopped: false, handles: new Set() })
	return owners.get(api)
}
exports.schedule = (api, callback, delay) => {
	const state = stateFor(api)
	if (state.stopped) return null
	const handle = setTimeout(() => {
		state.handles.delete(handle)
		if (!state.stopped) callback()
	}, delay)
	state.handles.add(handle)
	return handle
}
exports.cancel = (api, handle) => {
	stateFor(api).handles.delete(handle)
	clearTimeout(handle)
}
exports.stop = api => {
	const state = stateFor(api)
	state.stopped = true
	for (const handle of state.handles) clearTimeout(handle)
	state.handles.clear()
}
