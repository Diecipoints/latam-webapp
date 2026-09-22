import { type ClassValue, clsx } from 'clsx'
import { twMerge } from 'tailwind-merge'
import type { CurrencyCode } from '@/lib/database.types'

export function cn(...inputs: ClassValue[]) {
  return twMerge(clsx(inputs))
}

export function formatThresholdValue(value: number, currency: CurrencyCode) {
  if (currency === 'UNIDADES') return Math.trunc(value).toLocaleString()
  return `${value.toLocaleString()} ${currency}`
}
