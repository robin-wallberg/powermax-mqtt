import * as mqtt from 'mqtt'
import * as path from 'path'
import * as SerialPort from 'serialport'
import * as winston from 'winston'
import * as PowerMax from './powermax'
import { getPinBytes } from './utils'

export interface IConfiguration {
  pinBytes: number[],
  serialPort: string,
  motionTimeout: number,
  mqttUrl: string,
  mqttTopic: string,
  mqttCommandTopic: string,
}

const logger = new (winston.Logger)({
  level: 'debug',
  transports: [
    new (winston.transports.Console)({
      timestamp: true,
    }),
    new (winston.transports.File)({
      filename: path.join('log', 'powermax.log'),
      json: false,
      timestamp: true,
    }),
  ],
})

const mqttTopic = process.env.MQTT_TOPIC || 'PowerMax'

const config: IConfiguration = {
  pinBytes: getPinBytes(process.env.USER_CODE || '0000'),
  serialPort: process.env.SERIAL_PORT || '/dev/ttyUSB0',
  motionTimeout: (process.env.MOTION_TIMEOUT ? Number(process.env.MOTION_TIMEOUT) : 120) * 1000, // 2 minutes default
  mqttUrl: process.env.MQTT_URL || 'mqtt://localhost',
  mqttTopic,
  mqttCommandTopic: `${mqttTopic}/set`
}

const serialPort = new SerialPort(config.serialPort, {
  baudRate: 9600,
  dataBits: 8,
  stopBits: 1,
  parity: 'none',
  autoOpen: false,
})

const mqttClient = mqtt.connect(config.mqttUrl)
mqttClient.on('connect', () => {
  logger.debug('Subscribing to', config.mqttCommandTopic)
  mqttClient.subscribe(config.mqttCommandTopic)
})

PowerMax.start({
  serialPort,
  mqttClient,
  config,
  logger,
})
