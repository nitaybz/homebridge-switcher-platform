const Switcher = require('switcher-js2')
const OutletAccessory = require('../accessories/Outlet')
const ValveAccessory = require('../accessories/Valve')
const SwitchAccessory = require('../accessories/Switch')

module.exports = {
	init: () => {
		if (this.secondsToRemove)
			setTimeout(checkIfAllDevicesFound.bind(this). this.seconds)

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
			this.api.unregisterthisAccessories('homebridge-switcher-boiler', 'SwitcherBoiler', [accessory])
		}

	});
}

const messageHandler = function (switcher) {
	if (switcher.device_id in this.switcherDevices) {
		this.log.easyDebug(`Received a message from ${switcher.device_ip}`)
		this.log.easyDebug(switcher)
		this.switcherDevices[switcher.device_id].updateState()
	} else {

		const deviceConfig = this.devices.find(device => 
			(device.deviceId && device.deviceId === switcher.device_id) || 
			(device.ip && device.ip === switcher.device_ip) || 
			(device.deviceName && device.deviceName === switcher.name))

		if (deviceConfig && deviceConfig.hide)
			return // ignoring hidden devices

		this.log.easyDebug(`Received a message from New Device!!`)
		this.log.easyDebug(switcher)
		this.log(`Found New Switcher "${switcher.name}" | ID:${switcher.device_id} | IP: ${switcher.device_ip}`)
	
		const type = deviceConfig ? deviceConfig.accessoryType : 'switch'
		switch (type) {
			case 'valve':
				this.log(`Initializing Valve Accessory`)
				this.switcherDevices[switcher.device_id] = new ValveAccessory(switcher, this)
				break;
			case 'outlet':
				this.log(`Initializing Outlet Accessory`)
				this.switcherDevices[switcher.device_id] = new OutletAccessory(switcher, this)
				break;
			default:
				this.log(`Initializing Switch Accessory`)
				this.switcherDevices[switcher.device_id] = new SwitchAccessory(switcher, this)
				break;
		}
	}
}