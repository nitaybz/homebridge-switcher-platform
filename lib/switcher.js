const Switcher = require('switcher-js2')
const OutletAccessory = require('../accessories/Outlet')
const ValveAccessory = require('../accessories/Valve')
const HeaterCooler = require('../accessories/HeaterCooler')
const SwitchAccessory = require('../accessories/Switch')
const WindowCoveringAccessory = require('../accessories/WindowCovering')
const MixedAccessory = require('../accessories/Mixed')
const LightsAccessory = require('../accessories/Lights')
const TimerAccessory = require('../accessories/Timer')

module.exports = {
	init: function() {
		if (this._switcherRuntime) return
		const runtime = this._switcherRuntime = { proxy: null, stopped: false, reconnectTimer: null, removalTimer: null, clients: new Map() }
		this.persistPath = this.api.user.persistPath() + '/../switcher-persist'
		if (this.secondsToRemove)
			runtime.removalTimer = setTimeout(checkIfAllDevicesFound.bind(this), this.secondsToRemove * 1000)
		this.log.easyDebug(`Scanning for switcher devices...`)
		const start = () => {
			if (runtime.stopped) return
			const proxy = runtime.proxy = Switcher.listen(this.log.easyDebug)
			const onMessage = message => { if (!runtime.stopped && proxy === runtime.proxy) messageHandler.call(this, message) }
			proxy.on('message', onMessage)
			proxy.on('error', err => {
				if (runtime.stopped || proxy !== runtime.proxy) return
				runtime.proxy = null
				proxy.removeListener('message', onMessage)
				this.log.easyDebug(err)
				runtime.closing = closeProxy(proxy, this.log)
				runtime.closing.then(() => {
					if (runtime.stopped) return
					runtime.reconnectTimer = setTimeout(() => {
						runtime.reconnectTimer = null
						start()
					}, 10000)
				})
			})
		}
		start()
	},
	shutdown: function() {
		const runtime = this._switcherRuntime
		require('./timers').stop(this.api)
		if (runtime?.shutdownPromise) return runtime.shutdownPromise
		if (runtime) {
			runtime.stopped = true
			clearTimeout(runtime.reconnectTimer)
			clearTimeout(runtime.removalTimer)
			for (const dispose of [...runtime.clients.values()]) dispose()
		}
		for (const device of Object.values(this.switcherDevices)) closeClient(device.switcher, this.log)
		const history = require('./history').shutdown(this.api)
		const discovery = runtime?.proxy ? closeProxy(runtime.proxy, this.log) : runtime?.closing
		const completion = Promise.all([history, discovery]).then(([saved]) => {
			if (!saved) this.log('Switcher history could not finish saving during shutdown')
			return saved
		})
		if (runtime) runtime.shutdownPromise = completion
		return completion
	}
}

const closeProxy = (proxy, log) => {
	try { return Promise.resolve(proxy.close()).catch(error => log(error)) }
	catch (error) { log(error); return Promise.resolve() }
}
const ignoreClosedError = () => {}
const closeClient = (client, log) => {
	try { client.close() } catch (error) { log(error) }
}

const checkIfAllDevicesFound = function() {
	this.accessories.forEach(accessory => {
		if (accessory.context.deviceId in this.switcherDevices)
			return

		// unregistering accessory
		this.log(`Unregistering disconnected device: "${accessory.name}" | ID:${accessory.context.deviceId} | IP: ${accessory.context.ip} `)
		this.api.unregisterPlatformAccessories(this.PLUGIN_NAME, this.PLATFORM_NAME, [accessory])
	});
}

