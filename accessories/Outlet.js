let log, Characteristic, Service
const device = {}
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Outlet = (accessory) => {
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
		OutletService.getCharacteristic(Characteristic.On).updateValue(!!device.switcher.state.state)
		OutletService.getCharacteristic(Characteristic.OutletInUse).updateValue(device.switcher.state.power_consumption > 0)
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

		
	return OutletService
}


module.exports = Outlet

const getOn = (callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${device.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(null, !!device.switcher.state.state)
}

const getOutletInUse = (callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	const inUse = device.switcher.state.power_consumption > 0
	log(`Switcher is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
	callback(null, inUse)
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