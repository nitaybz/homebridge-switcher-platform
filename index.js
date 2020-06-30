

let Service, Characteristic, HomebridgeAPI, EnergyCharacteristics, FakeGatoHistoryService, errorRepeatCounter, retryTimout
const SwitcherApi = require('./lib/api')
const storage = require('node-persist')

module.exports = function (homebridge) {
    Service = homebridge.hap.Service
	Characteristic = homebridge.hap.Characteristic
	EnergyCharacteristics = require('./lib/EnergyCharacteristics')(Characteristic)
	HomebridgeAPI = homebridge
    homebridge.registerAccessory("homebridge-switcher-boiler", "SwitcherBoiler", SwitcherBoiler)
	FakeGatoHistoryService = require("fakegato-history")(homebridge)
}

function SwitcherBoiler(log, config, api) {
    let UUIDGen = api.hap.uuid

    this.log = log
    this.name = config['name'] || 'Switcher'
    this.displayName = this.name
    this.accessoryType = config['accessoryType'] || 'switch'
	this.pollingInterval = config['pollingIntervalInSec'] !== undefined ? config['pollingIntervalInSec'] * 1000 : 30000
	this.debug = config['debug'] || false
	this.interval = null
	this.lastReset = 0
	this.totalenergy = 0
	this.totalenergytemp = 0
	this.ExtraPersistedData = {}
	this.timer = null
	this.remainingDuration = 0

	this.accessoryType = this.accessoryType.toLowerCase()
	if (this.accessoryType !== 'switch' && this.accessoryType !== 'outlet' && this.accessoryType !== 'valve')
		this.log('Accessory Type is Wrong ---> Using "Switch" service')

	this.state = {
		power: 'off',
		electricCurrentAmper: 0,
		powerConsumptionWatts: 0,
		autoShutdownMs: 5400000,
		timeLeftMs: 0
	}
	errorRepeatCounter = 0
	retryTimout = 5000
	this.uuid = UUIDGen.generate(this.name)
	this.persistPath = HomebridgeAPI.user.persistPath() + '/../switcher-persist'
	

	this.loggingService = new FakeGatoHistoryService('energy', this, { storage: 'fs', path: this.persistPath, disableTimer:true  })

	this.updateHomeKit = (newState) => {
		const isOn = (newState.power === 'on' ? 1 : 0)

		if (this.accessoryType === 'valve') {
			this.mainService.getCharacteristic(Characteristic.Active).updateValue(isOn)
			this.mainService.getCharacteristic(Characteristic.InUse).updateValue(isOn)
		} else
			this.mainService.getCharacteristic(Characteristic.On).updateValue(isOn)
			
		if (this.accessoryType === 'outlet')
			this.mainService.updateCharacteristic(Characteristic.OutletInUse, (newState.electricCurrentAmper > 0))

		this.mainService.getCharacteristic(EnergyCharacteristics.Watts).getValue(null)
		this.mainService.getCharacteristic(EnergyCharacteristics.Volts).getValue(null)
		this.mainService.getCharacteristic(EnergyCharacteristics.Amperes).getValue(null)
		this.mainService.getCharacteristic(EnergyCharacteristics.KilowattHours).getValue(null)
		this.mainService.getCharacteristic(Characteristic.RemainingDuration).updateValue(newState.timeLeftMs / 1000)
		this.mainService.getCharacteristic(Characteristic.SetDuration).updateValue(newState.autoShutdownMs / 1000)



		if (this.loggingService.isHistoryLoaded()) {
			this.ExtraPersistedData = this.loggingService.getExtraPersistedData()
			if (this.ExtraPersistedData != undefined) {
				this.totalenergy = this.ExtraPersistedData.totalenergy + this.totalenergytemp + newState.powerConsumptionWatts * (this.pollingInterval / 1000) / 3600 / 1000
				this.loggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: this.ExtraPersistedData.lastReset })
			}
			else {
				this.totalenergy = this.totalenergytemp + newState.powerConsumptionWatts * (this.pollingInterval / 1000) / 3600 / 1000
				this.loggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: 0 })
			}
			this.totalenergytemp = 0

		} else {
			this.totalenergytemp = this.totalenergytemp + newState.powerConsumptionWatts * (this.pollingInterval / 1000) / 3600 / 1000
			this.totalenergy = this.totalenergytemp
		}

		
		this.loggingService.addEntry({time: Math.floor((new Date()).getTime()/1000), power: newState.powerConsumptionWatts})

		this.state = newState
		if (this.debug) {
			this.log('Updated HomeKit with new State:')
			this.log(newState)
		}

	}

	this.refreshState = async () => {
		if (this.debug)
			this.log('Getting Switcher State (interval)')
		try {
			const newState = await SwitcherApi.getState()
			this.timer = newState.autoShutdownMs / 1000
			this.remainingDuration = newState.timeLeftMs / 1000
			if (this.debug) {
				this.log('Got Switcher State (interval): ')
				this.log(newState)
			}
			this.updateHomeKit(newState)

		} catch(err) {
			this.log('ERROR Getting State from the Switcher (interval):')
			this.log(err)
		}
	}

	this.updateState = async (callback) => {
		clearInterval(this.interval)
		this.interval = setInterval(this.refreshState, this.pollingInterval)
		let on = this.state.power === 'on' ? 1 : 0
		try {
			const newState = await SwitcherApi.getState()
			errorRepeatCounter = 0
			this.timer = newState.autoShutdownMs / 1000
			this.remainingDuration = newState.timeLeftMs / 1000
			this.log('Got Switcher State:')
			this.log(newState)
	
			on = newState.power === 'on' ? 1 : 0
			if (!this.pollingInterval) {
				this.state = newState
				if (callback)
					callback(null, on)
			} else {
				setTimeout(() => {
					this.updateHomeKit(newState)
				}, 2000)
			}
	
		} catch(err) {
			this.log('ERROR Getting State from the Switcher:')
			this.log(err)
			if (!this.pollingInterval && callback)
				callback(null, on)

			if (err.includes('Please try again') && isBelowErrorRepeatLimit()) {
				setTimeout(async () => {
					errorRepeatCounter ++
					this.log('Trying again...')
					this.updateState(callback)
				}, retryTimout)
				return
			}
		}
	}

	this.cachedConfig = null
	
	this.discoverDevices = async () => {
		try {
			await storage.init({
				dir: this.persistPath,
				forgiveParseErrors: true
			})
			this.cachedConfig = await storage.getItem('switcher_config')
		} catch(err) {
			this.log("Failed setting storage dir under 'switcher-persist':")
			this.log(err)
			this.log("Please contact the plugin creator...")
		}

		SwitcherApi.init(this.log, this.debug)
		try {
			if (this.debug)
				this.log('Discovering Switcher Device...')
			SwitcherApi.discover()
				.then(discoveredDevice => {
					if (discoveredDevice && discoveredDevice.deviceIP && discoveredDevice.deviceID) {
						errorRepeatCounter = 0
						this.log(` ~~~~~~ DISCOVERED SWITCHER DEVICE (${discoveredDevice.deviceIP}) ~~~~~~`)
						this.cachedConfig = {
							deviceIP: discoveredDevice.deviceIP,
							deviceID: discoveredDevice.deviceID
						}
						
						storage.setItem('switcher_config', this.cachedConfig)
						if (this.debug)
							this.log(discoveredDevice)
						
						if (this.pollingInterval)
							this.interval = setInterval(this.refreshState, this.pollingInterval)
					} else 
						throw Error(discoveredDevice)
				}).catch(err => {
					if (err.includes('Please try again') && isBelowErrorRepeatLimit()) {
						errorRepeatCounter ++
						setTimeout(async () => {
							this.log('Trying again...')
							this.discoverDevices()
						}, retryTimout)
						return
					}
					this.log('Could NOT discover devices!! -> Checking in storage for cached config...')
					if (this.debug)
						this.log(err)
					if (this.cachedConfig && this.cachedConfig.deviceIP && this.cachedConfig.deviceID) {
						this.log('Found Device IP and Device ID in storage!')
						SwitcherApi.init(this.log, this.debug, this.cachedConfig.deviceIP, this.cachedConfig.deviceID)
						if (this.pollingInterval)
							this.interval = setInterval(this.refreshState, this.pollingInterval)
					} else {

						this.log('Nothing in storage - NOT DISCOVERED & NOT CACHED')
						this.log('xxxxxxxxxx    -   Could NOT discover devices!! -> Can\'t start the plugin...    -   xxxxxxxxxx')
					}

				})
		} catch(err) {
			this.log('Could NOT discover devices!! -> Can\'t start the plugin...')
			this.log(err)
		}
	}



}

