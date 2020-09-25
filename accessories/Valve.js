let log, Characteristic, Service, accessory
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Valve = (that) => {
	accessory = that
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log		

	const ValveService = new Service.Valve(accessory.name)
	log('initializing Valve Accessory')
	ValveService.getCharacteristic(Characteristic.ValveType)
		.updateValue(2)
			
	ValveService.getCharacteristic(Characteristic.Active)
		.on('get', getActive)
		.on('set', setActive)

	ValveService.getCharacteristic(Characteristic.InUse)
		.on('get', getValveInUse)

	const extras = addExtras(ValveService, accessory)

	accessory.updateHomeKit = () => {
		ValveService.getCharacteristic(Characteristic.Active).updateValue(accessory.switcher.state.state)
		ValveService.getCharacteristic(Characteristic.InUse).updateValue(accessory.switcher.state.state)
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

		
	return ValveService
}


module.exports = Valve

const getActive = (callback) => {
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${accessory.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(null, accessory.switcher.state.state)
}

const getValveInUse = (callback) => {
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${accessory.switcher.state.state ? 'IN USE' : 'NOT IN USE'}`)
	callback(null, accessory.switcher.state.state)
}

const setActive = (state, callback) => {
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