const Switcher = require('switcher-js2').Switcher
const storage = require('node-persist')

module.exports = async (accessory) => {
	accessory.log.easyDebug.debug = (...content) => {
		if (accessory.debug) {
			accessory.log(content.reduce((previous, current) => {
				return previous + ' ' + current
			}))
		} else
			accessory.log.debug(content.reduce((previous, current) => {
				return previous + ' ' + current
			}))
	}

	await storage.init({
		dir: accessory.persistPath,
		forgiveParseErrors: true
	})

	const listen = (switcher) => {
		switcher.on('status', (state) => {
			accessory.log.easyDebug('New status received:')
			accessory.log.easyDebug(state)
			switcher.state = state
			accessory.updateHomeKit()
			storage.setItem('switcher-state', state)
		})
		
		switcher.on('state', (state) => {
			accessory.log.easyDebug('State Changed:', state)
			setTimeout(() => {
				switcher.status(state => {
					switcher.state = state
					storage.setItem('switcher-state', state)
					accessory.updateHomeKit()
				})

			}, 1000)
		})
		
		switcher.on('duration', (duration) => {
			accessory.log.easyDebug('Duration Changed:', duration)
			setTimeout(() => {
				switcher.status(state => {
					switcher.state = state
					storage.setItem('switcher-state', state)
					accessory.updateHomeKit()
				})
			}, 1000)
		})
		
		switcher.on('error', (error) => {
			accessory.log(error)
		})
	}

	const initSwitcher = (deviceId, ip, detectedSwitcher) => {
		return new Promise((resolve, reject) => { 
			const switcher = detectedSwitcher || new Switcher(deviceId, ip, accessory.log.easyDebug)
			accessory.api.on('shutdown', switcher.close)
			try {
				switcher.status(state => {
					switcher.state = state
					listen(switcher)
					resolve(switcher)
				})
	
			} catch(err) {
				accessory.log('Could NOT get state from device !')
				accessory.log.easyDebug(err)
				storage.getItem('switcher-state')
					.then(cachedState => {
						if (cachedState) {
							accessory.log('GOT cached state from storage')
							switcher.state = cachedState
							listen(switcher)
							resolve(switcher)
						} else {
							accessory.log('Could NOT get state from storage !')
							reject(err)
						}
					})
					.catch(err => {
						accessory.log('Could NOT get state from storage !')
						reject(err)
					})

				
			}

		})
	}

	return new Promise((resolve, reject) => {
		if (accessory.deviceId && accessory.ip) {

			accessory.log.easyDebug(`Switcher information found in config! initializing device (id:"${accessory.deviceId}" ip:"${accessory.ip}")`)
			initSwitcher(accessory.deviceId, accessory.ip)
				.then(resolve)
				.catch(reject)
		
		} else {
			const identifier = accessory.deviceId || accessory.ip || accessory.deviceName

			accessory.log.easyDebug(`Scanning for switcher devices ` + (identifier ? `(looking for "${identifier}")` : ''))
			const proxy = Switcher.discover(accessory.log.easyDebug, identifier, accessory.discoveryTimeout)
			accessory.api.on('shutdown', proxy.close)

			proxy.on('ready', async (detectedSwitcher) => {
				storage.setItem('switcher_config', {
					deviceIP: detectedSwitcher.switcher_ip,
					deviceID: detectedSwitcher.device_id
				})

				clearTimeout(failedTimeout)
				accessory.api.removeListener('shutdown', proxy.close)
				initSwitcher(null, null, detectedSwitcher)
					.then(resolve)
					.catch(reject)
			})

			const failedTimeout = setTimeout(async () => {
				accessory.log('TIMEOUT - Failed to find device on time!')
				accessory.log('searching in storage...')
				storage.getItem('switcher_config')
					.then(cachedConfig => {
						if (cachedConfig) {
							accessory.log.easyDebug(`Switcher information found in storage! initializing device (id:"${cachedConfig.deviceID}" ip:"${cachedConfig.deviceIP}")`)
							initSwitcher(cachedConfig.deviceID, cachedConfig.deviceIP)
								.then(resolve)
								.catch(reject)
						} else
							throw `The Plugin could NOT find ${(identifier ? `"${identifier}"` : 'any')} switcher device!!`
					})
					.catch(reject)
			}, accessory.discoveryTimeout*1000 + 500)
		}

	})
}