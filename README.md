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

The plugin will automatically expose all your Switcher devices and add them to HomeKit.

#### NEW
Multiple devices can be added as long as you can supply one of: **`device ID`** OR **`IP`** OR **`device name`**

## The Super-Fast Version 3.0 !

After the failure of version 2 to bring multiple Switcher devices into HomeKit, The plugin was completely refactored (again...) and is now a **PLATFORM** instead of accessory plugin.

The platform plugin allows you to run one instance with one listening socket for all Switcher devices (with no conflicts).

The plugin still maintain the old rule where you don't have to take any prior steps! it will detect and add **ALL** your switcher devices without any details from your side.

One more addition to this version is the ability to set any duration from 1 minute. From now on the plugin will manage it's own default duration and will not affect the "Auto Shutdown" default in the Switcher app.

**To upgrade from older versions, do the following:**

1. Uninstall the plugin and remove from config.
2. Restart HomeBridge
3. Install the plugin (Make sure you are on version 3)
4. Create new switcher config in the platform section
5. Restart HomeBridge


### from version 2:

**The plugin is now JavaScript only!** which means, no dependency on python and better compatibility with all operating systems.

You can now add safely more than one accessory, including Switcher smart sockets.

Now, the plugin is always listening to the Switcher device and will always get status updates from the device every few seconds. Therefore `pollingIntervalInSec` is deprecated.



# Installation


This plugin is HomeBridge verified and [HOOBS](https://hoobs.org/?ref=10876) certified and can be easily installed and configured through their UI.

If you don't use Homebridge UI or HOOBS, keep reading:


1. Install homebridge using: `sudo npm install -g homebridge --unsafe-perm`
2. Install this plugin using: `sudo npm install -g homebridge-switcher-boiler`
3. Update your configuration file. See `config-sample.json` in this repository for a sample.

## Config File Examples

#### Easy Config

``` json
"platforms": [
    {
      "platform": "SwitcherBoiler",
      "accessoryType": "switch"
    }
]
```

#### Advanced config (optional)

###### * Do not copy-paste this code, it will not work!

``` json
"platforms": [
    {
      "platform": "SwitcherBoiler",
      "name": "Switcher Boiler",
      "accessoryType": "outlet",
      "debug": false,
      "secondsToRemove": 600,
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
      ]
    }
]
```

### Configurations Table

\* advanced details below

|             Parameter            |                       Description                       |  Default |   type   |
| -------------------------------- | ------------------------------------------------------- |:--------:|:--------:|:--------:|
| `platform`  | always `"SwitcherBoiler"` |     -    |  String  |
| `name`      | Platform name for logs  | `"SwitcherBolier"`    |  String  |
| `accessoryType`        | Default type of accessory (`"switch"`, `"outlet"`, `"valve"`) for a new device. read more below...|  `"switch"`  |  String  |
| `secondsToRemove`  |  Time in seconds to remove a device if it has not being discovered. set to 0 to not remove accessories at all.   |  `600` |  Integer |
| `debug`       |  When set to `true`, the plugin will produce extra logs for debugging purposes        |  `false` |  Boolean  |
| **Devices** | List of devices for custom settings (with the below information)| | Array| 
| `Identifier`        | Can be Device ID, Device IP or Device Name. Needed in order to identify the device if you wish to set custom settings. |         |  String  |
| `accessoryType`        | Specific device type of accessory (`"switch"`, `"outlet"`, `"valve"`). read more below...|  `"switch"`  |  String  |
| `hide`| Set to `true` to remove this device from HomeKit | `false` |  Boolean  |

# Advanced Control

## Auto Detect Configurations & Multiple Accessories

The plugin will scan and listen for messages from all your Switcher devices. When a message is received from a new Switcher device, the plugin will automatically add it to HomeKit in the form of a switch if not mentioned otherwise in `accessoryType` (read more [here](###accessory-types)).

To change the device icon and functionality continue reading...

## Advanced Config

As mentioned above, the plugin will automatically add all devices as Switch Accessories (unless mentioned otherwise in the config under `accessoryType`)

it's possible to set specific icon for a specific device.
To achieve that you'll need to add `devices` to your config.

Example:

``` json
"platforms": [
    {
      "platform": "SwitcherBoiler",
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
      "platform": "SwitcherBoiler",
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
      "platform": "SwitcherBoiler",
      "devices": [
        {
          "identifier": "e4eaf6",
          "hide": true
        }
      ]
    }
]
```

### Accessory Types



### Accessory Types
`accessoryType` can be define both in the plugin level and in the device level.

When a new device is discovered it will first look if `accessoryType` is defined in `devices` with it's own `identifier`, if not, it will look for `accessoryType` in the plugin level. if neither of those has been set, the plugin will use switch as default.

Accessory Type for specific device:

``` json
"platforms": [
    {
      "platform": "SwitcherBoiler",
      "devices": [
        {
          "identifier": "e4eaf6",
          "accessoryType": "outlet"
        }
      ]
    }
]
```


Accessory Type for all devices:

``` json
"platforms": [
    {
      "platform": "SwitcherBoiler",
      "accessoryType": "outlet"
    }
]
```


#### Switch (default)
When you just want a normal switch (like version 1) and don't need anything else. (all [extra services](###extras) will still appear in 3rd party apps)

#### Outlet
Choose `"accessoryType": "outlet"` if you are most interested in the power consumption stats and automations. Outlet accessory will reveal the service "In Use" which will only be active if your boiler is ON and consume energy. it will not be active when the boiler has reached it's temperature limit and no power is used (even if the switcher is ON -  accessory will show on but not "in use").<br>
Choosing outlet will also track your power consumption.<br>
**Eve app only**: history and stats and will even calculate yearly costs after it collected enough data.

Read more about it [here](###extras)


#### Water Valve
Choosing `"accessoryType": "valve"` will give you the possibility to control your auto-shutdown time from the Home app and therefore affect the time the device will be on before forcing shutdown.


~~You should be **AWARE** that changing the duration time in HomeKit will affect in changing your auto-shutdown time in Switcher which will of course affect the auto-shutdown time even when you turn the device manually.~~

Since version 3, The plugin manage it's own "Auto Shutdown" duration. Now you are able to set any amount of time between 1 minute to 23:59 hours.
Next time you'll turn on the switcher from the Home App it will be turned ON only for the amount of time you've set in HomeKit.

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