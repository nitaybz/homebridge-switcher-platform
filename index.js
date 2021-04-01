const Switcher = require('./lib/switcher')
const PLUGIN_NAME = 'homebridge-switcher-platform'
const PLATFORM_NAME = 'SwitcherPlatform'
module.exports = (api) => {
	api.registerPlatform(PLUGIN_NAME, PLATFORM_NAME, SwitcherPlatform)
}

class SwitcherPlatform {

	constructor(log, config, api) {
		this.api = api
		this.log = log

		this.accessories = []
		this.switcherDevices = {}
		this.PLUGIN_NAME = PLUGIN_NAME
		this.PLATFORM_NAME = PLATFORM_NAME
		this.name = config.name || PLATFORM_NAME
		this.accessoryType = config.accessoryType
		this.devices = config.devices || []
		this.customTimers = config.customTimers || []
		this.secondsToRemove = (config.secondsToRemove === null || config.secondsToRemove === undefined) ? 0 : config.secondsToRemove
		this.debug = config.debug || false

		
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

		this.api.on('didFinishLaunching', Switcher.init.bind(this))

	}

	configureAccessory(accessory) {
		this.log.easyDebug(`Found Cached Accessory: ${accessory.displayName} (${accessory.context.deviceId}) `)
		this.accessories.push(accessory)
	}
}