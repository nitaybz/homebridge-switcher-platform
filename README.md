<img src="branding/hoobs_homebridge_switcher.svg" width="700px">

# homebridge-switcher-boiler

[![Downloads](https://img.shields.io/npm/dt/homebridge-switcher-boiler.svg?color=critical)](https://www.npmjs.com/package/homebridge-switcher-boiler)
[![Version](https://img.shields.io/npm/v/homebridge-switcher-boiler)](https://www.npmjs.com/package/homebridge-switcher-boiler)<br>
[![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org)

[Homebridge](https://github.com/nfarina/homebridge) plugin for Switcher - Boiler / Water Heater

  <img src="branding/product.png" width="300px">

### Requirements

<img src="https://img.shields.io/badge/node-%3E%3D10.17-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-%3E%3D0.4.4-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/python-installed-brightgreen">

check with: `node -v` & `homebridge -V` and update if needed

## Description

The long waited plugin for the Switcher boiler/water-heater is here!<br>
Easily discovers your device automatically without any prior steps needed.<br>
**NO configuration needed, NO extraction of values or params, NO use of external scripts and method.**

The plugin will expose 1 switch accessory representing the Switcher. When first initializing the plugin, it will scan for devices and retrieve device ID and device IP and will store them for the next restart (in case the device won't be online when initializing homebridge).

## Features and Plans
This is the very first stage of the plugin, the implementation is very simple and straight forward.
Once I can be assure that this plugin is working as expected, I will start develop the following features:

- [ ] Power Consumption (in Watts) in the Eve app.
- [ ] History Storage: Store power consumption over time (Eve app)
- [ ] Option for valve accessory - will give you the ability to control the auto-shutdown time and/or turn on the Switcher for a certain amount of time.

# Installation

1. Make sure you have Python installed (RasberryPi OS and HOOBS usually come with Python pre-installed)
2. Install homebridge using: `sudo npm install -g homebridge --unsafe-perm`
3. Install this plugin using: `sudo npm install -g homebridge-switcher-boiler`
4. Update your configuration file. See `config-sample.json` in this repository for a sample.

\* install from git: `sudo npm install -g git+https://github.com/nitaybz/homebridge-switcher-boiler.git`

## Config file

#### Easy config (required)

```
"accessories": [
    {
        "accessory": "SwitcherBoiler",
        "name": "Boiler"
    }
]
```

#### Advanced config (optional)

```
"accessories": [
    {
        "accessory": "SwitcherBoiler",
        "name": "Boiler",
        "pollingIntervalInSec": 60,
        "debug": false
    }
]
```

### Configurations Table

*advanced details below

|             Parameter            |                       Description                       | Required |  Default |   type   |
| -------------------------------- | ------------------------------------------------------- |:--------:|:--------:|:--------:|
| `accessory`             | always "SwitcherBoiler"                                 |     ✓    |     -    |  String  |
| `name`                  | Name for your Switcher accessory                        |     ✓    |     -    |  String  |
| `pollingIntervalInSec`  |  Amount of time in Seconds to poll device state. default to 60 seconds. 0 for no polling.   |          |  `30` |  Integer |
| `debug`       |  When set to `true`, the plugin will produce extra logs for debugging purposes        |          |  `false` |  Boolean  |

# Advanced Control

### Auto Detect Configurations

The plugin will scan and search for your Switcher device in your network (No prior steps needed!). Once found, it will retrieve the device IP and device ID and store them locally to make sure it's available for the next time the system restarts in case the device won't be detectible.
It is especially useful for situations where the Switcher device is temporarily down or not connected during system reboot.

### State Polling

By default, the accessory state will be updated in the background every 30 seconds. This can be changed using `pollingIntervalInSec` in your config, by setting a number (in seconds) representing the delay between each status request.<br>
The state will also refresh every time you open the "Home" app or any related HomeKit app.

### Issues & Debug

If you experience any issues with the plugins please refer to the [Issues](https://github.com/nitaybz/homebridge-switcher-boiler/issues) tab and check if your issue is already described there, if it doesn't, please create a new issue with as much detailed information as you can give (logs are crucial).<br>
if you want to even speed up the process, you can add `"debug": true` to your config, which will give me more details on the logs and speed up fixing the issue.

<br>

## Credits

This Plugin could not be made without the extensive research of the Switcher V2 Protocol which was performed by @AviadGolan and @NightRang3r and the idea to turn their script into JSON response which comes from @royby12.

## Support homebridge-switcher-boiler

**homebridge-switcher-boiler** is a free plugin under the MIT license. it was developed as a contribution to the homebridge/hoobs community with lots of love and thoughts.
Creating and maintaining Homebridge plugins consume a lot of time and effort and if you would like to share your appreciation, feel free to "Star" or donate.

<a target="blank" href="https://www.paypal.me/nitaybz"><img src="https://img.shields.io/badge/Donate-PayPal-blue.svg"/></a>
