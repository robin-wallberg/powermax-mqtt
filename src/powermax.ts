import { MqttClient } from 'mqtt'
import * as SerialPort from 'serialport'
import * as winston from 'winston'
import {
  A5_ENROLLED,
  A5_EVENT,
  A5_KEEP_ALIVE,
  A5_RESPONSE,
  A5_TAMPER,
  ACCESS_DENIED,
  ACK,
  ARM_AWAY_REQUEST,
  ARM_HOME_REQUEST,
  CONNECTION_REQUEST,
  DISARM_REQUEST,
  EVENT_LOG_RESPONSE,
  KEEP_ALIVE_TIMEOUT,
  LogEvent,
  MAX_CONNECTION_RETIRES,
  MqttCommand,
  MqttStatus,
  POSTAMBLE,
  PREAMBLE,
  SystemState,
  SystemStatus,
  ZoneEvent,
  ZoneUser,
} from './constants'
import { IConfiguration } from './index'
import { calculateChecksum, getSetBits, getSystemStates, startsWith, toHexString, zeroPad } from './utils'
import Timer = NodeJS.Timer

export interface IZone {
  id: number,
  enrolled: boolean,
  open: boolean,
  bypassed: boolean,
  lowBattery: boolean,
  motion: boolean,
  tamper: boolean,
}

export interface IZoneMotionTimers {
  [zoneId: number]: Timer
}

interface IStartParameters {
  serialPort: SerialPort,
  mqttClient: MqttClient,
  config: IConfiguration,
  logger: winston.LoggerInstance,
}

let serialPort: SerialPort
let mqttClient: MqttClient
let config: IConfiguration
let logger: winston.LoggerInstance

let connectionAttempt: number = 0
let initiated: boolean = false
let keepAliveTimeout: Timer = null

const zones: IZone[] = []
const zoneResetMotionTimers: IZoneMotionTimers = {}

export function start(parameters: IStartParameters) {
  serialPort = parameters.serialPort
  mqttClient = parameters.mqttClient
  config = parameters.config
  logger = parameters.logger
  createZones()
  serialPort.on('data', handleSerialPortData)
  serialPort.on('error', handleSerialPortError)
  mqttClient.on('message', handleMqttMessage)
  connectToPowerMax()
}

function createZones() {
  for (let zoneId = 1; zoneId <= 30; zoneId += 1) {
    zones.push({
      id: zoneId,
      enrolled: false,
      open: false,
      bypassed: false,
      lowBattery: false,
      motion: false,
      tamper: false,
    })
  }
}

function connectToPowerMax() {
  connectionAttempt += 1
  if (connectionAttempt <= MAX_CONNECTION_RETIRES) {
    serialPort.open(handleSerialPortOpen)
  } else {
    logger.error(
      `Could not connect to ${config.serialPort}, gave up after ${MAX_CONNECTION_RETIRES} retires`,
    )
    process.exit(1)
  }
}

function sendConnectionRequest() {
  keepAliveTimeout = setTimeout(sendConnectionRequest, KEEP_ALIVE_TIMEOUT)
  sendMessage(CONNECTION_REQUEST)
}

function handleSerialPortOpen(error: Error) {
  if (error) {
    logger.debug(`Error opening port: ${error.message}`)
    setTimeout(connectToPowerMax, 3000)
    return
  }
  sendConnectionRequest()
}

function handleSerialPortData(data: Buffer) {
  const uint8Array = new Uint8Array(data)
  const bytes: number[] = [...uint8Array.values()]
  // logger.debug(`GETTING ${toHexString(uint8Array)}`)

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
}

function handleSerialPortError(error: Error) {
  logger.error('Serial port error', error)
}

function handleMessage(message: number[]) {
  if (startsWith(message, ACK)) {
    return
  }
  sendMessage(ACK)

  if (startsWith(message, EVENT_LOG_RESPONSE)) {
    handleEventLogResponse(message)
  } else if (startsWith(message, A5_RESPONSE)) {
    handleA5Event(message)
  } else if (startsWith(message, ACCESS_DENIED)) {
    logger.warn('ACCESS DENIED!')
  } else {
    logger.debug(`UNKNOWN: ${toHexString(new Uint8Array(message))}`)
  }
}

function sendMessage(message: number[]) {
  const checksum = calculateChecksum(message)
  // logger.debug(`SENDING ${toHexString(new Uint8Array([PREAMBLE, ...message, checksum, POSTAMBLE]))}`)
  serialPort.write(Buffer.from([PREAMBLE, ...message, checksum, POSTAMBLE]), 'hex')
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

  logger.debug(`* LOG ${currentMessageNumber}/${totalNumberOfMessages} - ${date} ${time}: ${zoneUser} ${event}`)
}

function handleA5Event(message: number[]) {
  switch (message[2]) {
    case A5_KEEP_ALIVE:
      handleKeepAliveMessage(message)
      break
    case A5_TAMPER:
      handleTamperMessage(message)
      break
    case A5_EVENT:
      handleEventMessage(message)
      break
    case A5_ENROLLED:
      handleEnrolledMessage(message)
      break
    default:
      logger.warn(`UNKNOWN A5 message: ${toHexString(new Uint8Array(message))}`)
  }
  if (!initiated && message[1] === message[2]) {
    initiated = true
    zones
      .filter(zone => zone.enrolled)
      .forEach(zone => publishZone(zone))
  }
}

