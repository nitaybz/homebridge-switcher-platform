const { EventEmitter } = require('node:events')
const { FakeGatoStorage } = require('fakegato-history/fakegato-storage')

class Characteristic extends EventEmitter {
	constructor(name, UUID) { super(); this.displayName = name; this.UUID = UUID; this.value = 0 }
	setProps() { return this }
	getDefaultValue() { return 0 }
	setValue(value) { this.value = value; return this }
	updateValue(value) { return this.setValue(value) }
}
let uuid = 1
for (const name of ['Name', 'CurrentTemperature', 'VOCDensity', 'CurrentRelativeHumidity', 'ContactSensorState', 'On', 'MotionDetected', 'TargetTemperature', 'Manufacturer', 'Model', 'SerialNumber', 'Active', 'InUse', 'ValveType', 'SetDuration', 'RemainingDuration', 'OutletInUse']) {
	Characteristic[name] = class extends Characteristic {
		constructor() { super(name, Characteristic[name].UUID) }
	}
	Characteristic[name].UUID = `${(uuid++).toString(16).padStart(8, '0')}-0000-1000-8000-0026BB765291`
}
class Service {
	constructor(name, UUID) { this.displayName = name; this.UUID = UUID; this.characteristics = [] }
	getCharacteristic(Type) { return this.characteristics.find(item => item.UUID === Type.UUID) || this.addCharacteristic(Type) }
	addCharacteristic(Type) { const item = new Type(); this.characteristics.push(item); return item }
	addOptionalCharacteristic(Type) { this.getCharacteristic(Type); return this }
	setCharacteristic(Type, value) { this.getCharacteristic(Type).setValue(value); return this }
}
for (const name of ['Valve', 'Outlet', 'Switch', 'AccessoryInformation']) {
	Service[name] = class extends Service {
		constructor(label) { super(label || name, Service[name].UUID) }
	}
	Service[name].UUID = `service-${name}`
}
class Accessory {
	constructor(name, UUID) { this.displayName = name; this.UUID = UUID; this.context = {}; this.services = [] }
	getService(Type) { return this.services.find(item => item.UUID === Type.UUID) }
	addService(Type, name) { const item = new Type(name); this.services.push(item); return item }
}

function environment(t, loaded = true) {
	delete require.cache[require.resolve('fakegato-history')]
	const api = new EventEmitter()
	api.hap = { Characteristic, Service, Formats: {}, Perms: {}, uuid: { generate: id => id } }
	api.user = { persistPath: () => '/unused', storagePath: () => '/unused' }
	api.platformAccessory = Accessory
	api.registerPlatformAccessories = () => {}
	api.unregisterPlatformAccessories = () => {}
	const log = () => {}
	log.debug = log.easyDebug = log
	const storage = api.globalFakeGatoStorage = new FakeGatoStorage({ log })
	const writes = [], reads = [], timers = new Map()
	storage.read = ({ callback }) => { if (loaded) callback(new Error('ENOENT')); else reads.push(callback) }
	const addWriter = storage.addWriter.bind(storage)
	storage.addWriter = (service, options) => {
		addWriter(service, options)
		storage.getWriter(service).storageHandler = {
			writeFile: (path, data, encoding, callback) => writes.push({ path, data, callback })
		}
	}
	let timerId = 0
	t.mock.method(global, 'setTimeout', (callback, delay) => {
		const id = ++timerId
		timers.set(id, { callback, delay })
		return id
	})
	t.mock.method(global, 'clearTimeout', id => timers.delete(id))
	return {
		api, log, storage, writes, reads, timers,
		platform: { api, log, accessories: [], PLUGIN_NAME: 'test', PLATFORM_NAME: 'test' },
		runTimers() {
			const batch = [...timers.values()]; timers.clear()
			for (const timer of batch) timer.callback()
			// Mock call history would retain already-completed retry closures.
			global.setTimeout.mock.resetCalls()
		},
		drain(error) {
			const completed = []
			while (writes.length) {
				const write = writes.shift(); completed.push({ ...JSON.parse(write.data), savedPath: write.path }); write.callback(error)
			}
			return completed
		}
	}
}
function device(env, Type = 'Valve', id = 'abc123') {
	const AccessoryType = require(`../accessories/${Type}`)
	return new AccessoryType(new EventEmitter(), {
		device_id: id, device_ip: '192.0.2.1', name: id, type: 'v3',
		state: { power: 0, power_consumption: 0, remaining_seconds: 0, default_shutdown_seconds: 3600 }
	}, env.platform)
}
module.exports = { environment, device }
