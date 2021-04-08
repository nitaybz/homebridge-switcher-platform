<img src="branding/switcher_homebridge.png" width="500px">

# homebridge-switcher-platform

[![Downloads](https://img.shields.io/npm/dt/homebridge-switcher-platform.svg?color=critical)](https://www.npmjs.com/package/homebridge-switcher-platform)
[![Version](https://img.shields.io/npm/v/homebridge-switcher-platform)](https://www.npmjs.com/package/homebridge-switcher-platform)<br>
[![verified-by-homebridge](https://badgen.net/badge/homebridge/verified/purple)](https://github.com/homebridge/homebridge/wiki/Verified-Plugins) [![Homebridge Discord](https://img.shields.io/discord/432663330281226270?color=728ED5&logo=discord&label=discord)](https://discord.gg/7DyabQ6)<br>
[![certified-hoobs-plugin](https://badgen.net/badge/HOOBS/Certified/yellow)](https://plugins.hoobs.org?ref=10876) [![hoobs-support](https://badgen.net/badge/HOOBS/Support/yellow)](https://support.hoobs.org?ref=10876)

[Homebridge](https://github.com/nfarina/homebridge) plugin for [Switcher](https://switcher.co.il/)  Smart Accessories
<img src="branding/products.png" width="500px">

### Requirements

One of this model (minimum firmware required)

- Switcher V3: (Switcher Touch) - min firmware V1.51
- Switcher V2: min firmware 3.21 (Based on ESP chipset)
- Switcher V2: min firmware72.32 (Qualcomm chipset)
- Switcher Mini
- Switcher Power Plug
- Switcher V4
- Switcher Runner
- Switcher Runner Mini

Your Homebridge/Hoobs machine clock/time must be accurate. The easiest way to check if it's correct is to check the current logs. If time is not accurate, google on how to set it correctly on your machine.

<img src="https://img.shields.io/badge/node-%3E%3D10.17-brightgreen"> &nbsp;
<img src="https://img.shields.io/badge/homebridge-%3E%3D0.4.4-brightgreen">

check with: `node -v` & `homebridge -V` and update if needed

## Description

The long waited plugin for the Switcher accessories is here!<br>
Easily discovers your device automatically without any prior steps needed.<br>
**NO configuration needed, NO extraction of values or params, NO use of external scripts and method.**

The plugin will automatically expose all your Switcher devices and add them to HomeKit.

## Version 4 - \*\*BREAKING CHANGES\*\*

Version 4 includes the following improvements:

- **Support for Switcher Runner (blinds/roller-shutter)**
- Added [Custom Timers](###custom-timers) - The ability to create virtual switches that will turn on your boiler for X minutes
- Automatically detect device types and match with default icon: Boiler > Water Valve, Power Plug > Outlet, Switcher Runner > Window Covering
- Removed duration from 'Power Plug' devices
- Removed default 'Accessory Type' for all devices
- Changed plugin name to homebridge-switcher-platform
- Added power consumption tracking for all accessories (Eve app only)

Some things changed in the plugin that might break the way it works for you, you might need to uninstall and reinstall the plugin which will lead to removal of the accessories and the need to recreate scenes and automations - BE WARNED!

# Installation

This plugin is HomeBridge verified and [HOOBS](https://hoobs.org/?ref=10876) certified and can be easily installed and configured through their UI.

If you don't use Homebridge UI or HOOBS, keep reading:

1. Install homebridge using: `sudo npm install -g homebridge --unsafe-perm`
2. Install this plugin using: `sudo npm install -g homebridge-switcher-platform`
3. Update your configuration file. See `config-sample.json` in this repository for a sample.

## Config File Examples

#### Easy Config

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform"
    }
]
```

#### Advanced config (optional)

###### * Do not copy-paste this code, it will not work!

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "name": "Switcher Platform",
      "debug": false,
      "secondsToRemove": 0,
      "devices": [
        {
          "identifier": "24eaf5",
          "accessoryType": "valve"
        },
        {
          "identifier": "10.0.0.2",
          "accessoryType": "outlet"
        },
        {
          "identifier": "Desk Bulb",
          "accessoryType": "switch"
        },
        {
          "identifier": "21eac3",
          "hide": true
        }
      ],
      "customTimers": [
        {
          "identifier": "24eaf5",
          "shutdownMinutes": 30
        },
        {
          "identifier": "24eaf5",
          "shutdownMinutes": 60
        }
      ]
    }
]
```

### Configurations Table

\* advanced details below

|     Parameter |        Description      |  Default |   type   |
|:--------------|:------------------------|:--------:|:--------:|
| `platform`  | always `"SwitcherPlatform"` |     -    |  String  |
| `name`      | Platform name for logs  | `"SwitcherBolier"`    |  String  |
| `secondsToRemove`  |  Time in seconds to remove a device if it has not being discovered. set to 0 to not remove accessories at all.   |  `0` |  Integer |
| `debug`       |  When set to `true`, the plugin will produce extra logs for debugging purposes        |  `false` |  Boolean  |
| **devices** | List of devices for custom settings (with the below information)| | Array| 
| `Identifier`        | Can be Device ID, Device IP or Device Name. Needed in order to identify the device if you wish to set custom settings. |         |  String  |
| `accessoryType`        | Specific device type of accessory (`"switch"`, `"outlet"`, `"valve"`). read more below...|  `"switch"`  |  String  |
| `hide`| Set to `true` to remove this device from HomeKit | `false` |  Boolean  |
| **customTimers** | List of switches for custom timers (with the below information)| | Array| 
| `Identifier`        | Can be Device ID, Device IP or Device Name. Needed in order to identify the device if you wish to set custom timer for. |         |  String  |
| `shutdownMinutes`        | Define how many minutes to run the boiler ON before shutting it OFF automatically |        |  Integer  |
# Advanced Control

## Auto Detect Configurations & Multiple Accessories

The plugin will scan and listen for messages from all your Switcher devices. When a message is received from a new Switcher device, the plugin will automatically add it to HomeKit in it's default icon and functionality <br>
**Power Plug** => Outlet <br>
**Boiler** => Water Valve <br>
**Runner** => Window Covering (type cannot be changed)

To change the device icon and functionality continue reading...

## Advanced Config

As mentioned above, the plugin will automatically add all devices as Switch Accessories (unless mentioned otherwise in the config under it's default type)

it's possible to set specific icon for a specific device.
To achieve that you'll need to add `devices` to your config.

Example:

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "devices": [
        {
          "identifier": "e4eaf6",
          "accessoryType": "outlet",
          "hide": false
        }
      ]
    }
]
```

###### * `"identifier"` is required for custom device settings

### Identifier

Identifier is required for the plugin to know what device you want to change settings for.

To do that, you'll need to supply one of the following:

1. Device ID - Can be found in the plugin logs or can be extracted via python scripts that are out there in the WWW.
2. Device IP - Device IP address. Must be static if you're using this method.
3. Device Name - Exactly as it's written in Switcher app.

Set any of the above as `"identifier"`. Example:

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "devices": [
        {
          "identifier": "e4eaf6",
          "accessoryType": "outlet"
        },
        {
          "identifier": "10.0.0.1",
          "accessoryType": "switch",
        },
        {
          "identifier": "Boiler",
          "accessoryType": "valve"
        }
      ]
    }
]
```

### Hide

If you wish to exclude a Switcher device from HomeKit, just add `"hide": true` to your device config.

Example:

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "devices": [
        {
          "identifier": "e4eaf6",
          "hide": true
        }
      ]
    }
]
```

### Accessory Type

Changing accessory type can change the icon the functionality.<br>
`accessoryType` can be define in the device custom settings level.

When a new device is discovered it will first look if `accessoryType` is defined in `devices` with it's own `identifier`, if not, it will use it's default.

Custom accessory type for a device:

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "devices": [
        {
          "identifier": "e4eaf6",
          "accessoryType": "outlet"
        }
      ]
    }
]
```

\* Switcher Runner (blinds) accessory type, cannot be changed

#### Switch (default)
When you just want a normal switch (like version 1) and don't need anything else. (all [extra services](###extras) will still appear in 3rd party apps)

Choosing switch will also track your power consumption.<br>
**Eve app only**: history and stats and will even calculate yearly costs after it collected enough data.

Read more about it [here](###extras)

#### Outlet
Choose `"accessoryType": "outlet"` if you are most interested in the power consumption stats and automations. Outlet accessory will reveal the service "In Use" which will only be active if your boiler is ON and consume energy. it will not be active when the boiler has reached it's temperature limit and no power is used (even if the switcher is ON -  accessory will show on but not "in use").<br>
Choosing outlet will also track your power consumption.<br>
**Eve app only**: history and stats and will even calculate yearly costs after it collected enough data.

Read more about it [here](###extras)


#### Water Valve
Choosing `"accessoryType": "valve"` will give you the possibility to control your auto-shutdown time from the Home app and therefore affect the time the device will be on before forcing shutdown.

Since version 3, The plugin manage it's own "Auto Shutdown" duration. Now you are able to set any amount of time between 1 minute to 23:59 hours.
Next time you'll turn on the switcher from the Home App it will be turned ON only for the amount of time you've set in HomeKit.

Choosing valve will also track your power consumption.<br>
**Eve app only**: history and stats and will even calculate yearly costs after it collected enough data.

Read more about it [here](###extras)
### Extras

Since version 1.1.0 there are a lot more exciting options for your Switcher!
First of all, I've added a lot of services to support both timer/auto-shutdown and getting information about the power consumption of the device.

All the new services are available for any accessory type that you choose (in Eve app or most of 3rd party apps).
However, in Home app it is not possible to present an accessory with all those functionalities, especially since it doesn't support power consumption.

To overcome this limit I gave you the possibility to choose what would be the best option for you to see in Home app.

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


### Custom Timers

Since Version 4 of this plugin you can create virtual switches that will turn on your boiler for X minutes. 2 seconds after turning on the boiler, the virtual switch will turn off automatically (and will not represent the state of the boiler).

This is very useful, especially since the iOS 14 bug that prevents you from setting the duration in the Home app.

Custom timers for a device:

``` json
"platforms": [
    {
      "platform": "SwitcherPlatform",
      "customTimers": [
        {
          "identifier": "24eaf5",
          "shutdownMinutes": 30
        },
        {
          "identifier": "24eaf5",
          "shutdownMinutes": 60
        }
      ]
    }
]
```

\* Only for Boiler

## Issues & Debug

#### I can see status but I can't control

Check that you have the latest firmware installed and that your homebridge machine clock is accurate.
#### When using valve, I can only see 5 and 10 minutes

This is a known iOS bug since iOS 14 release... I guess we can only wait for Apple to fix it.
in the meantime, use the Eve app to control the duration.

#### My Switcher is not showing up in HomeKit

Please verify that your Switcher device is connected to the network and under the same subnet as Homebridge.

### other


If you experience any issues with the plugins please refer to the [Issues](https://github.com/nitaybz/homebridge-switcher-platform/issues) tab or [Switcher-Boiler Discord Channel](https://discord.gg/7DyabQ6) and check if your issue is already described there, if it doesn't, please report a new issue with as much detailed information as you can give (logs are crucial).<br>
if you want to even speed up the process, you can add `"debug": true` to your config, which will give me more details on the logs and speed up fixing the issue.


<br>

## Credits

This Plugin could not be made without the extensive research of the Switcher V2 Protocol which was performed by @AviadGolan and @NightRang3r and the JS implementation of their work by @johnathanvidu.

## Support homebridge-switcher-platform

**homebridge-switcher-platform** is a free plugin under the MIT license. it was developed as a contribution to the homebridge/hoobs community with lots of love and thoughts.
Creating and maintaining Homebridge plugins consume a lot of time and effort and if you would like to share your appreciation, feel free to "Star" or donate.

<a target="blank" href="https://www.paypal.me/nitaybz"><img src="https://img.shields.io/badge/PayPal-Donate-blue.svg?logo=paypal"/></a><br>
<a target="blank" href="https://www.patreon.com/nitaybz"><img src="https://img.shields.io/badge/PATREON-Become a patron-red.svg?logo=patreon"/></a><br>
<a target="blank" href="https://ko-fi.com/nitaybz"><img src="https://img.shields.io/badge/Ko--Fi-Buy%20me%20a%20coffee-29abe0.svg?logo=ko-fi"/></a>