SwitcherBoiler.prototype.getServices = function () {


    const informationService = new Service.AccessoryInformation()

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Switcher")
        .setCharacteristic(Characteristic.Model, "switcher-boiler")
        .setCharacteristic(Characteristic.SerialNumber, this.uuid)


	switch (this.accessoryType) {
		case 'outlet':

			this.mainService = new Service.Outlet(this.name, 'outletType')

			this.mainService.getCharacteristic(Characteristic.On)
				.on('get', this.getOn.bind(this))
				.on('set', this.setOn.bind(this))


			this.mainService.getCharacteristic(Characteristic.OutletInUse)
				.on('get', callback => { callback(null, this.state.electricCurrentAmper > 0) })
			break
		case 'valve':

			this.mainService = new Service.Valve(this.name, 'valveType')

			this.mainService.getCharacteristic(Characteristic.Active)
				.on('get', this.getOn.bind(this))
				.on('set', this.setOn.bind(this))


			this.mainService.getCharacteristic(Characteristic.ValveType)
				.updateValue(2)

			this.mainService.getCharacteristic(Characteristic.InUse)
				.on('get', callback => { callback(null, this.state.electricCurrentAmper > 0 ? 1 : 0) })
			break
		
		default:
			this.mainService = new Service.Switch(this.name, 'switchType')
			
			this.mainService.getCharacteristic(Characteristic.On)
				.on('get', this.getOn.bind(this))
				.on('set', this.setOn.bind(this))
			break
	}
	
		
	this.mainService.getCharacteristic(EnergyCharacteristics.Volts)
		.updateValue(220)
		.on('get', callback => { callback(null, (this.state.power === 'on' ? 220 : 0)) })

	this.mainService.getCharacteristic(EnergyCharacteristics.Amperes)
		.updateValue(this.state.electricCurrentAmper)
		.on('get', callback => { callback(null, this.state.electricCurrentAmper) })

	this.mainService.getCharacteristic(EnergyCharacteristics.Watts)
		.updateValue(this.state.powerConsumptionWatts)
		.on('get', callback => { callback(null, this.state.powerConsumptionWatts) })


	this.mainService.getCharacteristic(EnergyCharacteristics.KilowattHours)
		.on('get', (callback) => {
			this.ExtraPersistedData = this.loggingService.getExtraPersistedData()
			if (this.ExtraPersistedData != undefined)
				this.totalenergy = this.ExtraPersistedData.totalenergy
			if (this.debug)
				this.log("Total Consumption: " + this.totalenergy)
			callback(null, this.totalenergy)
		})


	this.mainService.getCharacteristic(EnergyCharacteristics.ResetTotal)
		.on('set', (value, callback) => {
			this.totalenergy = 0
			this.lastReset = value
			this.loggingService.setExtraPersistedData({ totalenergy: this.totalenergy, lastReset: this.lastReset })
			callback(null)
		})
		.on('get', (callback) => {
			this.ExtraPersistedData = this.loggingService.getExtraPersistedData()
			if (this.ExtraPersistedData != undefined)
				this.lastReset = this.ExtraPersistedData.lastReset
			callback(null, this.lastReset)
		})

	this.mainService.getCharacteristic(Characteristic.SetDuration)
		.setProps({
			format: Characteristic.Formats.UINT32,
			maxValue: 86340,
			minValue: 3600,
			minStep: 60,
			perms: [Characteristic.Perms.READ, Characteristic.Perms.WRITE, Characteristic.Perms.NOTIFY]
		})
		.on('get', (callback) => {
			if (this.debug)
				this.log("Auto Shutdown in Seconds:" + this.timer)
			callback(null, this.timer)
		})
		.on('set', this.setDuration.bind(this))

	this.mainService.getCharacteristic(Characteristic.RemainingDuration)
		.setProps({
			maxValue: 86340,
			minValue: 0,
			minStep: 1
		})
		.on('get', (callback) => {
			if (this.debug)
				this.log("Remaining duration in seconds:" + this.remainingDuration)
			callback(null, this.remainingDuration)
		})


    const services = [informationService, this.mainService, this.loggingService]


	this.discoverDevices()

	return services

}

