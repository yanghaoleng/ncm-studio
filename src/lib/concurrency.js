const MEBIBYTE = 1024 * 1024

function positiveNumber(value) {
  const number = Number(value)
  return Number.isFinite(number) && number > 0 ? number : null
}

function clamp(value, minimum, maximum) {
  return Math.min(maximum, Math.max(minimum, value))
}

export function readConversionCapabilities(source = globalThis.navigator) {
  return {
    hardwareConcurrency: positiveNumber(source?.hardwareConcurrency),
    deviceMemory: positiveNumber(source?.deviceMemory),
  }
}

export function getConversionConcurrencyProfile(capabilities = readConversionCapabilities()) {
  const cores = positiveNumber(capabilities.hardwareConcurrency) || 4
  const memory = positiveNumber(capabilities.deviceMemory)

  let initial = 2
  if (cores <= 2) initial = 1
  else if (cores <= 4) initial = 2
  else initial = 3

  let memoryCeiling = 3
  if (memory && memory <= 2) memoryCeiling = 1
  else if (memory && memory <= 4) memoryCeiling = 2

  initial = Math.min(initial, memoryCeiling)
  return {
    minimum: initial === 1 ? 1 : 2,
    initial,
    maximum: Math.min(memoryCeiling, initial + 1, 3),
  }
}

export function getConversionTaskWeight(fileSize) {
  const bytes = positiveNumber(fileSize) || 0
  if (bytes > 200 * MEBIBYTE) return 3
  if (bytes > 80 * MEBIBYTE) return 2
  return 1
}

export class AdaptiveTaskQueue {
  constructor({ capabilities, onConcurrencyChange, onTaskError } = {}) {
    this.profile = getConversionConcurrencyProfile(capabilities)
    this.limit = this.profile.initial
    this.onConcurrencyChange = onConcurrencyChange
    this.onTaskError = onTaskError
    this.pending = []
    this.running = new Map()
    this.runningWeight = 0
    this.overloadSamples = 0
    this.stableSamples = 0
    this.disposed = false
  }

  enqueue(id, task, { weight = 1 } = {}) {
    if (this.disposed || !id || typeof task !== 'function' || this.has(id)) return false
    this.pending.push({
      id,
      task,
      weight: clamp(Math.ceil(positiveNumber(weight) || 1), 1, this.profile.maximum),
    })
    this.pump()
    return true
  }

  has(id) {
    return this.running.has(id) || this.pending.some((entry) => entry.id === id)
  }

  cancel(id) {
    const index = this.pending.findIndex((entry) => entry.id === id)
    if (index < 0) return false
    this.pending.splice(index, 1)
    return true
  }

  observeEventLoopLag(lagMilliseconds) {
    const lag = Math.max(0, Number(lagMilliseconds) || 0)

    if (lag >= 350) {
      this.overloadSamples += 1
      this.stableSamples = 0
      if (this.overloadSamples >= 2) {
        this.setLimit(this.limit - 1)
        this.overloadSamples = 0
      }
      return this.limit
    }

    this.overloadSamples = 0
    if (lag <= 80) {
      this.stableSamples += 1
      if (this.stableSamples >= 8) {
        this.setLimit(this.limit + 1)
        this.stableSamples = 0
      }
    } else {
      this.stableSamples = 0
    }
    return this.limit
  }

  setLimit(nextLimit) {
    const next = clamp(Math.round(nextLimit), this.profile.minimum, this.profile.maximum)
    if (next === this.limit) return
    this.limit = next
    this.onConcurrencyChange?.(next)
    this.pump()
  }

  pump() {
    if (this.disposed) return

    while (this.pending.length) {
      const availableWeight = this.limit - this.runningWeight
      let nextIndex = this.pending.findIndex((entry) => entry.weight <= availableWeight)
      if (nextIndex < 0 && this.runningWeight === 0) nextIndex = 0
      if (nextIndex < 0) return

      const [entry] = this.pending.splice(nextIndex, 1)
      this.running.set(entry.id, entry)
      this.runningWeight += entry.weight

      Promise.resolve()
        .then(entry.task)
        .catch((error) => this.onTaskError?.(error, entry.id))
        .finally(() => {
          this.running.delete(entry.id)
          this.runningWeight -= entry.weight
          this.pump()
        })
    }
  }

  dispose() {
    this.disposed = true
    this.pending = []
  }
}
