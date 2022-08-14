let Characteristic, Service
const stateManager = require('../lib/stateManager')

class WindowCovering {
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
		this.model = switcherInfo.type
		this.manufacturer = 'Switcher'
		this.type = 'Mixed'
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

		
		this.addSwitchService(1)
		if (this.model === 's11') 
			this.addSwitchService(2)	
		else if (this.model === 's12')
			this.addWindowCoveringService(2)
		this.addWindowCoveringService(3)
	}


	addSwitchService(index) {
		this.log.easyDebug(`Adding Switch ${index} service for "${this.name}"`)
		this[`SwitchService${index}`] = this.accessory.getService(`Light${index}`)
		if (!this[`SwitchService${index}`])
			this[`SwitchService${index}`] = this.accessory.addService(Service.Switch, `Light${index}`, `Light${index}`)


		this[`SwitchService${index}`].getCharacteristic(Characteristic.On)
			.on('set', stateManager.set.MixedOn.bind(this, index))
			.updateValue(this.state[`light${index}_power`] === 'ON')
			
	}

	addWindowCoveringService(index) {
		this.log.easyDebug(`Adding WindowCovering ${index} service for "${this.name}"`)
		this[`WindowCoveringService${index}`] = this.accessory.getService(`Runner${index}`)
		if (!this[`WindowCoveringService${index}`])
			this[`WindowCoveringService${index}`] = this.accessory.addService(Service.WindowCovering, `Runner${index}`, `Runner${index}`)

		this[`WindowCoveringService${index}`].getCharacteristic(Characteristic.CurrentPosition)
			.updateValue(this.state[`runner${index}_position`])

		this[`WindowCoveringService${index}`].getCharacteristic(Characteristic.PositionState)
			.updateValue(this.state[`runner${index}_direction`] === 'DOWN' ? 0 : [`runner${index}_direction`] === 'UP' ? 1 : 2)

		this[`WindowCoveringService${index}`].getCharacteristic(Characteristic.TargetPosition)
			.on('set', stateManager.set.MixedTargetPosition.bind(this, Characteristic, index))
			.updateValue(this.state[`runner${index}_position`])
	}

	updateState(state) {
		this.state = state

		for (let i = 1; i < 4; i++) {
			if (this.state[`light${i}_power`])
				this[`SwitchService${i}`].getCharacteristic(Characteristic.On)
					.updateValue(this.state[`light${i}_power`] === 'ON')

			if (this.state[`runner${i}_position`] && this.state[`runner${i}_direction`]) {
				const targetPositionValue = this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.TargetPosition).value
				switch (this.state[`runner${i}_direction`]) {
					case 'DOWN':
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.PositionState).updateValue(0)
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state[`runner${i}_position`])
						if (targetPositionValue >= this.state[`runner${i}_position`])
							this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.TargetPosition).updateValue(0)
						break;
					case 'UP':
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.PositionState).updateValue(1)
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state[`runner${i}_position`])
						if (targetPositionValue <= this.state[`runner${i}_position`])
							this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.TargetPosition).updateValue(100)
						break;
					case 'STOP':
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.PositionState).updateValue(2)
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state[`runner${i}_position`])
						this[`WindowCoveringService${i}`].getCharacteristic(Characteristic.TargetPosition).updateValue(this.state[`runner${i}_position`])
						break;
				}

			}
		}
	}
}


module.exports = WindowCovering