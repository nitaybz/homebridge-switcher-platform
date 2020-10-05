let Characteristic, Service
const stateManager = require('../lib/stateManager')
const addExtras = require('./extras')

class Valve {
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
		this.type = 'Valve'
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

		
		this.addValveService()
		this.extras = addExtras.bind(this)(this.ValveService)
	}

	addValveService() {
		this.log.easyDebug(`Adding Valve service for "${this.name}"`)
		this.ValveService = this.accessory.getService(Service.Valve)
		if (!this.ValveService)
			this.ValveService = this.accessory.addService(Service.Valve, this.name, this.type)

		this.ValveService.getCharacteristic(Characteristic.ValveType)
			.updateValue(2)
				
		this.ValveService.getCharacteristic(Characteristic.Active)
			.on('get', stateManager.get.Active.bind(this))
			.on('set', stateManager.set.On.bind(this))
	
		this.ValveService.getCharacteristic(Characteristic.InUse)
			.on('get', stateManager.get.InUse.bind(this))
	}

	removeOtherTypes() {

		// remove switch service
		const SwitchService = this.accessory.getService(Service.Switch)
		if (SwitchService) {
			this.log.easyDebug(`Removing Switch Service from ${this.name}`)
			this.accessory.removeService(SwitchService)
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
		this.ValveService.getCharacteristic(Characteristic.Active).updateValue(this.state.power)
		this.ValveService.getCharacteristic(Characteristic.InUse).updateValue(this.state.power)
		this.extras.updateHomeKit()
	}
}


module.exports = Valve