<img src="branding/hoobs_homebridge_switcher.svg" width="700px">

# homebridge-switcher-boiler

[![Downloads](https://img.shields.io/npm/dt/homebridge-switcher-boiler.svg?color=critical)](https://www.npmjs.com/package/homebridge-switcher-boiler)
[![Version](https://img.shields.io/npm/v/homebridge-switcher-boiler)](https://www.npmjs.com/package/homebridge-switcher-boiler)<br>
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) [![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/7DyabQ6)<br>
[![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org?ref=10876) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org?ref=10876)

[Homebridge](https://github.com/nfarina/homebridge) plugin for Switcher - Boiler / Water Heater (and smart sockets)

  <img src="branding/products.png" width="500px">

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

#### NEW
Multiple devices can be added as long as you can supply one of: **`deviceId`** OR **`ip`** OR **`deviceName`**

## Version 2.0 Updates
**The plugin is now JavaScript only!** which means, no dependency on python and better compatibility with all operating systems.

You can now add safely more than one accessory, including Switcher smart sockets. You just need to supply some information about the device:

1. If you will supply one identifier of following: `deviceId`  OR `ip`(device IP address) OR `deviceName` (The device name in Switcher app) the plugin will scan and search for a device with that identifier.
2. If you'll supply `deviceId` and `ip`(device IP address). the plugin will automatically connect to the device without scanning the network.
3. If you'll not supply any information about the device, the plugin will scan the network and connect to the first device it detects.

Now, the plugin is always listening to the Switcher device and will always get status updates from the device every few seconds. Therefore `pollingIntervalInSec` is deprecated.



# Installation


This plugin is [HOOBS](https://hoobs.org/?ref=10876) certified and can be easily installed and configured through their UI.

If you don't use HOOBS (or Homebridge UI), keep reading:



1. Make sure you have Python installed (RaspberryPi OS and HOOBS usually come with Python pre-installed)
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
        "accessoryType": "outlet",
        "deviceId": "24eaf5",
        "ip": "10.0.0.1",
        "discoveryTimeout": 20,
        "debug": false
    },
    {
      "accessory": "SwitcherBoiler",
      "name": "Switcher Socket",
      "accessoryType": "outlet",
      "deviceName": "Bed Lamp",
      "discoveryTimeout": 20,
      "debug": false
    }
]
```

### Configurations Table

*advanced details below

|             Parameter            |                       Description                       | Required |  Default |   type   |
| -------------------------------- | ------------------------------------------------------- |:--------:|:--------:|:--------:|
| `accessory`             | always `"SwitcherBoiler"`                                 |     ✓    |     -    |  String  |
| `name`                  | Name for your Switcher accessory                        |     ✓    |     -    |  String  |
| `accessoryType`        | Type of Accessory (`"switch"`, `"outlet"`, `"valve"`). read more below...|         |     `"switch"`    |  String  |
| `deviceId`        | Device ID for discovery - can only be extracted via scripts or you can view the ID in this plugin logs|         |     `"24eaf5"`    |  String  |
| `ip`        | IP address of the device for discovery. |         |     `"10.0.0.1"`    |  String  |
| `deviceName`        | Device exact name from Switcher app for discovery. |         |     `"24eaf5"`    |  String  |
| `discoveryTimeout`  |  Maximum time (in seconds) to wait for device discovery.   |          |  `20` |  Integer |
| `debug`       |  When set to `true`, the plugin will produce extra logs for debugging purposes        |          |  `false` |  Boolean  |

# Advanced Control

### Auto Detect Configurations

The plugin will scan and search for your Switcher device in your network (No prior steps needed!). Once found, it will retrieve the device IP and device ID and store them locally to make sure it's available for the next time the system restarts in case the device won't be detectible.
It is especially useful for situations where the Switcher device is temporarily down or not connected during system reboot.


### Multiple Accessories

Since version 2.0, The plugin can support multiple accessories (including smart sockets). To achieve that, You'll need to duplicate the accessory config but also supply at least one piece of information about the device


### Skip Discovery

If you already know what is your device ID and device IP (the plugin prints those when it detect switcher device), you can add those to your config (`"deviceId"`, `"ip"`) and the plugin will skip the discovery and connect directly to the device. It will save some time till the device is functional after HomeBridge restart.


### Accessory Type
In the new version (>= 1.1.0) there are a lot more exciting options for your Switcher!
First of all, I've added a lot of service to support both timer/auto-shutdown and getting information about the power consumption of the device.<br><br>
All the new services are available for any accessory type that you choose (in Eve app or most of 3rd party apps).
However, in Home app it is not possible to present an accessory with all those functionalities, especially since it doesn't support power consumption.<br>

To overcome this limit I gave you the possibility to choose what would be the best option for you to see in Home app:

#### Switch (default)
When you just want a normal switch (like version 1) and don't need anything else. (all services will still appear in 3rd party apps)

#### Outlet
Choose `"accessoryType": "outlet"` if you are most interested in the power consumption stats and automations. Outlet accessory will reveal the service "In Use" which will only be active if your boiler is ON and consume energy. it will not be active when the boiler has reached it's temperature limit and no power is used (even if the switcher is ON -  accessory will show on but not "in use").<br>
Choosing outlet will also track your power consumption.<br>
**Eve app only**: history and stats and will even calculate yearly costs after it collected enough data.


#### Water Valve
Choosing `"accessoryType": "valve"` will give you the possibility to control your auto-shutdown time from the Home app and therefore affect the time the device will be on before forcing shutdown.<br>
You should be **AWARE** that changing the duration time in HomeKit will affect in changing you auto-shutdown time in Switcher which will of course affect the auto-shutdown time even when you turn the device manually.

### New Services and Eve App

Since version 1.1, a lot of new services are available in Eve app.<br>
check the following screenshot and explanations:<br><br>
<img src="branding/eve_screenshot.jpeg" width="300px"><br>

*To reveal all the services, click on "Edit" in Eve app (top right in the accessory screen) and enable everything.

**In Use (Outlet only)** - Represent wether or not the boiler is heating and consuming energy.<br>
**Consumption** - Current consumption in Watts.<br>
**Current** - Electrical current (Ampere).<br>
**Voltage** - Always 220 volt when device is ON.<br>
**Projected Cost** - Eve calculations of predicted yearly cost based on Total consumption.<br>
**Total Consumption** - Total Consumption in kWh.<br>
**Total Cost** - Eve calculations of total costs with local currency.<br>
**Default Duration** - Auto-Shutdown time, affecting the Auto-Shutdown setting in Switcher app and the max heating duration. possible inputs are between 1 hour to 23:59 hours<br>
**Remaining** - Shows the remaining time until the boiler will shut off<br>

## Issues & Debug

If you experience any issues with the plugins please refer to the [Issues](https://github.com/nitaybz/homebridge-switcher-boiler/issues) tab or [Switcher-Boiler Discord Channel](https://discord.gg/7DyabQ6) and check if your issue is already described there, if it doesn't, please report a new issue with as much detailed information as you can give (logs are crucial).<br>
if you want to even speed up the process, you can add `"debug": true` to your config, which will give me more details on the logs and speed up fixing the issue.


<br>

## Credits

This Plugin could not be made without the extensive research of the Switcher V2 Protocol which was performed by @AviadGolan and @NightRang3r and the JS implementation of their work by @johnathanvidu.

## Support homebridge-switcher-boiler

**homebridge-switcher-boiler** is a free plugin under the MIT license. it was developed as a contribution to the homebridge/hoobs community with lots of love and thoughts.
Creating and maintaining Homebridge plugins consume a lot of time and effort and if you would like to share your appreciation, feel free to "Star" or donate.

<a target="blank" href="https://www.paypal.me/nitaybz"><img src="https://img.shields.io/badge/PayPal-Donate-blue.svg?logo=paypal"/></a><br>
<a target="blank" href="https://www.patreon.com/nitaybz"><img src="https://img.shields.io/badge/PATREON-Become a patron-red.svg?logo=patreon"/></a><br>
<a target="blank" href="https://ko-fi.com/nitaybz"><img src="https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi"/></a>