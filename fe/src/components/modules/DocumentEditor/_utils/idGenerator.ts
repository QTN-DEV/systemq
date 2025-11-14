export const generateId = (): string => {
  try {
    if (typeof crypto !== 'undefined' && typeof crypto.randomUUID === 'function') {
      return crypto.randomUUID()
    }
  } catch {
    // ignore and fallback to Math.random
  }
  return `${Date.now().toString(16)}-${Math.random().toString(16).slice(2)}`
}
