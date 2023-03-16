const stateManager = require('../lib/stateManager')

const Extras = function(service) {
	const Characteristic = this.api.hap.Characteristic
	if (this.model !== 'power_plug') {
		if (this.accessory.context.duration)
			this.duration = this.accessory.context.duration
		else 
			this.accessory.context.duration = this.duration = this.state.default_shutdown_seconds
	
	
		if (this.type !== 'Valve')
			service.addOptionalCharacteristic(EnergyCharacteristics.SetDuration)
		service.getCharacteristic(Characteristic.SetDuration)
			.setProps({
				format: Characteristic.Formats.UINT32,
				maxValue: 86340,
				minValue: 0,
				minStep: 60,
				perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
			})
			.on('get', stateManager.get.SetDuration.bind(this))
			.on('set', stateManager.set.SetDuration.bind(this))
	
		if (this.type !== 'Valve')
			service.addOptionalCharacteristic(EnergyCharacteristics.RemainingDuration)
		service.getCharacteristic(Characteristic.RemainingDuration)
			.setProps({
				maxValue: 86340,
				minValue: 0,
				minStep: 1
			})
			.on('get', stateManager.get.RemainingDuration.bind(this))

	}

	const EnergyCharacteristics = require('../lib/EnergyCharacteristics')(Characteristic)

	service.addOptionalCharacteristic(EnergyCharacteristics.Volts)
	service.getCharacteristic(EnergyCharacteristics.Volts)
		.on('get', stateManager.get.Volts.bind(this))

	service.addOptionalCharacteristic(EnergyCharacteristics.Amperes)
	service.getCharacteristic(EnergyCharacteristics.Amperes)
		.on('get', stateManager.get.Amperes.bind(this))
	
	service.addOptionalCharacteristic(EnergyCharacteristics.Watts)
	service.getCharacteristic(EnergyCharacteristics.Watts)
		.on('get', stateManager.get.Watts.bind(this))

	service.addOptionalCharacteristic(EnergyCharacteristics.KilowattHours)
	service.getCharacteristic(EnergyCharacteristics.KilowattHours)
		.on('get', stateManager.get.KilowattHours.bind(this))
	
	service.addOptionalCharacteristic(EnergyCharacteristics.ResetTotal)
	service.getCharacteristic(EnergyCharacteristics.ResetTotal)
		.on('get', stateManager.get.ResetTotal.bind(this))
		.on('set', stateManager.set.ResetTotal.bind(this))

	return  { 
		updateHomeKit: () => {
			if (this.model !== 'power_plug') {
				service.getCharacteristic(Characteristic.RemainingDuration).updateValue(this.state.remaining_seconds)
			}
			service.getCharacteristic(EnergyCharacteristics.Watts).getValue(null)
			service.getCharacteristic(EnergyCharacteristics.Volts).getValue(null)
			service.getCharacteristic(EnergyCharacteristics.Amperes).getValue(null)
			service.getCharacteristic(EnergyCharacteristics.KilowattHours).getValue(null)

			const timeSinceLastState = new Date() - this.lastStateTime
			this.lastStateTime = new Date()
			if (this.loggingService.isHistoryLoaded()) {
				const extraPersistedData = this.loggingService.getExtraPersistedData()
				if (extraPersistedData != undefined) {
					this.totalEnergy = extraPersistedData.totalEnergy + this.totalEnergyTemp + this.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
					this.loggingService.setExtraPersistedData({ totalEnergy: this.totalEnergy, lastReset: extraPersistedData.lastReset })
				}
				else {
					this.totalEnergy = this.totalEnergyTemp + this.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
					this.loggingService.setExtraPersistedData({ totalEnergy: this.totalEnergy, lastReset: 0 })
				}
				this.totalEnergyTemp = 0
	
			} else {
				this.totalEnergyTemp = this.totalEnergyTemp + this.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
				this.totalEnergy = this.totalEnergyTemp
			}
	
			
			this.loggingService.addEntry({time: Math.floor((new Date()).getTime()/1000), power: this.state.power_consumption, status: !!this.state.power})

		}
	}
}


module.exports = Extras