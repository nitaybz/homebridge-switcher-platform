let log, Characteristic, Service, accessory
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Outlet = (that) => {
	accessory = that
	Characteristic = accessory.api.hap.Characteristic
	Service = accessory.api.hap.Service
	log = accessory.log
	const OutletService = new Service.Outlet(accessory.name)
	log('initializing Outlet Accessory')

	OutletService.getCharacteristic(Characteristic.On)
		.on('get', getOn)
		.on('set', setOn)

	OutletService.getCharacteristic(Characteristic.OutletInUse)
		.on('get', getOutletInUse)

	const extras = addExtras(OutletService, accessory)

	accessory.updateHomeKit = () => {
		OutletService.getCharacteristic(Characteristic.On).updateValue(!!accessory.switcher.state.state)
		OutletService.getCharacteristic(Characteristic.OutletInUse).updateValue(accessory.switcher.state.power_consumption > 0)
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

		
	return OutletService
}


module.exports = Outlet

const getOn = (callback) => {
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${accessory.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(!!accessory.switcher.state.state)
}

const getOutletInUse = (callback) => {
	if (!accessory.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	const inUse = accessory.switcher.state.power_consumption > 0
	log(`Switcher is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
	callback(inUse)
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