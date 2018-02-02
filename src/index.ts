import * as mqtt from 'mqtt'
import * as SerialPort from 'serialport'
import * as winston from 'winston'

import { LogEvent, SystemState, SystemStatus, ZoneEvent, ZoneUser } from './constants'

const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
    }),
    new (winston.transports.File)({
      filename: 'powermax.log',
      json: false,
      timestamp: true,
    }),
  ],
})

// Available configuration
const comPort = process.env.SERIAL_PORT || '/dev/ttyUSB0'
const mqttURL = process.env.MQTT_URL || 'mqtt://localhost'
const mqttTopic = process.env.MQTT_TOPIC || 'PowerMax'

const mqttClient = mqtt.connect(mqttURL)
mqttClient.on('connect', () => {
  logger.debug('MQTT is connected')
  mqttClient.subscribe(mqttTopic)
  // mqttClient.publish('presence', 'Hello mqtt')
})

mqttClient.on('message', (topic, message) => {
  logger.debug('MQTT TOPIC:', topic, ' MESSAGE:', message.toString())
  mqttClient.end()
})

const serialPort = new SerialPort(comPort, {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  // rtscts: true,
  lock: false,
  autoOpen: false,
  bindingOptions: {
    vtime: 10000,
    vmin: 2,
  },
})

const MAX_CONNECTION_RETIRES = 5

const PREAMBLE = 0x0D
const POSTAMBLE = 0x0A

const ACK = [0x02, 0x43]

const PIN = [0x12, 0x34]

