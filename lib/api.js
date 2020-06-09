const { spawn } = require('child_process')
let log, debug, deviceIP, deviceID


function switcherCommand(method, deviceIP, deviceID) {
	return new Promise((resolve, reject) => {
		var jsonPyResponse = ""
		var pyResponse = spawn('python', ['switcher.py', method, deviceIP, deviceID])
		pyResponse.stdout.on('data', (data) => {
			jsonPyResponse += data
		})
		pyResponse.stderr.on('data', (data) => {
			// log(`error:${data}`)
			reject(data)
		})
		pyResponse.stderr.on('close', () => {
			if (debug)
				log(jsonPyResponse)
			try {
				jsonPyResponse = JSON.parse(jsonPyResponse)
				if (jsonPyResponse.status === 'success')
					resolve(jsonPyResponse)
				else
					reject('Error: ' + jsonPyResponse.message)
			} catch (err) {
				log(err)
				reject('Could not parse JSON data: ' + jsonPyResponse)
			}
		})
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
		console.log('found device IP:', deviceIP)
		console.log('found device ID:', deviceID)
		return discover
	},

	getState: async () => {
		const state = await switcherCommand('getState', deviceIP, deviceID)
		console.log('recent state:')
		console.log(state)
		return state
	},

	setState: async (turnOn) => {
		const setResponse = await switcherCommand((turnOn ? 'setOn' : 'setOff'), deviceIP, deviceID)
		console.log('setResponse:')
		console.log(setResponse)
		return setResponse
	}
}