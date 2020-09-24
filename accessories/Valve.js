let switcher, extras, log, Characteristic, Service
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Switch = (accessory) => {
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log		

	const ValveService = new Service.Valve(accessory.name)

	ValveService.getCharacteristic(Characteristic.ValveType)
		.updateValue(2)
			
	ValveService.getCharacteristic(Characteristic.Active)
		.on('get', getActive)
		.on('set', setActive)

	ValveService.getCharacteristic(Characteristic.InUse)
		.on('get', getValveInUse)

	extras = addExtras(ValveService, accessory, switcher)

	accessory.updateHomeKit = () => {
		ValveService.getCharacteristic(Characteristic.Active).updateValue(switcher.state.state)
		ValveService.updateCharacteristic(Characteristic.ValveInUse, switcher.state.power_consumption > 0)
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

		
	return ValveService
}


module.exports = Switch

const getActive = (callback) => {
	if (!switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect');
	}
	log(`Switcher is ${switcher.state.state ? 'ON' : 'OFF'}`)
	callback(switcher.state.state)
}

const getValveInUse = (callback) => {
	if (!switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect');
	}
	const inUse = switcher.state.power_consumption > 0
	log(`Switcher is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
	callback(inUse)
}

const setActive = (state, callback) => {
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