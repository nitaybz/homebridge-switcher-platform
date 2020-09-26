let log, Characteristic, Service
const device = {}
const switcherInit = require('../lib/switcher')
const addExtras = require('./extras')

const Valve = (accessory) => {
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

	const extras = addExtras(ValveService, accessory, device)

	accessory.updateHomeKit = () => {
		ValveService.getCharacteristic(Characteristic.Active).updateValue(device.switcher.state.state)
		ValveService.getCharacteristic(Characteristic.InUse).updateValue(device.switcher.state.state)
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

		
	return ValveService
}


module.exports = Valve

const getActive = (callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${device.switcher.state.state ? 'ON' : 'OFF'}`)
	callback(null, device.switcher.state.state)
}

const getValveInUse = (callback) => {
	if (!device.switcher) {
		log('switcher has yet to connect')
		callback('switcher has yet to connect')
		return
	}
	log(`Switcher is ${device.switcher.state.state ? 'IN USE' : 'NOT IN USE'}`)
	callback(null, device.switcher.state.state)
}

const setActive = (state, callback) => {
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