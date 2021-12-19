

let sendTimeout = null
const sendState = (that) => {
	that.processing = true
	clearTimeout(sendTimeout)
	sendTimeout = setTimeout(() => {
		that.log.easyDebug(`${that.name} - Sending command: ${JSON.stringify(that.state)}%`)
		that.switcher.set_breeze_command(that.state)
		that.updateState(that.state)
		setTimeout(() => {
			that.processing = false
		}, 1000)
	}, 1000)
}


const HKToFanLevel = (value, fanSpeeds) => {

	let selected = 'AUTO'
	if (!fanSpeeds.includes('AUTO'))
		selected = fanSpeeds[0]

	if (value !== 0) {
		fanSpeeds = fanSpeeds.filter(speed => speed !== 'AUTO')
		const totalSpeeds = fanSpeeds.length
		for (let i = 0; i < fanSpeeds.length; i++) {
			if (value <= (100 * (i + 1) / totalSpeeds))	{
				selected = fanSpeeds[i]
				break
			}
		}
	}
	return selected
}

// let Characteristic
module.exports = {

	get: {

		On: function(callback) {
			this.log.easyDebug(`Switcher ${this.name} is ${this.state.power ? 'ON' : 'OFF'}`)
			callback(null, !!this.state.power)
		},

		OutletInUse: function(callback) {
			const inUse = this.state.power_consumption > 0
			this.log.easyDebug(`Switcher ${this.name} Outlet is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
			callback(null, inUse)
		},

		Active: function(callback) {
			this.log.easyDebug(`Switcher ${this.name} is ${this.state.power ? 'Active' : 'INACTIVE'}`)
			callback(null, this.state.power)
		},

		InUse: function(callback) {
			this.log.easyDebug(`Switcher ${this.name} is ${this.state.power ? 'IN USE' : 'NOT IN USE'}`)
			callback(null, this.state.power)
		},

		SetDuration: function(callback) {
			this.log.easyDebug(`Switcher ${this.name} Auto Shutdown in Seconds: ${this.duration}`)
			callback(null, this.duration)
		},

		RemainingDuration: function(callback) {
			const duration = this.state.remaining_seconds
			this.log.easyDebug(`Switcher ${this.name} Remaining Duration in Seconds: ${duration}`)
			callback(null, duration)
		},

		Volts: function(callback) {
			const volts = this.state.power ? 220 : 0
			this.log.easyDebug(`Switcher ${this.name} Volts: ${volts}`)
			callback(null, volts)
		},

		Amperes: function(callback) {
			const amperes = Number(Math.round(this.state.power_consumption/220 + "e1") + "e-1")
			this.log.easyDebug(`Switcher ${this.name} Amperes: ${amperes}`)
			callback(null, amperes)
		},

		Watts: function(callback) {
			const watts = this.state.power_consumption
			this.log.easyDebug(`Switcher ${this.name} Watts: ${watts}`)
			callback(null, watts)
		},

		KilowattHours: function(callback) {
			const extraPersistedData = this.loggingService.getExtraPersistedData()
			if (extraPersistedData)
				this.totalEnergy = extraPersistedData.totalEnergy
			this.log.easyDebug(`Switcher ${this.name} Total Consumption (KWh): ${this.totalEnergy}`)
			callback(null, this.totalEnergy)
		},

		ResetTotal: function(callback) {
			const extraPersistedData = this.loggingService.getExtraPersistedData()
			if (extraPersistedData)
				this.lastReset = extraPersistedData.lastReset
			callback(null, this.lastReset)
		},

		CurrentPosition: function(callback) {
			const position = this.state.position
			this.log.easyDebug(`Switcher ${this.name} Current Position is ${position}%`)
			callback(null, position)
		},

		PositionState: function(callback) {
			const positionState = this.state.direction === 'DOWN' ? 0 : this.state.direction === 'UP' ? 1 : 2
			this.log.easyDebug(`Switcher ${this.name} Direction is ${this.state.direction}`)
			callback(null, positionState)
		}
	
	},

	set: {

		On: function(state, callback) {
			this.processing = true
			setTimeout(() => {
				this.processing = false
			}, 2000)

			if (state) {
				this.log(`Turning ON ${this.name} `)

				if (this.model !== 'power_plug')
					this.switcher.turn_on(Math.floor(this.duration/60)) 
				else
					this.switcher.turn_on()

			} else {
				this.log(`Turning OFF ${this.name}`)
				this.switcher.turn_off() 
			}
			callback()
		},

		Timer: function(Characteristic, state, callback) {
			this.processing = true
			
			if (state) {
				this.log(`Turning ON ${this.name} `)
				this.switcher.turn_on(this.duration) 
				setTimeout(() => {
					this.SwitchService.getCharacteristic(Characteristic.On).updateValue(false)
				}, 2000)
			}
			callback()
		},

		TargetPosition: function(Characteristic, position, callback) {
			this.processing = true
			setTimeout(() => {
				this.processing = false
			}, 2000)

			this.log(`${this.name} - Setting Position to ${position}%`)
			const positionState = this.state.position > position ? 0 : this.state.position < position ? 1 : 2
			this.switcher.set_position(position) 
			this.WindowCoveringService.getCharacteristic(Characteristic.PositionState).updateValue(positionState)
			callback()
		},

		SetDuration: function(seconds, callback) {
			const hours = Math.floor(seconds / 60 / 60)
			const minutes = Math.floor(seconds / 60) % 60
			const formattedTime = hours + ':' + ('0' + minutes).slice(-2)

			this.log(`Setting new duration time: ${formattedTime} `)
			this.duration = seconds
			this.accessory.context.duration = seconds

			callback()
		},

		ResetTotal: function(value, callback) {
			this.totalEnergy = 0
			this.lastReset = value
			this.loggingService.setExtraPersistedData({ totalEnergy: this.totalEnergy, lastReset: this.lastReset })
			callback(null)
		},

		ACActive: function(active, callback) {
			this.state.power = active ? 'ON' : 'OFF'
			this.log(`${this.name} - Setting AC Power to ${this.state.power}`)
			sendState(this)
			callback()
		},

		TargetHeaterCoolerState: function(state, callback) {
			switch (state) {
				case 0:
					this.state.mode = 'AUTO'
					break;
				case 1:
					this.state.mode = 'HEAT'
					break;
				case 2:
					this.state.mode = 'COOL'
					break;

			}
			this.log(`${this.name} - Setting AC Mode to ${this.state.mode}`)
			sendState(this)
			callback()
		},

		CoolingThresholdTemperature: function(temp, callback) {
			this.state['target_temp'] = temp
			this.log(`${this.name} - Setting AC Cooling Temperature to ${this.state['target_temp']}ºC`)
			sendState(this)
			callback()
		},

		HeatingThresholdTemperature: function(temp, callback) {
			this.state['target_temp'] = temp
			this.log(`${this.name} - Setting AC Heating Temperature to ${this.state['target_temp']}ºC`)
			sendState(this)
			callback()
		},

		ACSwing: function(swing, callback) {
			this.state.swing = swing ? 'ON' : 'OFF'
			this.log(`${this.name} - Setting AC Swing to ${this.state.swing}%`)
			sendState(this)
			callback()
		},

		ACRotationSpeed: function(speed, callback) {
			this.state['fan_level'] = HKToFanLevel(speed, this.capabilities['fan_levels'])
			this.log(`${this.name} - Setting AC Fan Level to ${this.state['fan_level']}%`)
			sendState(this)
			callback()
		}
	}
}