function handleKeepAliveMessage(message: number[]) {
  if (keepAliveTimeout) {
    clearTimeout(keepAliveTimeout)
    keepAliveTimeout = setTimeout(sendConnectionRequest, KEEP_ALIVE_TIMEOUT)
  }
  const zonesOpen = getSetBits(message.slice(3, 7))
  const zonesLowBattery = getSetBits(message.slice(7, 11))
  zones.forEach(zone => {
    updateZone(zone, () => {
      zone.open = zonesOpen.includes(zone.id)
      zone.lowBattery = zonesLowBattery.includes(zone.id)
    })
  })
  logger.debug(`* KEEP ALIVE -> Zones open: ${zonesOpen}, low battery: ${zonesLowBattery}`)
}

function handleTamperMessage(message: number[]) {
  const zonesStatus = getSetBits(message.slice(3, 7))  // TODO Which status?
  const zonesTamper = getSetBits(message.slice(7, 11))
  zones.forEach(zone => {
    updateZone(zone, () => zone.tamper = zonesTamper.includes(zone.id))
  })
  logger.debug(`Zones status: ${zonesStatus}, tamper: ${zonesTamper}`)
}

function handleEventMessage(message: number[]) {
  const systemStatus = SystemStatus[message[3]]
  const systemStates = getSystemStates(message[4])
  handleSystemStatus(message[3])
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
}

function handleEnrolledMessage(message: number[]) {
  const enrolledZones = getSetBits(message.slice(3, 7))
  const bypassedZones = getSetBits(message.slice(7, 11))
  zones.forEach(zone => {
    updateZone(zone, () => {
      zone.enrolled = enrolledZones.includes(zone.id)
      zone.bypassed = bypassedZones.includes(zone.id)
    })
  })
}

function updateZone(zone: IZone, updateFunction: () => void) {
  const previousZoneState = initiated && JSON.stringify(zone)
  updateFunction()
  if (initiated && JSON.stringify(zone) !== previousZoneState) {
    publishZone(zone)
  }
}

function publishZone(zone: IZone) {
  const topic = `${config.mqttTopic}/${zone.id}`
  const data = JSON.stringify(zone, null, 2)
  logger.info(`MQTT publish: ${topic} -> ${data}`)
  mqttClient.publish(topic, data)
}

function handleSystemStatus(systemStatus: number) {
  switch (systemStatus) {
    case SystemStatus.ARMED_AWAY:
      mqttClient.publish(config.mqttTopic, MqttStatus.ARMED_AWAY)
      break
    case SystemStatus.ARMED_HOME:
      mqttClient.publish(config.mqttTopic, MqttStatus.ARMED_HOME)
      break
    case SystemStatus.DISARM:
      mqttClient.publish(config.mqttTopic, MqttStatus.DISARMED)
      break
    case SystemStatus.ENTRY_DELAY:
    case SystemStatus.EXIT_DELAY_1:
    case SystemStatus.EXIT_DELAY_2:
      mqttClient.publish(config.mqttTopic, MqttStatus.PENDING)
      break
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
      zone.motion = true
      handleZoneViolatedEvent(zone)
      break
    case ZoneEvent.LOW_BATTERY:
      zone.lowBattery = true
      break
    default:
      logger.warn(`Can not handle zone event: ${ZoneEvent[event]} for zone: ${JSON.stringify(zone, null, 2)}`)
  }
  if (initiated && JSON.stringify(zone) !== previousZoneState) {
    publishZone(zone)
  }
}

function handleZoneViolatedEvent(zone: IZone) {
  const currentTimerId = zoneResetMotionTimers[zone.id]
  if (currentTimerId) {
    clearTimeout(currentTimerId)
  }
  zoneResetMotionTimers[zone.id] = setTimeout(
    resetViolatedZone.bind(null, zone),
    config.motionTimeout,
  )
}

function resetViolatedZone(zone: IZone) {
  zoneResetMotionTimers[zone.id] = null
  const previousZoneState = initiated && JSON.stringify(zone)
  zone.motion = false
  if (initiated && JSON.stringify(zone) !== previousZoneState) {
    publishZone(zone)
  }
}

function handleMqttMessage(topic: string, payload: Buffer) {
  if (topic === config.mqttCommandTopic) {
    const command = payload.toString()
    logger.debug('MQTT TOPIC:', topic, ' MESSAGE:', payload.toString())
    switch (command) {
      case MqttCommand.DISARM:
        sendMessage(DISARM_REQUEST(config.pinBytes))
        break
      case MqttCommand.ARM_HOME:
        sendMessage(ARM_HOME_REQUEST(config.pinBytes))
        break
      case MqttCommand.ARM_AWAY:
        sendMessage(ARM_AWAY_REQUEST(config.pinBytes))
        break
    }
  }
}
