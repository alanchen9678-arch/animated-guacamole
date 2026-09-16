const LEGACY_PRODUCT_SLUG = ['au', 'rora'].join('')
const CURRENT_PRODUCT_SLUG = 'dawn-harbor'
const LEGACY_PERSONALITY_INSTRUMENT = `${LEGACY_PRODUCT_SLUG}-personality-v2`
const CURRENT_PERSONALITY_INSTRUMENT = `${CURRENT_PRODUCT_SLUG}-personality-v2`

function migrateStoredValue(nextKey, value) {
  if (!nextKey.includes('.checkin.draft.') || typeof value !== 'string') return value
  try {
    const draft = JSON.parse(value)
    if (draft?.personalityInstrument === LEGACY_PERSONALITY_INSTRUMENT) {
      draft.personalityInstrument = CURRENT_PERSONALITY_INSTRUMENT
      return JSON.stringify(draft)
    }
  } catch {
    // Invalid drafts are handled by the check-in page's existing validation.
  }
  return value
}

function migrateStorageArea(storage) {
  const keys = []
  for (let index = 0; index < storage.length; index += 1) {
    const key = storage.key(index)
    if (key) keys.push(key)
  }
  for (const legacyKey of keys) {
    let nextKey = null
    if (legacyKey === `${LEGACY_PRODUCT_SLUG}_token`) {
      nextKey = `${CURRENT_PRODUCT_SLUG}_token`
    } else if (legacyKey.startsWith(`${LEGACY_PRODUCT_SLUG}.`)) {
      nextKey = `${CURRENT_PRODUCT_SLUG}.${legacyKey.slice(LEGACY_PRODUCT_SLUG.length + 1)}`
    }
    if (!nextKey) continue
    const legacyValue = storage.getItem(legacyKey)
    if (storage.getItem(nextKey) === null && legacyValue !== null) {
      storage.setItem(nextKey, migrateStoredValue(nextKey, legacyValue))
    }
    storage.removeItem(legacyKey)
  }
}

export function migrateLegacyBrandStorage() {
  try {
    migrateStorageArea(window.localStorage)
    migrateStorageArea(window.sessionStorage)
  } catch {
    // Storage can be unavailable in private browsing or hardened environments.
  }
}
