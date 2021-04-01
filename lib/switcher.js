const Switcher = require('switcher-js2')
const OutletAccessory = require('../accessories/Outlet')
const ValveAccessory = require('../accessories/Valve')
const SwitchAccessory = require('../accessories/Switch')
const WindowCoveringAccessory = require('../accessories/WindowCovering')
const TimerAccessory = require('../accessories/Timer')

module.exports = {
	init: function() {
		if (this.secondsToRemove)
			setTimeout(checkIfAllDevicesFound.bind(this), this.secondsToRemove * 1000)

		this.log.easyDebug(`Scanning for switcher devices...`)
		let proxy = Switcher.listen(this.log.easyDebug)
		proxy.on('message', messageHandler.bind(this))


		proxy.on('error', (err) => {
			this.log('ERROR OCCURRED !! Connection Closed...')
			this.log.easyDebug(err)
			this.log('trying to reconnect in 10 seconds...')

			// Try reconnecting here
			setTimeout(() => {
				proxy = Switcher.listen(this.log.easyDebug)
			}, 10000)
		})
	}
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
		this.log.easyDebug(`Received a message from ${switcher.device_ip}`)
		this.log.easyDebug(switcher)
		if (!this.switcherDevices[switcher.device_id].processing)
			this.switcherDevices[switcher.device_id].updateState(switcher.state)
	} else {

		const deviceConfig = this.devices.find(device => device.identifier && [switcher.device_id, switcher.device_ip, switcher.name].includes(device.identifier))

		if (deviceConfig && deviceConfig.hide)
			return // ignoring hidden devices

		this.log.easyDebug(`Received a message from New Device!!`)
		this.log.easyDebug(switcher)
		this.log(`Found New Switcher "${switcher.name}" | ID:${switcher.device_id} | IP: ${switcher.device_ip} | Model: ${switcher.type.toUpperCase()}`)
	

		const switcherDevice = new Switcher(switcher.device_id, switcher.device_ip, this.log.easyDebug, false, switcher.type)

		setListeners.bind(this)(switcherDevice, switcher)

		let type = 'switch'
		if (switcher.type.includes('runner'))
			type = 'blinds'
		else if (deviceConfig && deviceConfig.accessoryType)
			type = deviceConfig.accessoryType.toLowerCase()
		else  if (switcher.type === 'power_plug')
			type = 'outlet'

		switch (type) {
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
			default:
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
	
	switcher.on('state', (power) => {
		this.log.easyDebug(`${info.name} Power Changed to ${power}`)
		setTimeout(() => {
			switcher.status(state => {
				this.switcherDevices[switcher.device_id].updateState(state)
			})

		}, 1000)
	})

	switcher.on('position', (pos) => {
		this.log.easyDebug(`${info.name} Position Changed to ${pos}`)
		// setTimeout(() => {
		// 	switcher.status(state => {
		// 		this.switcherDevices[switcher.device_id].updateState(state)
		// 	})

		// }, 1000)
	})
	
	switcher.on('error', (error) => {
		this.log(`ERROR for ${info.name}`)
		this.log(error)
	})
}