const { spawn } = require('child_process')
const path = require('path')
let log, debug, deviceIP, deviceID

function switcherCommand(method, deviceIP, deviceID) {
	return new Promise((resolve, reject) => {
		let commandTimeout
		let jsonPyResponse = ""
		const pathToScript = path.join(__dirname , 'switcher.py').replace('\\', '\\\\')
		if (debug)
			log('Running Command: python "' + pathToScript + '" ' + method + ' ' + deviceIP + ' ' + deviceID )
		try {
			commandTimeout = setTimeout(() => {
				reject(`TIMEOUT ERROR, can't reach device to run command ${method}!!!`)
			}, 5000)
			var pyResponse = spawn('python', ['"' + pathToScript + '" ' + method + " " + deviceIP + " " + deviceID],  { shell: true })
			pyResponse.stdout.on('data', (data) => {
				clearTimeout(commandTimeout)
				jsonPyResponse += data
			})
			pyResponse.stderr.on('data', (data) => {
				// log(`error:${data}`)
				clearTimeout(commandTimeout)
				reject(data.toString())
			})
			pyResponse.stderr.on('close', () => {
				clearTimeout(commandTimeout)
				// if (debug)
				// 	log(jsonPyResponse)
				try {
					jsonPyResponse = JSON.parse(jsonPyResponse)
					if (jsonPyResponse.status === 'success')
						resolve(jsonPyResponse)
					else {
	
						reject('Error: ' + jsonPyResponse.message)
					}
				} catch (err) {
					log(err)
					log(jsonPyResponse)
					reject('Could not parse JSON data: ' + jsonPyResponse)
				}
			})
		} catch (err) {
			log(err)
			reject(`SPAWN ERROR, can't run command ${method}!!!`)
		}
	})
}


module.exports = {

	init: (logInput, debugInput, cachedIP, cachedId) => {
		log = logInput
		debug = debugInput
		deviceIP = cachedIP
		deviceID = cachedId
	},

	discover: async (logInput, debugInput) => {
		const discover = await switcherCommand('discover')
		deviceIP = discover.deviceIP
		deviceID = discover.deviceID
		// console.log('found device IP:', deviceIP)
		// console.log('found device ID:', deviceID)
		return discover
	},

	getState: async () => {
		const state = await switcherCommand('getState', deviceIP, deviceID)
		// console.log('recent state:')
		// console.log(state)
		return state
	},

	setState: async (turnOn) => {
		const setResponse = await switcherCommand((turnOn ? 'setOn' : 'setOff'), deviceIP, deviceID)
		// console.log('setResponse:')
		// console.log(setResponse)
		return setResponse
	},

	setDuration: async (time) => {
		const setResponse = await switcherCommand(('m' + time), deviceIP, deviceID)
		console.log('setResponse:')
		console.log(setResponse)
		return setResponse
	}
}