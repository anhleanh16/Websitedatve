import profanity from 'leo-profanity'
import * as naughtyWords from 'naughty-words'

let initialized = false
const normalizedExtraTerms = new Set()
const normalizedExtraTermPatterns = []

const EXTRA_BLOCKED_TERMS = [
  'dm',
  'dmm',
  'dit me',
  'd i t m e',
  'địt mẹ',
  'dit cu',
  'địt cụ',
  'dit bo',
  'địt bố',
  'du me',
  'đụ mẹ',
  'du ma',
  'vcl',
  'vl',
  'cc',
  'cl',
  'loz',
  'l o z',
  'l0n',
  'lon',
  'l o n',
  'lồn',
  'l*n',
  'cac',
  'c a c',
  'cặc',
  'cu',
  'dau buoi',
  'đầu buồi',
  'buoi',
  'buồi',
  'me may',
  'mẹ mày',
  'con cho',
  'chó chết',
  'đụ',
]

const LEET_MAP = {
  '@': 'a',
  '$': 's',
  '0': 'o',
  '1': 'i',
  '3': 'e',
  '4': 'a',
  '5': 's',
  '7': 't',
  '!': 'i',
}

const normalizeText = (text) => {
  const lower = String(text || '').toLowerCase()
  const deLeeted = lower
    .split('')
    .map((ch) => LEET_MAP[ch] || ch)
    .join('')

  return deLeeted
    .normalize('NFKD')
    .replace(/[\u0300-\u036f]/g, '')
    .replace(/[^a-z0-9\s]+/g, ' ')
    .replace(/[_\-\.]+/g, ' ')
}

const escapeRegExp = (text) => text.replace(/[.*+?^${}()|[\]\\]/g, '\\$&')

const buildTermPattern = (normalizedTerm) => {
  const flexibleTerm = normalizedTerm
    .split(/\s+/)
    .filter(Boolean)
    .map((part) => escapeRegExp(part))
    .join('[^a-z0-9]*')

  if (!flexibleTerm) return null
  return new RegExp(`(^|[^a-z0-9])${flexibleTerm}([^a-z0-9]|$)`, 'i')
}

const addWordSafe = (word) => {
  const cleaned = String(word || '').trim().toLowerCase()
  if (!cleaned || cleaned.length < 2) return
  profanity.add(cleaned)
}

const initializeDictionary = () => {
  if (initialized) return

  // Ensure default list is loaded first.
  profanity.loadDictionary('en')

  Object.entries(naughtyWords).forEach(([key, value]) => {
    if (key === 'default' || key === 'module.exports') return
    if (!Array.isArray(value)) return
    value.forEach(addWordSafe)
  })

  EXTRA_BLOCKED_TERMS.forEach((term) => {
    addWordSafe(term)
    const normalized = normalizeText(term).trim()
    if (normalized) {
      normalizedExtraTerms.add(normalized)
      const pattern = buildTermPattern(normalized)
      if (pattern) normalizedExtraTermPatterns.push({ term: normalized, pattern })
    }
  })

  initialized = true
}

export const detectSensitiveWords = (rawText) => {
  initializeDictionary()

  const text = String(rawText || '').trim()
  if (!text) {
    return { blocked: false, foundWords: [] }
  }

  const normalized = normalizeText(text)
  const variants = [text.toLowerCase(), normalized]

  const found = new Set()
  for (const variant of variants) {
    const used = profanity.badWordsUsed(variant) || []
    used.forEach((w) => {
      const token = String(w || '').trim().toLowerCase()
      if (token) found.add(token)
    })
  }

  const normalizedCompact = ` ${normalized.replace(/\s+/g, ' ').trim()} `
  normalizedExtraTermPatterns.forEach(({ term, pattern }) => {
    if (pattern.test(normalizedCompact)) found.add(term)
  })

  return {
    blocked: found.size > 0,
    foundWords: Array.from(found),
  }
}
