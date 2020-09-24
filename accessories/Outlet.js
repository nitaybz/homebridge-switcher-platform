let switcher, extras, log, Characteristic, Service
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Switch = (accessory) => {
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log
	const OutletService = new Service.Outlet(accessory.name)
			
	OutletService.getCharacteristic(Characteristic.On)
		.on('get', getOn)
		.on('set', setOn)

	OutletService.getCharacteristic(Characteristic.OutletInUse)
		.on('get', getOutletInUse)

	extras = addExtras(OutletService, accessory, switcher)

	accessory.updateHomeKit = () => {
		OutletService.getCharacteristic(Characteristic.On).updateValue(!!switcher.state.state)
		OutletService.updateCharacteristic(Characteristic.OutletInUse, switcher.state.power_consumption > 0)
		extras.updateHomeKit()
	}
	
	switcherInit(accessory)
		.then(device => {
			switcher = device
		})
		.catch(err => {
			log(err)
			log('Can\'t initialize the plugin properly !!!')
			log('Please check your config and that switcher is connected to the network...')
		})

		
	return OutletService
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

const getOutletInUse = (callback) => {
	if (!switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect');
	}
	const inUse = switcher.state.power_consumption > 0
	log(`Switcher is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
	callback(inUse)
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