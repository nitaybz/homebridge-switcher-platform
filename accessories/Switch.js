let switcher, extras, log, Characteristic, Service
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Switch = (accessory) => {
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log
	const SwitchService = new Service.Switch(accessory.name)
			
	SwitchService.getCharacteristic(Characteristic.On)
		.on('get', getOn)
		.on('set', setOn)

	extras = addExtras(SwitchService, accessory, switcher)

	accessory.updateHomeKit = () => {
		SwitchService.getCharacteristic(Characteristic.On).updateValue(!!switcher.state.state)
		extras.updateHomeKit()
	}
	
	switcherInit(accessory)
		.then(device => {
			switcher = device
			log(`Successfully initialized Switcher accessory: ${switcher.state.name}(${switcher.device_id}) at ${switcher.switcher_ip}`)
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
	if (!switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect');
	}
	log(`Switcher is ${switcher.state.state ? 'ON' : 'OFF'}`)
	callback(!!switcher.state.state)
}


const setOn = (state, callback) => {
	if (!switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect');
	}
	if (state) {
		log('Turning ON Switcher')
		switcher.turn_on(); 
	} else {
		log('Turning OFF Switcher')
		switcher.turn_off(); 
	}
	callback()
}