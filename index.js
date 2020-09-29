const Switcher = require('./lib/Switcher')

module.exports = (api) => {
	api.registerPlatform('homebridge-switcher-boiler', 'SwitcherBoiler', SwitcherBoiler)
}

class SwitcherBoiler {

	constructor(log, config, api) {
		this.api = api
		this.log = log

		this.accessories = []
		this.switcherDevices = {}
		this.name = config.name || 'Switcher Boiler'

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