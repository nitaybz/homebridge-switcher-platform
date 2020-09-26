let log, Characteristic, device

const Extras = (service, accessory, switcher) => {
	device = switcher
	Characteristic = accessory.api.hap.Characteristic
	log = accessory.log
	accessory.totalEnergy = 0
	accessory.totalEnergyTemp = 0
	accessory.lastReset = 0
	accessory.lastStateTime = new Date()

	const EnergyCharacteristics = require('../lib/EnergyCharacteristics')(Characteristic)

	
	service.getCharacteristic(Characteristic.SetDuration)
		.setProps({
			format: Characteristic.Formats.UINT32,
			maxValue: 86340,
			minValue: 3600,
			minStep: 60,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		})
		.on('get', getDuration)
		.on('set', setDuration)

	service.getCharacteristic(Characteristic.RemainingDuration)
		.setProps({
			maxValue: 86340,
			minValue: 0,
			minStep: 1
		})
		.on('get', getRemainingDuration)


	service.getCharacteristic(EnergyCharacteristics.Volts)
		.on('get', getVolts)

	service.getCharacteristic(EnergyCharacteristics.Amperes)
		.on('get', getAmperes)

	service.getCharacteristic(EnergyCharacteristics.Watts)
		.on('get', getWatts)



	if (accessory.loggingService) {

		service.getCharacteristic(EnergyCharacteristics.KilowattHours)
			.on('get', (callback) => {
				const extraPersistedData = accessory.loggingService.getExtraPersistedData()
				if (extraPersistedData != undefined)
					accessory.totalEnergy = extraPersistedData.totalEnergy
				log.easyDebug("Total Consumption: " + accessory.totalEnergy)
				callback(null, accessory.totalEnergy)
			})

		service.getCharacteristic(EnergyCharacteristics.ResetTotal)
			.on('set', (value, callback) => {
				accessory.totalEnergy = 0
				accessory.lastReset = value
				accessory.loggingService.setExtraPersistedData({ totalEnergy: accessory.totalEnergy, lastReset: accessory.lastReset })
				callback(null)
			})
			.on('get', (callback) => {
				const extraPersistedData = accessory.loggingService.getExtraPersistedData()
				if (extraPersistedData != undefined)
					accessory.lastReset = extraPersistedData.lastReset
				callback(null, accessory.lastReset)
			})
	}

	return  { 
		updateHomeKit: () => {
			service.getCharacteristic(Characteristic.RemainingDuration).updateValue(device.switcher.state.remaining_seconds)
			service.getCharacteristic(Characteristic.SetDuration).updateValue(device.switcher.state.default_shutdown_seconds)
			service.getCharacteristic(EnergyCharacteristics.Watts).getValue(null)
			service.getCharacteristic(EnergyCharacteristics.Volts).getValue(null)
			service.getCharacteristic(EnergyCharacteristics.Amperes).getValue(null)
			if (accessory.loggingService) {
				service.getCharacteristic(EnergyCharacteristics.KilowattHours).getValue(null)

				const timeSinceLastState = new Date() - accessory.lastStateTime
				accessory.lastStateTime = new Date()
				if (accessory.loggingService.isHistoryLoaded()) {
					const extraPersistedData = accessory.loggingService.getExtraPersistedData()
					if (extraPersistedData != undefined) {
						accessory.totalEnergy = extraPersistedData.totalEnergy + accessory.totalEnergyTemp + device.switcher.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
						accessory.loggingService.setExtraPersistedData({ totalEnergy: accessory.totalEnergy, lastReset: extraPersistedData.lastReset })
					}
					else {
						accessory.totalEnergy = accessory.totalEnergyTemp + device.switcher.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
						accessory.loggingService.setExtraPersistedData({ totalEnergy: accessory.totalEnergy, lastReset: 0 })
					}
					accessory.totalEnergyTemp = 0
		
				} else {
					accessory.totalEnergyTemp = accessory.totalEnergyTemp + device.switcher.state.power_consumption * (timeSinceLastState / 1000) / 3600 / 1000
					accessory.totalEnergy = accessory.totalEnergyTemp
				}
		
				
				accessory.loggingService.addEntry({time: Math.floor((new Date()).getTime()/1000), power: device.switcher.state.power_consumption})
			}
		}
	}
}


module.exports = Extras

const getVolts = (callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}
	const volts = device.switcher.state.state ? 220 : 0
	callback(null, volts)
}

const getAmperes = (callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}
	const amperes = Number(Math.round(device.switcher.state.power_consumption/220 + "e1") + "e-1")
	callback(null, amperes)
}

const getWatts = (callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}
	const watts = device.switcher.state.power_consumption
	callback(null, watts)
}

const getDuration = (callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}
	const duration = device.switcher.state.default_shutdown_seconds
	log.easyDebug("Auto Shutdown in Seconds:" + duration)
	callback(null, duration)
}

const getRemainingDuration = (callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}
	const duration = device.switcher.state.remaining_seconds
	log.easyDebug("Remaining duration in Seconds:" + duration)
	callback(null, duration)
}

const setDuration = (seconds, callback) => {
	if (!device.switcher) {
		callback('switcher has yet to connect')
		return
	}

	const hours = Math.floor(seconds / 60 / 60)
	const minutes = Math.floor(seconds / 60) % 60
	const formattedTime = hours + ':' + ('0' + minutes).slice(-2)

	log("Setting new \"Auto Shutdown\" time - " + formattedTime)
	device.switcher.set_default_shutdown(seconds)
	callback()
}