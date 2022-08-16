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
		this.type = 'WindowCovering'
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

		
		this.addWindowCoveringService()
	}

	addWindowCoveringService() {
		this.log.easyDebug(`Adding WindowCovering service for "${this.name}"`)
		this.WindowCoveringService = this.accessory.getService(Service.WindowCovering)
		if (!this.WindowCoveringService)
			this.WindowCoveringService = this.accessory.addService(Service.WindowCovering, this.name, this.type)

		this.WindowCoveringService.getCharacteristic(Characteristic.CurrentPosition)
			.on('get', stateManager.get.CurrentPosition.bind(this))
			.updateValue(this.state.position)

		this.WindowCoveringService.getCharacteristic(Characteristic.PositionState)
			.on('get', stateManager.get.PositionState.bind(this))
			.updateValue(this.state.direction === 'DOWN' ? 0 : this.state.direction === 'UP' ? 1 : 2)

		this.WindowCoveringService.getCharacteristic(Characteristic.TargetPosition)
			.on('set', stateManager.set.TargetPosition.bind(this, Characteristic))
			.updateValue(this.state.position)

		this.WindowCoveringService.getCharacteristic(Characteristic.HoldPosition)
			.on('set', stateManager.set.HoldPosition.bind(this))

		this.WindowCoveringService.addOptionalCharacteristic(Characteristic.LockPhysicalControls)

		this.WindowCoveringService.getCharacteristic(Characteristic.LockPhysicalControls)
			.on('set', stateManager.set.ChildLock.bind(this))
			.updateValue(this.state.child_lock === 'ON' ? 1 : 0)

	}

	updateState(state) {
		this.state = state
		const targetPositionValue = this.WindowCoveringService.getCharacteristic(Characteristic.TargetPosition).value
		switch (this.state.direction) {
			case 'DOWN':
				this.WindowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(0)
				this.WindowCoveringService.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state.position)
				if (targetPositionValue >= this.state.position)
					this.WindowCoveringService.getCharacteristic(Characteristic.TargetPosition).updateValue(0)
				break;
			case 'UP':
				this.WindowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(1)
				this.WindowCoveringService.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state.position)
				if (targetPositionValue <= this.state.position)
					this.WindowCoveringService.getCharacteristic(Characteristic.TargetPosition).updateValue(100)
				break;
			case 'STOP':
				this.WindowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(2)
				this.WindowCoveringService.getCharacteristic(Characteristic.CurrentPosition).updateValue(this.state.position)
				this.WindowCoveringService.getCharacteristic(Characteristic.TargetPosition).updateValue(this.state.position)
				break;
		}
		this.WindowCoveringService.getCharacteristic(Characteristic.LockPhysicalControls).updateValue(this.state.child_lock === 'ON' ? 1 : 0)
	}
}


module.exports = WindowCovering