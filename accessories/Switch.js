let log, Characteristic, Service
const device = {}
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Switch = (accessory) => {
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log
	const SwitchService = new Service.Switch(accessory.name)
	log('initializing Switch Accessory')
			
	SwitchService.getCharacteristic(Characteristic.On)
		.on('get', getOn)
		.on('set', setOn)

	const extras = addExtras(SwitchService, accessory, device)

	accessory.updateHomeKit = () => {
		SwitchService.getCharacteristic(Characteristic.On).updateValue(!!device.switcher.state.state)
		extras.updateHomeKit()
	}
	
	switcherInit(accessory)
		.then(switcher => {
			device.switcher = switcher
			log(`Successfully initialized Switcher accessory: ${switcher.state.name} (id:${switcher.device_id}) at ${switcher.switcher_ip}`)
		})
		.catch(err => {
			log(err)
			log('Can\'t initialize the plugin properly !!!')
			log('Please check your config and that switcher is connected to the network...')
		})

		
	return SwitchService
}


module.exports = Switch

const getOn = (callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${device.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(null, !!device.switcher.state.state)
}


const setOn = (state, callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	if (state) {
		log('Turning ON Switcher')
		device.switcher.turn_on() 
	} else {
		log('Turning OFF Switcher')
		device.switcher.turn_off() 
	}
	callback()
}