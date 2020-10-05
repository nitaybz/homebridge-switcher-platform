let Characteristic, Service
const stateManager = require('../lib/stateManager')
const addExtras = require('./extras')

class Switch {
	constructor(switcher, switcherInfo, platform) {

		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		
		this.switcher = switcher
		this.log = platform.log
		this.api = platform.api
		this.id = switcherInfo.device_id
		this.ip = switcherInfo.device_ip
		this.name = switcherInfo.name
		this.serial = this.id
		this.model = 'switcher-boiler'
		this.manufacturer = 'Switcher'
		this.type = 'Switch'
		this.displayName = this.name
		this.state = switcherInfo.state
		this.processing = false
		
		this.UUID = this.api.hap.uuid.generate(this.id)
		this.accessory = platform.accessories.find(accessory => accessory.UUID === this.UUID)

		if (!this.accessory) {
			this.log(`Creating New Switcher  (${this.type}) Accessory: "${this.name}"`)
			this.accessory = new this.api.platformAccessory(this.name, this.UUID)
			this.accessory.context.type = this.type
			this.accessory.context.deviceId = this.id

			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		} else {
			this.log(`Switcher "${this.name}" (${this.id}) is Connected!`)
			if (this.type !== this.accessory.context.type) {
				this.removeOtherTypes()
				this.accessory.context.type = this.type
			}
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
		this.extras = addExtras.bind(this)(this.SwitchService)
	}

	addSwitchService() {
		this.log.easyDebug(`Adding Switch service for "${this.name}"`)
		this.SwitchService = this.accessory.getService(Service.Switch)
		if (!this.SwitchService)
			this.SwitchService = this.accessory.addService(Service.Switch, this.name, this.type)


		this.SwitchService.getCharacteristic(Characteristic.On)
			.on('get', stateManager.get.On.bind(this))
			.on('set', stateManager.set.On.bind(this))
	}

	removeOtherTypes() {

		// remove valve service
		const ValveService = this.accessory.getService(Service.Valve)
		if (ValveService) {
			this.log.easyDebug(`Removing Valve Service from ${this.name}`)
			this.accessory.removeService(ValveService)
		}

		// remove outlet service
		const OutletService = this.accessory.getService(Service.Outlet)
		if (OutletService) {
			this.log.easyDebug(`Removing Outlet Service from ${this.name}`)
			this.accessory.removeService(OutletService)
		}
	}

	updateState(state) {
		this.state = state
		this.SwitchService.getCharacteristic(Characteristic.On).updateValue(!!this.state.power)
		this.extras.updateHomeKit()
	}
}


module.exports = Switch