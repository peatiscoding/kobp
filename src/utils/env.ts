import { isNil } from 'lodash'

type RS = 'requiredString'
type RN = 'requiredNumber'
type RB = 'requiredBoolean'

function _env(envKey: string, defaultValue: string | RS): string
function _env(envKey: string, defaultValue: number | RN): number
function _env(envKey: string, defaultValue: boolean | RB): boolean
function _env(envKey: string, defaultValue: number | string | boolean, src = process.env): string | number | boolean {
  const val = src[`${envKey}`]
  if (isNil(val)) {
    if (defaultValue === 'requiredString' || defaultValue === 'requiredNumber' || defaultValue === 'requiredBoolean') {
      throw new Error(`ENVIRONMENT "${envKey}" (${envKey.length}) is required but not yet defined.`)
    }
    return defaultValue
  }
  if (defaultValue === 'requiredNumber' || typeof defaultValue === 'number') {
    const numberVal = +val
    if (isNaN(numberVal)) {
      throw new Error(`ENVIRONMENT "${envKey}" (${envKey.length}) should be numeric value but provided as "${val}" (Not a Number).`)
    }
    return numberVal
  }
  if (defaultValue === 'requiredBoolean' || typeof defaultValue === 'boolean') {
    const booleanVal = /^(yes|true|1)$/i.test(`${val}`);
    return booleanVal
  }
  return val
}

export const env = {
  s: (envKey: string, defaultValue?: string): string => _env(envKey, typeof defaultValue === 'undefined' ? 'requiredString' : defaultValue),
  b: (envKey: string, defaultValue?: boolean): boolean => _env(envKey, typeof defaultValue === 'undefined' ? 'requiredBoolean' : defaultValue),
  n: (envKey: string, defaultValue?: number): number => _env(envKey, typeof defaultValue === 'undefined' ? 'requiredNumber' : defaultValue),
}
