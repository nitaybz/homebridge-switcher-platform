let Characteristic, Service
const stateManager = require('../lib/stateManager')

class HeaterCooler {
	constructor(switcher, switcherInfo, platform) {
		Service = platform.api.hap.Service
		Characteristic = platform.api.hap.Characteristic
		
		this.switcher = switcher
		this.log = platform.log
		this.api = platform.api
		this.id = switcherInfo.device_id
		this.ip = switcherInfo.device_ip
		this.remote = switcherInfo.remote
		this.name = switcherInfo.name
		this.serial = this.id
		this.model = switcherInfo.type
		this.manufacturer = 'Switcher'
		this.type = 'HeaterCooler'
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
			this.accessory.context.remote = this.remote

			platform.accessories.push(this.accessory)
			// register the accessory
			this.api.registerPlatformAccessories(platform.PLUGIN_NAME, platform.PLATFORM_NAME, [this.accessory])
		} else {
			this.log(`Switcher "${this.name}" (${this.id}) is Connected!`)
			this.accessory.context.type = this.type
		}

		this.accessory.context.ip = this.ip

		let informationService = this.accessory.getService(Service.AccessoryInformation)

		if (!informationService)
			informationService = this.accessory.addService(Service.AccessoryInformation)

		informationService
			.setCharacteristic(Characteristic.Manufacturer, this.manufacturer)
			.setCharacteristic(Characteristic.Model, this.model)
			.setCharacteristic(Characteristic.SerialNumber, this.serial)

		
		if (this.switcher.breeze_remote)
			this.addHeaterCoolerService(this.switcher.breeze_remote)
		else {
			switcher.on('capabilities', this.addHeaterCoolerService.bind(this));
		}
	}

	addHeaterCoolerService(remote) {
		this.capabilities = remote
		this.log.easyDebug(`Adding HeaterCooler service for "${this.name}"`)
		this.HeaterCoolerService = this.accessory.getService(Service.HeaterCooler)
		if (!this.HeaterCoolerService)
			this.HeaterCoolerService = this.accessory.addService(Service.HeaterCooler, this.name, this.type)

		this.HeaterCoolerService.getCharacteristic(Characteristic.Active)
			.on('set', stateManager.set.ACActive.bind(this))

		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState)

		const props = []

		if (this.capabilities.modes.includes('COOL')) props.push(Characteristic.TargetHeaterCoolerState.COOL)
		if (this.capabilities.modes.includes('HEAT')) props.push(Characteristic.TargetHeaterCoolerState.HEAT)
		if (this.capabilities.modes.includes('AUTO')) props.push(Characteristic.TargetHeaterCoolerState.AUTO)

		this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState)
			.setProps({validValues: props})
			.on('set', stateManager.set.TargetHeaterCoolerState.bind(this))


		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature)
			.setProps({
				minValue: -100,
				maxValue: 100,
				minStep: 0.1
			})

		this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature)
			.setProps({
				minValue: this.capabilities['min_temp'],
				maxValue: this.capabilities['max_temp'],
				minStep: 1
			})
			.on('set', stateManager.set.CoolingThresholdTemperature.bind(this))

		this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature)
			.setProps({
				minValue: this.capabilities['min_temp'],
				maxValue: this.capabilities['max_temp'],
				minStep: 1
			})
			.on('set', stateManager.set.HeatingThresholdTemperature.bind(this))

		if ((this.capabilities.swing)) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.SwingMode)
				.on('set', stateManager.set.ACSwing.bind(this))
		}

		if (this.capabilities['fan_levels'] && this.capabilities['fan_levels'].length) {
			this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed)
				.on('set', stateManager.set.ACRotationSpeed.bind(this))
		}

		this.updateState(this.state)

	}

	updateState(state) {
		this.state = state

		if (!this.HeaterCoolerService)
			return
			
		this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentTemperature).updateValue(this.state['current_temp'])
		
		// if status is OFF, set all services to INACTIVE
		if (this.state.power === 'OFF') {
			this.HeaterCoolerService.getCharacteristic(Characteristic.Active).updateValue(0)
			this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(0)
			return
		}

		switch (this.state.mode) {
			case 'COOL':
			case 'HEAT':
			case 'AUTO':

				// turn on HeaterCoolerService
				this.HeaterCoolerService.getCharacteristic(Characteristic.Active).updateValue(1)

				// update temperatures for HeaterCoolerService
				this.HeaterCoolerService.getCharacteristic(Characteristic.HeatingThresholdTemperature).updateValue(this.state['target_temp'])
				this.HeaterCoolerService.getCharacteristic(Characteristic.CoolingThresholdTemperature).updateValue(this.state['target_temp'])

				// update swing for HeaterCoolerService
				if (this.capabilities.swing)
					this.HeaterCoolerService.getCharacteristic(Characteristic.SwingMode).updateValue(this.state.swing === 'ON' ? 1 : 0)

				// update fanSpeed for HeaterCoolerService
				if (this.capabilities['fan_levels'] && this.capabilities['fan_levels'].length) {
					switch (this.state['fan_level']) {
						case 'LOW':
							this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed).updateValue(33)
							break
						case 'MEDIUM':
							this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed).updateValue(66)
							break
						case 'HIGH':
							this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed).updateValue(100)
							break
						default:
							this.HeaterCoolerService.getCharacteristic(Characteristic.RotationSpeed).updateValue(0)
							break
					}
				}

				// set proper target and current state of HeaterCoolerService
				if (this.state.mode === 'COOL') {
					this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(Characteristic.TargetHeaterCoolerState.COOL)
					this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.COOLING)
				} else if (this.state.mode === 'HEAT') {
					this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(Characteristic.TargetHeaterCoolerState.HEAT)
					this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.HEATING)
				} else if (this.state.mode === 'AUTO') {
					this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(Characteristic.TargetHeaterCoolerState.AUTO)
					if (this.state['current_temp'] > this.state['target_temp'])
						this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.COOLING)
					else
						this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.HEATING)
				}
				break
			case 'FAN':
				// act like AUTO but with IDLE
				this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(Characteristic.TargetHeaterCoolerState.AUTO)
				this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.IDLE)
				break
			case 'DRY':
				// act like AUTO
				this.HeaterCoolerService.getCharacteristic(Characteristic.TargetHeaterCoolerState).updateValue(Characteristic.TargetHeaterCoolerState.AUTO)
				this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.IDLE)
				if (this.state['current_temp'] > this.state['target_temp'])
					this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.COOLING)
				else
					this.HeaterCoolerService.getCharacteristic(Characteristic.CurrentHeaterCoolerState).updateValue(Characteristic.CurrentHeaterCoolerState.HEATING)
				break
		}
	}
}


module.exports = HeaterCooler