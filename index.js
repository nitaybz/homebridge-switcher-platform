const Switcher = require('./lib/Switcher')
const PLUGIN_NAME = 'homebridge-switcher-boiler'
const PLATFORM_NAME = 'SwitcherBoiler'
module.exports = (api) => {
	api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SwitcherBoiler)
}

class SwitcherBoiler {

	constructor(log, config, api) {
		this.api = api
		this.log = log

		this.accessories = []
		this.switcherDevices = {}
		this.PLUGIN_NAME = PLUGIN_NAME
		this.PLATFORM_NAME = PLATFORM_NAME
		this.name = config.name || PLATFORM_NAME

		this.devices = config.devices || []
		this.secondsToRemove = config.secondsToRemove || 600
		this.debug = config.debug || false
		this.persistPath = this.api.user.persistPath() + '/../switcher-persist'

		
		// define debug method to output debug logs when enabled in the config
		this.log.easyDebug = (...content) => {
			if (this.debug) {
				this.log(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
			} else
				this.log.debug(content.reduce((previous, current) => {
					return previous + ' ' + current
				}))
		}

		this.api.on('didFinishLaunching', async () => {

			await this.storage.init({
				dir: this.persistPath,
				forgiveParseErrors: true
			})

			Switcher.init(this)


			
		})

	}

	configureAccessory(accessory) {
		this.log.easyDebug(`Found Cached Accessory: ${accessory.name} (${accessory.context.deviceId}) `)
		this.accessories.push(accessory)
	}
}