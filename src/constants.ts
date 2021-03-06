export const MAX_CONNECTION_RETIRES = 5

export const KEEP_ALIVE_TIMEOUT = 2 * 60 * 1000 // 2 minutes

export enum MqttCommand {
  DISARM = 'DISARM',
  ARM_HOME = 'ARM_HOME',
  ARM_AWAY = 'ARM_AWAY',
}

export enum MqttStatus {
  DISARMED = 'disarmed',
  ARMED_HOME = 'armed_home',
  ARMED_AWAY = 'armed_away',
  PENDING = 'pending',
  TRIGGERED = 'triggered',
}

export const PREAMBLE = 0x0D
export const POSTAMBLE = 0x0A
export const ACK = [0x02, 0x43]
export const CONNECTION_REQUEST = [0xAB, 0x06, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
export const EVENT_LOG_RESPONSE = [0xA0]
export const A5_RESPONSE = [0xA5]
export const A5_KEEP_ALIVE = 0x02
export const A5_TAMPER = 0x03
export const A5_EVENT = 0x04
export const A5_ENROLLED = 0x06
export const ACCESS_DENIED = [0x08, 0x43]
export const DISARM_REQUEST = (pin: number[]) => [0xA1, 0x00, 0x00, 0x00, ...pin, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
export const ARM_HOME_REQUEST = (pin: number[]) => [0xA1, 0x00, 0x00, 0x04, ...pin, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]
export const ARM_AWAY_REQUEST = (pin: number[]) => [0xA1, 0x00, 0x00, 0x05, ...pin, 0x00, 0x00, 0x00, 0x00, 0x00, 0x43]

export enum SystemStatus {
  DISARM = 0x00,
  EXIT_DELAY_1 = 0x01,
  EXIT_DELAY_2 = 0x02,
  ENTRY_DELAY = 0x03,
  ARMED_HOME = 0x04,
  ARMED_AWAY = 0x05,
  USER_TEST = 0x06,
  DOWNLOADING = 0x07,
  PROGRAMMING = 0x08,
  INSTALLER = 0x09,
  HOME_BYPASS = 0x0A,
  AWAY_BYPASS = 0x0B,
  READY = 0x0C,
  NOT_READY = 0x0D,
}

export enum SystemState {
  READY = 1,
  ALERT_IN_MEMORY = 2,
  TROUBLE = 3,
  BYPASS = 4,
  LAST_10_SEC_OF_ENTRY_OR_EXIT_DELAY = 5,
  ZONE_EVENT = 6,
  ARM_DISARM_EVENT = 7,
  ALARM_EVENT = 8,
}

export enum LogEvent {
  NONE = 0x00,
  INTERIOR_ALARM = 0x01,
  PERIMETER_ALARM = 0x02,
  DELAY_ALARM = 0x03,
  SILENT_ALARM_24_H = 0x04,
  AUDIBLE_ALARM_24_H = 0x05,
  TAMPER = 0x06,
  CONTROL_PANEL_TAMPER = 0x07,
  TAMPER_ALARM_1 = 0x08,
  TAMPER_ALARM_2 = 0x09,
  COMMUNICATION_LOSS = 0x0A,
  PANIC_FROM_KEYFOB = 0x0B,
  PANIC_FROM_CONTROL_PANEL = 0x0C,
  DURESS = 0x0D,
  CONFIRM_ALARM = 0x0E,
  GENERAL_TROUBLE = 0x0F,
  GENERAL_TROUBLE_RESTORE = 0x10,
  INTERIOR_RESTORE = 0x11,
  PERIMETER_RESTORE = 0x12,
  DELAY_RESTORE = 0x13,
  SILENT_RESTORE_24_H = 0x14,
  AUDIBLE_RESTORE_24_H = 0x15,
  TAMPER_RESTORE_1 = 0x16,
  CONTROL_PANEL_TAMPER_RESTORE = 0x17,
  TAMPER_RESTORE_2 = 0x18,
  TAMPER_RESTORE_3 = 0x19,
  COMMUNICATION_RESTORE = 0x1A,
  CANCEL_ALARM = 0x1B,
  GENERAL_RESTORE = 0x1C,
  TROUBLE_RESTORE = 0x1D,
  NOT_USED = 0x1E,
  RECENT_CLOSE = 0x1F,
  FIRE = 0x20,
  FIRE_RESTORE = 0x21,
  NO_ACTIVE = 0x22,
  EMERGENCY = 0x23,
  NO_USED = 0x24,
  DISARM_LATCHKEY = 0x25,
  PANIC_RESTORE = 0x26,
  SUPERVISION_INACTIVE = 0x27,
  SUPERVISION_RESTORE_ACTIVE = 0x28,
  LOW_BATTERY = 0x29,
  LOW_BATTERY_RESTORE = 0x2A,
  AC_FAIL = 0x2B,
  AC_RESTORE = 0x2C,
  CONTROL_PANEL_LOW_BATTERY = 0x2D,
  CONTROL_PANEL_LOW_BATTERY_RESTORE = 0x2E,
  RF_JAMMING = 0x2F,
  RF_JAMMING_RESTORE = 0x30,
  COMMUNICATIONS_FAILURE = 0x31,
  COMMUNICATIONS_RESTORE = 0x32,
  TELEPHONE_LINE_FAILURE = 0x33,
  TELEPHONE_LINE_RESTORE = 0x34,
  AUTO_TEST = 0x35,
  FUSE_FAILURE = 0x36,
  FUSE_RESTORE = 0x37,
  KEYFOB_LOW_BATTERY = 0x38,
  KEYFOB_LOW_BATTERY_RESTORE = 0x39,
  ENGINEER_RESET = 0x3A,
  BATTERY_DISCONNECT = 0x3B,
  ONE_WAY_KEYPAD_LOW_BATTERY = 0x3C,
  ONE_WAY_KEYPAD_LOW_BATTERY_RESTORE = 0x3D,
  ONE_WAY_KEYPAD_INACTIVE = 0x3E,
  ONE_WAY_KEYPAD_RESTORE_ACTIVE = 0x3F,
  LOW_BATTERY_2 = 0x40,
  CLEAN_ME = 0x41,
  FIRE_TROUBLE = 0x42,
  LOW_BATTERY_3 = 0x43,
  BATTERY_RESTORE = 0x44,
  AC_FAIL_2 = 0x45,
  AC_RESTORE_2 = 0x46,
  SUPERVISION_INACTIVE_2 = 0x47,
  SUPERVISION_RESTORE_ACTIVE_2 = 0x48,
  GAS_ALERT = 0x49,
  GAS_ALERT_RESTORE = 0x4A,
  GAS_TROUBLE = 0x4B,
  GAS_TROUBLE_RESTORE = 0x4C,
  FLOOD_ALERT = 0x4D,
  FLOOD_ALERT_RESTORE = 0x4E,
  X_10_TROUBLE = 0x4F,
  X_10_TROUBLE_RESTORE = 0x50,
  ARM_HOME = 0x51,
  ARM_AWAY = 0x52,
  QUICK_ARM_HOME = 0x53,
  QUICK_ARM_AWAY = 0x54,
  DISARM = 0x55,
  FAIL_TO_AUTO_ARM = 0x56,
  ENTER_TO_TEST_MODE = 0x57,
  EXIT_FROM_TEST_MODE = 0x58,
  FORCE_ARM = 0x59,
  AUTO_ARM = 0x5A,
  INSTANT_ARM = 0x5B,
  BYPASS = 0x5C,
  FAIL_TO_ARM = 0x5D,
  DOOR_OPEN = 0x5E,
  COMMUNICATION_ESTABLISHED_BY_CONTROL_PANEL = 0x5F,
  SYSTEM_RESET = 0x60,
  INSTALLER_PROGRAMMING = 0x61,
  WRONG_PASSWORD = 0x62,
  NOT_SYS_EVENT_1 = 0x63,
  NOT_SYS_EVENT_2 = 0x64,
  EXTREME_HOT_ALERT = 0x65,
  EXTREME_HOT_ALERT_RESTORE = 0x66,
  FREEZE_ALERT = 0x67,
  FREEZE_ALERT_RESTORE = 0x68,
  HUMAN_COLD_ALERT = 0x69,
  HUMAN_COLD_ALERT_RESTORE = 0x6A,
  HUMAN_HOT_ALERT = 0x6B,
  HUMAN_HOT_ALERT_RESTORE = 0x6C,
  TEMPERATURE_SENSOR_TROUBLE = 0x6D,
  TEMPERATURE_SENSOR_TROUBLE_RESTORE = 0x6E,
}

export enum ZoneEvent {
  NONE = 0x00,
  TAMPER_ALARM = 0x01,
  TAMPER_RESTORE = 0x02,
  OPEN = 0x03,
  CLOSED = 0x04,
  VIOLATED = 0x05, // Motion
  PANIC_ALARM = 0x06,
  RF_JAMMING = 0x07,
  TAMPER_OPEN = 0x08,
  COMMUNICATION_FAILURE = 0x09,
  LINE_FAILURE = 0x0A,
  FUSE = 0x0B,
  NOT_ACTIVE = 0x0C,
  LOW_BATTERY = 0x0D,
  AC_FAILURE = 0x0E,
  FIRE_ALARM = 0x0F,
  EMERGENCY = 0x10,
  SIREN_TAMPER = 0x11,
  SIREN_TAMPER_RESTORE = 0x12,
  SIREN_LOW_BATTERY = 0x13,
  SIREN_AC_FAILURE = 0x14,
}

export enum ZoneUser {
  SYSTEM = 0X00,
  ZONE_1 = 0x01,
  ZONE_2 = 0x02,
  ZONE_3 = 0x03,
  ZONE_4 = 0x04,
  ZONE_5 = 0x05,
  ZONE_6 = 0x06,
  ZONE_7 = 0x07,
  ZONE_8 = 0x08,
  ZONE_9 = 0x09,
  ZONE_10 = 0x0A,
  ZONE_11 = 0x0B,
  ZONE_12 = 0x0C,
  ZONE_13 = 0x0D,
  ZONE_14 = 0x0E,
  ZONE_15 = 0x0F,
  ZONE_16 = 0X10,
  ZONE_17 = 0x11,
  ZONE_18 = 0x12,
  ZONE_19 = 0x13,
  ZONE_20 = 0x14,
  ZONE_21 = 0x15,
  ZONE_22 = 0x16,
  ZONE_23 = 0x17,
  ZONE_24 = 0x18,
  ZONE_25 = 0x19,
  ZONE_26 = 0x1A,
  ZONE_27 = 0x1B,
  ZONE_28 = 0x1C,
  ZONE_29 = 0x1D,
  ZONE_30 = 0x1E,
  KEYFOB1 = 0X1F,
  KEYFOB2 = 0X20,
  KEYFOB3 = 0X21,
  KEYFOB4 = 0X22,
  KEYFOB5 = 0X23,
  KEYFOB6 = 0X24,
  KEYFOB7 = 0X25,
  KEYFOB8 = 0X26,
  USER1 = 0X27,
  USER2 = 0X28,
  USER3 = 0X29,
  USER4 = 0X2A,
  USER5 = 0X2B,
  USER6 = 0X2C,
  USER7 = 0X2D,
  USER8 = 0X2E,
  WIRELESS_COMMANDER1 = 0X2F,
  WIRELESS_COMMANDER2 = 0X30,
  WIRELESS_COMMANDER3 = 0X31,
  WIRELESS_COMMANDER4 = 0X32,
  WIRELESS_COMMANDER5 = 0X33,
  WIRELESS_COMMANDER6 = 0X34,
  WIRELESS_COMMANDER7 = 0X35,
  WIRELESS_COMMANDER8 = 0X36,
  WIRELESS_SIREN1 = 0x37,
  WIRELESS_SIREN2 = 0x38,
  TWO_WAY_WIRELESS_KEYPAD1 = 0x39,
  TWO_WAY_WIRELESS_KEYPAD2 = 0x3A,
  TWO_WAY_WIRELESS_KEYPAD3 = 0x3B,
  TWO_WAY_WIRELESS_KEYPAD4 = 0x3C,
  X10_1 = 0x3D,
  X10_2 = 0x3E,
  X10_3 = 0x3F,
  X10_4 = 0x40,
  X10_5 = 0x41,
  X10_6 = 0x42,
  X10_7 = 0x43,
  X10_8 = 0x44,
  X10_9 = 0x45,
  X10_10 = 0x46,
  X10_11 = 0x47,
  X10_12 = 0x48,
  X10_13 = 0x49,
  X10_14 = 0x4A,
  X10_15 = 0x4B,
  pgm = 0x4C,
  gsm = 0x4D,
  POWERLINK = 0x4E,
  PROXY_TAG1 = 0x4F,
  PROXY_TAG2 = 0x50,
  PROXY_TAG3 = 0x51,
  PROXY_TAG4 = 0x52,
  PROXY_TAG5 = 0x53,
  PROXY_TAG6 = 0x54,
  PROXY_TAG7 = 0x55,
  PROXY_TAG8 = 0x56,
}
