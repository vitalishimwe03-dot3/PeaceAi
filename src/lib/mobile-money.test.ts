import { describe, expect, it } from 'vitest'
import { detectMobileMoneyNetwork, normalizeRwandanPhone } from './mobile-money'

describe('normalizeRwandanPhone', () => {
  it('normalizes local MTN numbers to 250 format', () => {
    expect(normalizeRwandanPhone('0781 234 567')).toBe('250781234567')
    expect(normalizeRwandanPhone('+250 078 123 4567')).toBe('250781234567')
    expect(normalizeRwandanPhone('250781234567')).toBe('250781234567')
  })

  it('normalizes Airtel numbers', () => {
    expect(normalizeRwandanPhone('0731234567')).toBe('250731234567')
  })

  it('rejects invalid or unsupported numbers', () => {
    expect(normalizeRwandanPhone('123')).toBeNull()
    expect(normalizeRwandanPhone('0761234567')).toBeNull()
    expect(normalizeRwandanPhone('+250771234567')).toBeNull()
  })
})

describe('detectMobileMoneyNetwork', () => {
  it('detects MTN and Airtel from the number', () => {
    expect(detectMobileMoneyNetwork('0781234567')).toBe('MTN')
    expect(detectMobileMoneyNetwork('0721234567')).toBe('MTN')
    expect(detectMobileMoneyNetwork('0791234567')).toBe('MTN')
    expect(detectMobileMoneyNetwork('0731234567')).toBe('AIRTEL')
    expect(detectMobileMoneyNetwork('invalid')).toBeNull()
  })
})
