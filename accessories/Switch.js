let log, Characteristic, Service, accessory
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Switch = (that) => {
	accessory = that
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log
	const SwitchService = new Service.Switch(accessory.name)
	log('initializing Switch Accessory')
			
	SwitchService.getCharacteristic(Characteristic.On)
		.on('get', getOn)
		.on('set', setOn)

	const extras = addExtras(SwitchService, accessory)

	accessory.updateHomeKit = () => {
		SwitchService.getCharacteristic(Characteristic.On).updateValue(!!accessory.switcher.state.state)
		extras.updateHomeKit()
	}
	
	switcherInit(accessory)
		.then(switcher => {
			accessory.switcher = switcher
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
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${accessory.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(!!accessory.switcher.state.state)
}


const setOn = (state, callback) => {
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	if (state) {
		log('Turning ON Switcher')
		accessory.switcher.turn_on() 
	} else {
		log('Turning OFF Switcher')
		accessory.switcher.turn_off() 
	}
	callback()
}