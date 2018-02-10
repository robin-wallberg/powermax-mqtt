# Visonic PowerMax MQTT interface #
To be used with Home Assistant.

Tested on a Visonic PowerMax Complete.

Implemented using  protocol description found at:
https://www.domoticaforum.eu/viewtopic.php?f=68&t=6581&sid=1acd634aa4f71212ec7d6d58c91751b2

## Usage ##
Connect the PowerMax to a USB RS232 converter, e.g.:
https://www.electrokit.com/usbseriellomvandlare-bbch340t.53189

See https://www.domoticz.com/forum/viewtopic.php?f=38&t=11134 for more information on how to connect the pins.

### Environment variables ###
 - USER_CODE - The user code to use for arming/disarming
 - SERIAL_PORT - Serial port to use, default: /dev/ttyUSB0
 - MOTION_TIMEOUT - Timeout in seconds before resetting a PIR motion event, default: 120
 - MQTT_URL - MQTT broker URL, e.g. mqtt://192.168.1.123
 - MQTT_TOPIC - MQTT Topic to use, default: PowerMax. Will publish zone events to PowerMax/(1-30).

Example of a zone event published to PowerMax/3:
```json
{
  "id": 3,
  "enrolled": true,
  "open": false,
  "bypassed": false,
  "lowBattery": false,
  "motion": false,
  "tamper": false
}
```

Example of a Home Assistant binary MQTT sensor for zone events:
```yaml
- platform: mqtt
  name: "Front Door"
  state_topic: "PowerMax/3"
  device_class: door
  payload_on: true
  payload_off: false
  value_template: '{{ value_json.open }}'
- platform: mqtt
  name: "Front Door Battery"
  state_topic: "PowerMax/3"
  device_class: battery
  payload_on: true
  payload_off: false
  value_template: '{{ value_json.lowBattery }}'
```

Home Assistant MQTT Alarm Panel:
```yaml
alarm_control_panel:
  - platform: mqtt
    name: Larm
    state_topic: "PowerMax"
    command_topic: "PowerMax/set"
```
