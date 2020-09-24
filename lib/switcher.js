const Switcher = require('switcher-js').Switcher
const storage = require('node-persist');

module.exports = async (accessory) => {
	
	await storage.init({
		dir: accessory.persistPath,
		forgiveParseErrors: true
	})

	const listen = (switcher) => {
		switcher.on('status', (state) => {
			accessory.log.debug('New status received:')
			accessory.log.debug(state)
			switcher.state = state
			accessory.updateHomeKit()
			storage.setItem('state', state)
		})
		
		switcher.on('state', () => {
			switcher.status(state => {
				switcher.state = state
				storage.setItem('state', state)
				accessory.updateHomeKit()
			})
		})
		
		switcher.on('error', (error) => {
			accessory.log(error)
		})
	}

	const initSwitcher = async (deviceId, ip) => {
		const switcher = new Switcher(deviceId, ip, accessory.log)
		accessory.api.on('shutdown', switcher.close)
		try {
			await switcher.status(state => {
				switcher.state = state
			})

		} catch(err) {
			accessory.log('Could NOT get state from device !')
			accessory.log.debug(err)
			const cachedState = await storage.getItem('state')
			if (cachedState) {
				accessory.log('GOT cached state from storage')
				switcher.state = cachedState
			} else {
				accessory.log('Could NOT get state from device !')
				throw err
			}
		}

		listen(switcher)
		return switcher
	}

	return new Promise((resolve, reject) => {
		if (accessory.deviceId && accessory.ip) {
			try {
				const switcher = initSwitcher(accessory.deviceId, accessory.ip)
				resolve(switcher)
			} catch(err) {
				reject(err)
			}
		
		} else {
			const identifier = accessory.deviceId || accessory.ip || accessory.deviceName
			const proxy = Switcher.discover(accessory.log, identifier, accessory.discoveryTimeout)
			accessory.api.on('shutdown', proxy.close)

			proxy.on('ready', (switcher) => {
			
				storage.setItem('switcher_config', {
					deviceIP: switcher.switcher_ip,
					deviceID: switcher.device_id
				})

				clearTimeout(failedTimeout)
				accessory.api.removeListener('shutdown', proxy.close)
				try {
					const switcher = initSwitcher(accessory.deviceId, accessory.ip)
					resolve(switcher)
				} catch(err) {
					reject(err)
				}
			})

			const failedTimeout = setTimeout(() => {
				accessory.log('TIMEOUT - Failed to find device on time!')
				accessory.log('searching on storage...')
				const cachedConfig = storage.getItem('switcher_config')
				if (cachedConfig) {
					try {
						const switcher = initSwitcher(cachedConfig.deviceID, cachedConfig.deviceIP)
						resolve(switcher)
					} catch(err) {
						reject(err)
					}
				} else
					reject('TIMEOUT - Failed to find device on time!')
			}, accessory.discoveryTimeout + 500)
		}

	})
}