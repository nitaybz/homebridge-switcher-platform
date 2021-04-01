let Characteristic, Service
const stateManager = require('../lib/stateManager')

class Timer {
	constructor(switcher, switcherInfo, platform) {

		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		
		this.switcher = switcher
		this.log = platform.log
		this.api = platform.api
		this.id =  `${switcherInfo.device_id}_${switcherInfo.duration}m`
		this.ip = switcherInfo.device_ip
		this.name = `${switcherInfo.name} for ${switcherInfo.duration} Minutes`
		this.serial = this.id
		this.model = switcherInfo.type
		this.manufacturer = '@nitaybz'
		this.type = 'Timer'
		this.displayName = this.name
		this.duration = switcherInfo.duration
		
		this.UUID = this.api.hap.uuid.generate(this.id)
		this.accessory = platform.accessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New ${this.type} Accessory: "${this.name}"`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.duration = this.duration
			this.accessory.context.deviceId = switcherInfo.device_id

			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		}

		this.accessory.context.ip = this.ip

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addSwitchService()
	}

	addSwitchService() {
		this.log.easyDebug(`Adding Switch service for "${this.name}"`)
		this.SwitchService = this.accessory.getService(Service.Switch)
		if (!this.SwitchService)
			this.SwitchService = this.accessory.addService(Service.Switch, this.name, this.type)


		this.SwitchService.getCharacteristic(Characteristic.On)
			.on('get', callback => {callback(null, false)})
			.on('set', stateManager.set.Timer.bind(this, Characteristic))
	}
}


module.exports = Timer