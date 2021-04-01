let Characteristic, Service
const stateManager = require('../lib/stateManager')
const addExtras = require('./extras')

class Outlet {
	constructor(switcher, switcherInfo, platform) {

		const FakeGatoHistoryService = require("fakegato-history")(platform.api)

		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		
		this.switcher = switcher
		this.log = platform.log
		this.api = platform.api
		this.id = switcherInfo.device_id
		this.ip = switcherInfo.device_ip
		this.name = switcherInfo.name
		this.serial = this.id
		this.model = switcherInfo.type
		this.manufacturer = 'Switcher'
		this.type = 'Outlet'
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


		// ~~~~~~~~ power consumption history variables ~~~~~~~~
		this.loggingService = new FakeGatoHistoryService('energy', this.accessory, { storage: 'fs', path: this.api.user.persistPath() + '/../switcher-persist', disableTimer:true  })
		this.totalEnergy = 0
		this.totalEnergyTemp = 0
		this.lastReset = 0
		this.lastStateTime = new Date()
		// ~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~~

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		this.addOutletService()
		this.extras = addExtras.bind(this)(this.OutletService)
	}

	addOutletService() {
		this.log.easyDebug(`Adding Outlet service for "${this.name}"`)
		this.OutletService = this.accessory.getService(Service.Outlet)
		if (!this.OutletService)
			this.OutletService = this.accessory.addService(Service.Outlet, this.name, this.type)


		this.OutletService.getCharacteristic(Characteristic.On)
			.on('get', stateManager.get.On.bind(this))
			.on('set', stateManager.set.On.bind(this))


		this.OutletService.getCharacteristic(Characteristic.OutletInUse)
			.on('get', stateManager.get.OutletInUse.bind(this))
	}

	removeOtherTypes() {

		// remove valve service
		const ValveService = this.accessory.getService(Service.Valve)
		if (ValveService) {
			this.log.easyDebug(`Removing Valve Service from ${this.name}`)
			this.accessory.removeService(ValveService)
		}

		// remove switch service
		const SwitchService = this.accessory.getService(Service.Switch)
		if (SwitchService) {
			this.log.easyDebug(`Removing Switch Service from ${this.name}`)
			this.accessory.removeService(SwitchService)
		}
	}

	updateState(state) {
		this.state = state
		this.OutletService.getCharacteristic(Characteristic.On).updateValue(!!this.state.power)
		this.OutletService.getCharacteristic(Characteristic.OutletInUse).updateValue(this.state.power_consumption > 0)
		this.extras.updateHomeKit()
	}
}


module.exports = Outlet