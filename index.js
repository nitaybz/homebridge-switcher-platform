

const Service, Characteristic, HomebridgeAPI
const SwitcherApi = require('./lib/api')
const storage = require('node-persist')

module.exports = function (homebridge) {
    Service = homebridge.hap.Service
    Characteristic = homebridge.hap.Characteristic
	HomebridgeAPI = homebridge
    homebridge.registerAccessory("homebridge-switcher-boiler", "SwitcherBoiler", SwitcherBoiler)
}


function SwitcherBoiler(log, config, api) {
    let UUIDGen = api.hap.uuid

    this.log = log
    this.name = config['name'] || 'Switcher'
	this.pollingInterval = config['pollingIntervalInSec'] ? config['pollingIntervalInSec'] * 1000 : 60000
	this.debug = config['debug'] || false

	this.state = {}
	this.uuid = UUIDGen.generate(this.name)
	this.persistPath = HomebridgeAPI.user.persistPath() + '/../switcher-persist'


	this.updateHomeKit = (newState) => {
		let updated = false
		if (this.state.power !== newState.power) {
			this.switchService.getCharacteristic(Characteristic.On).updateValue(newState.power === 'on')
			updated = true
		}
		if (updated) {
			this.state = newState
			if (this.debug) {
				this.log('Updating HomeKit with new State')
				this.log(newState)
			}
		}
	}

	this.refreshState = () => {
		if (this.debug)
			this.log('Getting Switcher State (interval)')
		try {
			const newState = await SwitcherApi.getState()
			if (this.debug) {
				this.log('Got Switcher State:')
				this.log(newState)
			}
			this.updateHomeKit(newState)

		} catch(err) {
			this.log('ERROR Getting State from the Switcher:')
			this.log(err)
		}
	}

}

SwitcherBoiler.prototype.getServices = function () {

	let cachedConfig = {}
	try {
		await storage.init({
			dir: persistPath,
			forgiveParseErrors: true
		})
		cachedConfig = await storage.getItem('switcher_config')
	} catch(err) {
		this.log("Failed setting storage dir under 'switcher-persist':")
		this.log(err)
		this.log("Please contact the plugin creator...")
	}

	if (cachedConfig.deviceIP && cachedConfig.deviceID) {
		this.log('Found Device IP and Device ID in storage!')
		SwitcherApi.init(this.log, this.debug, cachedConfig.deviceIP, cachedConfig.deviceID)
	} else {
		this.log('No devices found in storage. -------> Discovering devices...')
		SwitcherApi.init(this.log, this.debug)
		try {
			const discoveredDevice = await SwitcherApi.discover()
			if (discoveredDevice && discoveredDevice.deviceIP && discoveredDevice.deviceID) {
				this.log('Discovered Switcher Device!')
				if (this.debug)
					this.log(discoveredDevice)
				
			} else
				throw Error(discoveredDevice)
		} catch(err) {
			this.log('Could NOT discover devices!! -> Can\'t start the plugin...')
			this.log(err)
			return []
		}
	}

    const informationService = new Service.AccessoryInformation()

    informationService
        .setCharacteristic(Characteristic.Manufacturer, "Switcher")
        .setCharacteristic(Characteristic.Model, "switcher-boiler")
        .setCharacteristic(Characteristic.SerialNumber, this.uuid)


    this.switchService = new Service.Switch(this.name)


    this.switchService.getCharacteristic(Characteristic.On)
        .on('get', this.getOn.bind(this))
        .on('set', this.setOn.bind(this))
	
	
    const services = [informationService, this.switchService]


	if (this.pollingInterval)
		setInterval(this.refreshState, this.pollingInterval)
		
    return services

}


SwitcherBoiler.prototype.setOn = async function (on, callback) {
	try {
		await SwitcherApi.setState(on)
		if (on) {
			this.log('Turning ON the Switcher')
			this.state.power = 'on'
		} else {
			this.log('Turning OFF the Switcher')
			this.state.power = 'off'
		}
	} catch(err) {
		this.log('ERROR Turning ' + (on ? 'ON' : 'OFF') + ' the Switcher')
		this.log(err)
	}
	callback()
}



SwitcherBoiler.prototype.getOn = async function (callback) {
	if (this.debug)
		this.log('Getting Switcher State')
	let on = this.state.power === 'on'
	if (this.pollingInterval)
		callback(null, on)

	try {
		const newState = await SwitcherApi.getState()
		this.log('Got New Switcher State:')
		this.log(newState)

		on = newState.power === 'on'
		if (!this.pollingInterval)
			callback(null, on)
		else 
			this.updateHomeKit(newState)

	} catch(err) {
		this.log('ERROR Getting State from the Switcher:')
		this.log(err)
		if (!this.pollingInterval)
			callback(null, on)
	}
}