SwitcherBoiler.prototype.identify = function (callback) {
	this.log("Identify requested!")
	callback(null) // success
}

SwitcherBoiler.prototype.setOn = async function (on, callback) {
	callback(null)
	if (on)
		this.log('Turning ON the Switcher')
	else
		this.log('Turning OFF the Switcher')
		
	try {
		await SwitcherApi.setState(on)

		this.updateState()
	} catch(err) {
		this.log('ERROR Turning ' + (on ? 'ON' : 'OFF') + ' the Switcher')
		this.log(err)

		if (err.includes('Please try again') && isBelowErrorRepeatLimit()) {
			setTimeout(async () => {
				try {
					this.log('Trying again...')
					await SwitcherApi.setState(on)
					this.updateState()
				} catch (err) {
					this.log('ERROR Turning ' + (on ? 'ON' : 'OFF') + ' the Switcher')
					this.log(err)
					this.log('NOT TRYING AGAIN!!')
				}
			}, retryTimout)
			return
		}
	}
}


SwitcherBoiler.prototype.getOn = async function (callback) {
	if (this.debug)
		this.log('Getting Switcher State')
	const on = (this.state.power === 'on' ? 1 : 0)
	if (this.pollingInterval)
		callback(null, on)
	
	this.updateState(callback)
}

SwitcherBoiler.prototype.setDuration = async function (time, callback) {
	this.timer = time
	const hours = Math.floor(time / 60 / 60)
	const minutes = Math.floor(time / 60) % 60
	const formattedTime = hours + ':' + minutes


	this.log("Setting new \"Auto Shutdown\" time - " + formattedTime)
	callback(null)
		
	try {
		await SwitcherApi.setDuration(formattedTime)
		this.state.autoShutdownMs = time * 1000
	} catch(err) {
		this.log('ERROR Setting \"Auto Shutdown\" time')
		this.log(err)

		if (err.includes('Please try again') && isBelowErrorRepeatLimit()) {
			setTimeout(async () => {
				try {
					this.log('Trying again...')
					await SwitcherApi.setDuration(formattedTime)
				} catch (err) {
					this.log('ERROR Setting \"Auto Shutdown\" time')
					this.log(err)
					this.log('NOT TRYING AGAIN!!')
				}
			}, retryTimout)
			return
		}
	}
}


const isBelowErrorRepeatLimit = () => {
	return errorRepeatCounter < 2
}