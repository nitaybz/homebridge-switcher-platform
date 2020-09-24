
const OutletService = require('./accessories/Outlet');
const ValveService = require('./accessories/Valve');
const SwitchService = require('./accessories/Switch');
let FakeGatoHistoryService

module.exports = (api) => {
	FakeGatoHistoryService = require("fakegato-history")(api)
	api.registerAccessory('SwitcherBoiler', SwitcherBoiler);
}

class SwitcherBoiler {

	constructor(log, config, api) {
		this.api = api;
		this.log = log
		this.name = config['name'] || 'Switcher'
		this.deviceId = config['deviceId']
		this.ip = config['ip']
		this.deviceName = config['deviceName']
		this.discoveryTimeout = config['discoveryTimeout'] || 20
		this.displayName = this.name
		this.accessoryType = config['accessoryType'] || 'switch'
		this.debug = config['debug'] || false
		this.persistPath = this.api.user.persistPath() + '/../switcher-persist'
		this.uuid = this.api.hap.uuid.generate(this.name)

		this.log.debug = () => {
			if (this.debug)
				this.log(...arguments)
		}

		this.accessoryType = this.accessoryType.toLowerCase()
		if (this.accessoryType !== 'switch' && this.accessoryType !== 'outlet' && this.accessoryType !== 'valve')
			this.log('Accessory Type is Wrong ---> Using "Switch" service')

		// your accessory must have an AccessoryInformation service
		this.informationService = new this.api.hap.Service.AccessoryInformation()
			.setCharacteristic(this.api.hap.Characteristic.Manufacturer, "Switcher")
			.setCharacteristic(this.api.hap.Characteristic.Model, "switcher-boiler")
			.setCharacteristic(this.api.hap.Characteristic.SerialNumber, this.uuid)

		switch(this.accessoryType) {
			case 'outlet':
				this.mainService = OutletService(this)
				this.loggingService = new FakeGatoHistoryService('energy', this, { storage: 'fs', path: this.persistPath, disableTimer:true  })
				break
			case 'valve':
				this.mainService = ValveService(this)
				break
			default:
				this.mainService = SwitchService(this)
				break
		}


		this.services = [this.informationService, this.mainService]

		if (this.loggingService)
			this.services.push(this.loggingService)


	}

	getServices() {
		return this.services
	}
}