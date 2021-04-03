// let Characteristic
module.exports = {

	get: {

		On: function(callback) {
			this.log(`Switcher ${this.name} is ${this.state.power ? 'ON' : 'OFF'}`)
			callback(null, !!this.state.power)
		},

		OutletInUse: function(callback) {
			const inUse = this.state.power_consumption > 0
			this.log.easyDebug(`Switcher ${this.name} Outlet is ${inUse ? 'IN USE' : 'NOT IN USE'}`)
			callback(null, inUse)
		},

		Active: function(callback) {
			this.log(`Switcher ${this.name} is ${this.state.power ? 'Active' : 'INACTIVE'}`)
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
				this.switcher.turn_on(Math.floor(this.duration/60)) 
			} else {
				this.log(`Turning OFF ${this.name}`)
				this.switcher.turn_off() 
			}
			callback()
		},

		Timer: function(Characteristic, state, callback) {
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

			const positionState = this.state.position > position ? 0 : this.state.position < position ? 1 : 2

			this.log(`${this.name} - Setting Position to ${position}%`)
			this.switcher.set_position(position) 
			this.SwitchService.getCharacteristic(Characteristic.PositionState).updateValue(positionState)
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
		}
	}
}