const CONNECTION_REQUEST = [0xAB, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
const ENROLLMENT_REQUEST = [0xAB, 0x0A, 0x00, 0x01, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
const ENROLLMENT_RESPONSE = [0xAB, 0x0A, 0x00, 0x00, ...PIN, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]

const EVENT_LOG_REQUEST = [0xA0, 0x00, 0x00, 0x00, ...PIN, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
const EVENT_LOG_RESPONSE = [0xA0]

const STATUS_UPDATE_REQUEST = [0xA2, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]

const A5_RESPONSE = [0xA5]
const A5_KEEP_ALIVE = 0x02
const A5_TAMPER = 0x03
const A5_EVENT = 0x04
const A5_ENROLLED = 0x06

const ACCESS_DENIED = [0x08, 0x43]

interface IZone {
  id: number,
  enrolled: boolean,
  open: boolean,
  bypassed: boolean,
  lowBattery: boolean,
  violated: boolean,
  tamper: boolean,
}

// In memory state

// Will be initiated when the first status report is handled
let initiated = false

const zones: IZone[] = []

function createZones() {
  for (let zoneId = 1; zoneId <= 30; zoneId += 1) {
    zones.push({
      id: zoneId,
      enrolled: false,
      open: false,
      bypassed: false,
      lowBattery: false,
      violated: false,
      tamper: false,
    })
  }
}

createZones()

serialPort.on('error', error => {
  logger.error('ERROR', error)
})

let connectionRetries = 0

connectToPowermax()
function connectToPowermax() {
  connectionRetries += 1
  if (connectionRetries <= MAX_CONNECTION_RETIRES) {
    serialPort.open(error => {
      if (error) {
        logger.debug(`Error opening port: ${error.message}`)
        setTimeout(connectToPowermax, 3000)
        return
      }
      logger.debug('ITS OPEN!!!')
      sendMessage(CONNECTION_REQUEST)
    })
  }
}

function zeroPad(n: string, width: number) {
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n
}

function toHexString(byteData: Uint8Array) {
  const hex = [...byteData].map(byte => zeroPad(byte.toString(16), 2))
  return `<${hex.join(' ').toUpperCase()}>`
}

serialPort.on('data', (data: Buffer) => {

  const uint8Array = new Uint8Array(data)
  logger.debug(`GETTING ${toHexString(uint8Array)}`)

  const bytes: number[] = [...uint8Array.values()]

  if (bytes[0] !== PREAMBLE || bytes[bytes.length - 1] !== POSTAMBLE) {
    logger.error('Not a valid message')
    return
  }

  const checksum = bytes.slice(bytes.length - 2)[0]
  const payload = bytes.slice(1, bytes.length - 2)
  const calculatedChecksum = calculateChecksum(payload)
  if (checksum === calculatedChecksum) {
    handleMessage(payload)
  } else {
    logger.error('CHECKSUM WAS NOT CORRECT!')
  }
})

function handleMessage(message: number[]) {

  if (startsWith(message, ACK)) {
    return
  }

  ackMessage()

  if (startsWith(message, ENROLLMENT_REQUEST)) {
    sendMessage(ENROLLMENT_RESPONSE)
  } else if (startsWith(message, EVENT_LOG_RESPONSE)) {
    handleEventLogResponse(message)
  } else if (startsWith(message, A5_RESPONSE)) {
    handleA5Event(message)
  } else {
    logger.debug('UNKNOWN MESSAGE')
  }
}

// A5 events can be both a general event (second byte = 0) or
// a status updated were second byte = number of messages
function handleA5Event(message: number[]) {
  switch (message[2]) {
    case A5_KEEP_ALIVE:
      const zonesOpen = getZoneBits(message.slice(3, 7))
      const zonesLowBattery = getZoneBits(message.slice(7, 11))
      zones.forEach(zone => {
        const previousZoneState = JSON.stringify(zone)
        zone.open = zonesOpen.includes(zone.id)
        zone.lowBattery = zonesLowBattery.includes(zone.id)
        if (initiated && JSON.stringify(zone) !== previousZoneState) {
          publishZone(zone)
        }
      })
      logger.debug(`Zones open: ${zonesOpen}, low battery: ${zonesLowBattery}`)
      break
    case A5_TAMPER:
      const zonesStatus = getZoneBits(message.slice(3, 7))  // TODO Which status?
      const zonesTamper = getZoneBits(message.slice(7, 11))
      zones.forEach(zone => {
        const previousZoneState = JSON.stringify(zone)
        zone.tamper = zonesTamper.includes(zone.id)
        if (initiated && JSON.stringify(zone) !== previousZoneState) {
          publishZone(zone)
        }
      })
      logger.debug(`Zones status: ${zonesStatus}, tamper: ${zonesTamper}`)
      break
    case A5_EVENT:
      const systemStatus = SystemStatus[message[3]]
      const systemStates = getSystemStates(message[4])
      if (systemStates.includes(SystemState[SystemState.ZONE_EVENT])) {
        const zoneId = message[5]
        const zoneEvent = message[6]
        logger.debug(
          `*** System status ${systemStatus},states: ${systemStates}, zone: ${zoneId}, event: ${ZoneEvent[zoneEvent]}`,
        )
        initiated && handleZoneEvent(zones[zoneId - 1], zoneEvent)
      } else {
        logger.debug(
          `*** System status ${systemStatus}, states: ${systemStates}`,
        )
      }
      break
    case A5_ENROLLED:
      const enrolledZones = getZoneBits(message.slice(3, 7))
      const bypassedZones = getZoneBits(message.slice(7, 11))
      zones.forEach(zone => {
        const previousZoneState = JSON.stringify(zone)
        zone.enrolled = enrolledZones.includes(zone.id)
        zone.bypassed = bypassedZones.includes(zone.id)
        if (initiated && JSON.stringify(zone) !== previousZoneState) {
          publishZone(zone)
        }
      })
      break
    default:
      logger.warn('Ignoring this A5 message')
  }
  if (!initiated && message[1] === message[2]) {
    logger.debug('Last message of status event, publish zones to MQTT')
    initiated = true
    zones
      .filter(zone => zone.enrolled)
      .forEach(zone => publishZone(zone))
  }
}

function handleZoneEvent(zone: IZone, event: number) {
  const previousZoneState = JSON.stringify(zone)
  switch (event) {
    case ZoneEvent.TAMPER_ALARM:
      zone.tamper = true
      break
    case ZoneEvent.TAMPER_RESTORE:
      zone.tamper = false
      break
    case ZoneEvent.OPEN:
      zone.open = true
      break
    case ZoneEvent.CLOSED:
      zone.open = false
      break
    case ZoneEvent.VIOLATED:
      zone.violated = true
      // TODO Start reset timer here
      break
    case ZoneEvent.LOW_BATTERY:
      zone.lowBattery = true
      break
    default:
      logger.warn(`Can not handle zone event: ${ZoneEvent[event]} for zone: ${JSON.stringify(zone, null, 2)}`)
  }

  if (JSON.stringify(zone) !== previousZoneState) {
    publishZone(zone)
  }
}

function publishZone(zone: IZone) {
  const topic = `${mqttTopic}/${zone.id}`
  const data = JSON.stringify(zone, null, 2)
  logger.info(`MQTT publish: ${topic} -> ${data}`)
  mqttClient.publish(topic, data)
}

function getSystemStates(byte: number): string[] {
  return getZoneBits([byte]).map(bit => SystemState[bit])
}

function getBits(byte: number, offset: number = 0): number[] {
  const binaryByte = zeroPad(byte.toString(2), 8)
  return binaryByte
    .split('')
    .reverse()
    .reduce((positions, bit, index) => {
      if (bit === '1') {
        positions.push(index)
      }
      return positions
    }, [])
    .map(index => index + offset + 1)
}

function getZoneBits(bytes: number[]): number[] {
  return bytes.reduce((bits, bit, index) => {
    return [...bits, ...getBits(bytes[index], index * 8)]
  }, [])
}

function handleEventLogResponse(message: number[]) {
  const totalNumberOfMessages = message[1]
  const currentMessageNumber = message[2]
  const seconds = message[3].toString()
  const minutes = message[4].toString()
  const hours = message[5].toString()
  const dayOfMonth = message[6].toString()
  const month = message[7].toString()
  const year = 2000 + message[8]
  const zoneUser = ZoneUser[message[9]]
  const event = LogEvent[message[10]]

  const time = `${zeroPad(hours, 2)}:${zeroPad(minutes, 2)}:${zeroPad(seconds, 2)}`
  const date = `${year}-${zeroPad(month, 2)}-${zeroPad(dayOfMonth, 2)}`

  logger.debug(`* LOG EVENT ${currentMessageNumber}/${totalNumberOfMessages} - ${date} ${time}: ${zoneUser} ${event}`)
}

function startsWith(message: number[], partialMessage: number[]) {
  if (message.length < partialMessage.length) {
    return false
  }
  for (let i = 0; i < partialMessage.length; i++) {
    if (message[i] !== partialMessage[i]) {
      return false
    }
  }
  return true
}

function ackMessage() {
  sendMessage(ACK)
}

function sendMessage(message: number[]) {
  const checksum = calculateChecksum(message)
  logger.debug(`SENDING ${toHexString(new Uint8Array([PREAMBLE, ...message, checksum, POSTAMBLE]))}`)
  serialPort.write(Buffer.from([PREAMBLE, ...message, checksum, POSTAMBLE]), 'hex')
}

function calculateChecksum(bytes: number[]): number {
  let checksum = bytes.reduce((sum, byte) => {
    return sum + byte
  }, 0)
  checksum = checksum % 255
  if (checksum % 0xFF !== 0) {
    checksum = checksum ^ 0xFF
  }
  return checksum
}