const messageHandler = function (switcher) {
	if (switcher.device_id in this.switcherDevices) {

		// temporary fix to remove faulty switch for breeze
		if (switcher.type === 'breeze') {
			this.accessories.forEach((accessory, i) => {
				if (accessory.context.deviceId === switcher.device_id && accessory.context.type === 'Switch') {
					// unregistering accessory
					this.log(`Unregistering faulty breeze switch`)
					this.api.unregisterPlatformAccessories(this.PLUGIN_NAME, this.PLATFORM_NAME, [accessory])
					delete this.accessories[i]
				}
			});
		}

		this.log.easyDebug(`Received a message from ${switcher.device_ip}`)
		this.log.easyDebug(switcher)
		if (!this.switcherDevices[switcher.device_id].processing)
			this.switcherDevices[switcher.device_id].updateState(switcher.state)
		// check for change in breeze remote
		if (this.switcherDevices[switcher.device_id].remote && this.switcherDevices[switcher.device_id].remote !== switcher.remote && switcher.remote !== 'UNKNOWN') {
			this.log(`Detected new remote for Breeze device (${switcher.device_id}), changing remote (${this.switcherDevices[switcher.device_id].remote} => ${switcher.remote})`)
			const switcherDevice = new Switcher(switcher.device_id, switcher.device_ip, this.log.easyDebug, false, switcher.type, switcher.remote, this.token)
			const old = this.switcherDevices[switcher.device_id].switcher
			this._switcherRuntime.clients.get(old)?.()
			closeClient(old, this.log)
			this.switcherDevices[switcher.device_id].switcher = switcherDevice
			this.switcherDevices[switcher.device_id].remote = switcher.remote
			setListeners.bind(this)(switcherDevice, switcher)
		}

		if (switcher.device_key && switcher.device_key !== this.switcherDevices[switcher.device_id].switcher.device_key)
			this.switcherDevices[switcher.device_id].switcher.update_device_key(switcher.device_key)

	} else {

		const deviceConfig = this.devices.find(device => device.identifier && [switcher.device_id, switcher.device_ip, switcher.name].includes(device.identifier))

		if (deviceConfig && deviceConfig.hide)
			return // ignoring hidden devices

		this.log.easyDebug(`Received a message from New Device!!`)
		this.log.easyDebug(switcher)
		this.log(`Found New Switcher "${switcher.name}" | ID:${switcher.device_id} | IP: ${switcher.device_ip} | Model: ${switcher.type.toUpperCase()}`)
	

		// define types for valve accessory
		const boilerTypes = ['v2_qca', 'v2_esp', 'v3', 'v4', 'mini', 'on_wall']

		let type = null
		if (switcher.type.includes('runner'))
			type = 'blinds'
		else if (switcher.type === 's11' || switcher.type === 's12')
			type = 'mixed'
		else if (/^sl(mini)?0\d$/.test(switcher.type))
			type = 'lights'
		else if (switcher.type === 'breeze')
			type = 'heatercooler'
		else if (deviceConfig && deviceConfig.accessoryType)
			type = deviceConfig.accessoryType.toLowerCase()
		else  if (switcher.type === 'power_plug')
			type = 'outlet'
		else  if (switcher.type === 'heater')
			type = 'switch'
		else  if (boilerTypes.includes(switcher.type))
			type = 'valve'

		if (!type) return

		const switcherDevice = new Switcher(switcher.device_id, switcher.device_ip, this.log.easyDebug, false, switcher.type, switcher.remote, this.token, switcher.device_key)

		setListeners.bind(this)(switcherDevice, switcher)

		switch (type) {
			case 'mixed':
				this.log(`Initializing Mixed Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new MixedAccessory(switcherDevice, switcher, this)
				break;
			case 'lights':
				this.log(`Initializing Lights Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new LightsAccessory(switcherDevice, switcher, this)
				break;
			case 'valve':
				this.log(`Initializing Valve Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new ValveAccessory(switcherDevice, switcher, this)
				break;
			case 'outlet':
				this.log(`Initializing Outlet Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new OutletAccessory(switcherDevice, switcher, this)
				break;
			case 'blinds':
				this.log(`Initializing Window Covering Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new WindowCoveringAccessory(switcherDevice, switcher, this)
				break;
			case 'heatercooler':
				this.log(`Initializing Heater Cooler Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new HeaterCooler(switcherDevice, switcher, this)
				break;
			case 'switch':
				this.log(`Initializing Switch Accessory - ${switcher.name}(id: ${switcher.device_id})`)
				this.switcherDevices[switcher.device_id] = new SwitchAccessory(switcherDevice, switcher, this)
				break;
		}

		// HANDLE CUSTOM TIMERS
		const customTimers = this.customTimers.filter(timer => timer.identifier && [switcher.device_id, switcher.device_ip, switcher.name].includes(timer.identifier))

		const durations = customTimers.map(timer => {
			if (!timer.shutdownMinutes)
				return

			switcher.duration = timer.shutdownMinutes
			this.log(`Initializing Custom Timer (Switch) Accessory (${switcher.duration} min) - ${switcher.name}(id: ${switcher.device_id})`)
			new TimerAccessory(switcherDevice, switcher, this)
			return switcher.duration
		})

		this.accessories.forEach(accessory => {
			if (accessory.context.deviceId === switcher.device_id && accessory.context.type === 'Timer' && !durations.includes(accessory.context.duration)) {
				// unregistering accessory
				this.log(`Unregistering removed timer: "${accessory.name}"`)
				this.api.unregisterPlatformAccessories(this.PLUGIN_NAME, this.PLATFORM_NAME, [accessory])
			}
		});

	}
}

const setListeners = function(switcher, info) {
	const runtime = this._switcherRuntime
	let timer = null, refreshing = false
	const current = () => !runtime.stopped && this.switcherDevices[switcher.device_id]?.switcher === switcher
	const onState = (power) => {
		if (!current() || refreshing) return
		this.log.easyDebug(`${info.name} Power Changed to ${power}`)
		clearTimeout(timer)
		timer = setTimeout(() => {
			timer = null
			if (!current()) return
			refreshing = true
			Promise.resolve().then(() => { if (current()) return switcher.status() }).then(state => {
				if (state && current()) this.switcherDevices[switcher.device_id].updateState(state)
			}).catch(error => this.log.easyDebug(error)).finally(() => { refreshing = false })
		}, 1000)
	}
	const onPosition = pos => this.log.easyDebug(`${info.name} Position Changed to ${pos}`)
	const onError = error => { this.log(`ERROR for ${info.name}`); this.log(error) }
	switcher.on('state', onState)
	switcher.on('position', onPosition)
	switcher.on('error', onError)
	runtime.clients.set(switcher, () => {
		clearTimeout(timer)
		switcher.removeListener('state', onState)
		switcher.removeListener('position', onPosition)
		switcher.removeListener('error', onError)
		switcher.on('error', ignoreClosedError)
		closeClient(switcher, this.log)
		runtime.clients.delete(switcher)
	})
}
