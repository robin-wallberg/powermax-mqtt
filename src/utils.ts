import { SystemState } from './constants'

export function calculateChecksum(bytes: number[]): number {
  let checksum = bytes.reduce((sum, byte) => {
    return sum + byte
  }, 0)
  checksum = checksum % 255
  if (checksum % 0xFF !== 0) {
    checksum = checksum ^ 0xFF
  }
  return checksum
}

export function startsWith(message: number[], partialMessage: number[]) {
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

export function getSystemStates(byte: number): string[] {
  return getSetBits([byte]).map(bit => SystemState[bit])
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

export function getSetBits(bytes: number[]): number[] {
  return bytes.reduce((bits, bit, index) => {
    return [...bits, ...getBits(bytes[index], index * 8)]
  }, [])
}

export function zeroPad(n: string, width: number) {
  return n.length >= width ? n : new Array(width - n.length + 1).join('0') + n
}

export function toHexString(byteData: Uint8Array) {
  const hex = [...byteData].map(byte => zeroPad(byte.toString(16), 2))
  return `<${hex.join(' ').toUpperCase()}>`
}

export function getPinBytes(pin: string) {
  return [parseInt(pin.substr(0, 2), 16), parseInt(pin.substr(2, 2), 16)]
}
