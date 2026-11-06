export type MobileMoneyNetwork = 'MTN' | 'AIRTEL'

const MTN_PREFIXES = ['072', '078', '079'] as const
const AIRTEL_PREFIXES = ['073'] as const

export function normalizeRwandanPhone(value: string): string | null {
  const digits = value.replace(/\D/g, '')
  let national = ''
  if (digits.startsWith('250') && digits.length === 12) {
    national = digits.slice(3)
  } else if (digits.startsWith('250') && digits.length === 13 && digits[3] === '0') {
    national = digits.slice(4)
  } else if (digits.startsWith('0') && digits.length === 10) {
    national = digits.slice(1)
  } else if (digits.length === 9 && digits.startsWith('7')) {
    national = digits
  } else {
    return null
  }
  if (!/^7(?:2|3|8|9)\d{7}$/.test(national)) return null
  return `250${national}`
}

export function isValidRwandanPhone(value: string): boolean {
  return normalizeRwandanPhone(value) !== null
}

export function detectMobileMoneyNetwork(value: string): MobileMoneyNetwork | null {
  const normalized = normalizeRwandanPhone(value)
  if (!normalized) return null
  const national = normalized.slice(3)
  const localPrefix = `0${national.slice(0, 2)}`
  if ((MTN_PREFIXES as readonly string[]).includes(localPrefix)) return 'MTN'
  if ((AIRTEL_PREFIXES as readonly string[]).includes(localPrefix)) return 'AIRTEL'
  return null
}
