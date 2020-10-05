const Switcher = require('switcher-js2')
const OutletAccessory = require('../accessories/Outlet')
const ValveAccessory = require('../accessories/Valve')
const SwitchAccessory = require('../accessories/Switch')

module.exports = {
	init: function() {
		if (this.secondsToRemove)
			setTimeout(checkIfAllDevicesFound.bind(this), this.secondsToRemove * 1000)

		this.log.easyDebug(`Scanning for switcher devices messages...`)
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
		else {
			// unregistering accessory
			this.log(`Unregistering disconnected device: "${accessory.name}" | ID:${accessory.context.deviceId} | IP: ${accessory.context.ip} `)
			this.api.unregisterPlatformAccessories('homebridge-switcher-boiler', 'SwitcherBoiler', [accessory])
		}

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
		this.log(`Found New Switcher "${switcher.name}" | ID:${switcher.device_id} | IP: ${switcher.device_ip}`)
	

		const switcherDevice = new Switcher(switcher.device_id, switcher.device_ip, this.log.easyDebug)

		setListeners.bind(this)(switcherDevice, switcher)

		let type = 'switch'
		if (deviceConfig && deviceConfig.accessoryType)
			type = deviceConfig.accessoryType.toLowerCase()
		else  if (this.accessoryType)
			type = this.accessoryType.toLowerCase()

		switch (type) {
			case 'valve':
				this.log(`Initializing Valve Accessory`)
				this.switcherDevices[switcher.device_id] = new ValveAccessory(switcherDevice, switcher, this)
				break;
			case 'outlet':
				this.log(`Initializing Outlet Accessory`)
				this.switcherDevices[switcher.device_id] = new OutletAccessory(switcherDevice, switcher, this)
				break;
			default:
				this.log(`Initializing Switch Accessory`)
				this.switcherDevices[switcher.device_id] = new SwitchAccessory(switcherDevice, switcher, this)
				break;
		}
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
	
	switcher.on('error', (error) => {
		this.log(`ERROR for ${info.name}`)
		this.log(error)
	})
}