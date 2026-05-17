// backend/tests/unit/presence.test.ts
// TDD: written BEFORE implementation (RED → GREEN)
import { PresenceTracker } from '../../src/services/presence'

describe('PresenceTracker', () => {
  const WINDOW = 60_000

  it('returns 0 when no pings have occurred', () => {
    const tracker = new PresenceTracker(WINDOW)
    expect(tracker.count(1000)).toBe(0)
  })

  it('returns 1 after a single ping', () => {
    const tracker = new PresenceTracker(WINDOW)
    tracker.ping('client-a', 1000)
    expect(tracker.count(1000)).toBe(1)
  })

  it('returns 2 for two distinct ids', () => {
    const tracker = new PresenceTracker(WINDOW)
    tracker.ping('client-a', 1000)
    tracker.ping('client-b', 1000)
    expect(tracker.count(1000)).toBe(2)
  })

  it('returns 1 when the same id pings twice', () => {
    const tracker = new PresenceTracker(WINDOW)
    tracker.ping('client-a', 1000)
    tracker.ping('client-a', 2000)
    expect(tracker.count(2000)).toBe(1)
  })

  it('does not count an id whose last ping is older than windowMs', () => {
    const tracker = new PresenceTracker(WINDOW)
    const pingTime = 1000
    tracker.ping('client-a', pingTime)
    // count at pingTime + windowMs + 1 → stale
    const countTime = pingTime + WINDOW + 1
    expect(tracker.count(countTime)).toBe(0)
  })

  it('counts an id at the exact edge of the window (inclusive)', () => {
    const tracker = new PresenceTracker(WINDOW)
    const pingTime = 1000
    tracker.ping('client-a', pingTime)
    // count at pingTime + windowMs exactly → still within window
    expect(tracker.count(pingTime + WINDOW)).toBe(1)
  })

  it('prunes stale entries so they do not reappear', () => {
    const tracker = new PresenceTracker(WINDOW)
    tracker.ping('stale-client', 1000)
    // Advance past window → prune
    tracker.count(1000 + WINDOW + 1)
    // Re-check: still 0
    expect(tracker.count(1000 + WINDOW + 2)).toBe(0)
  })

  it('refreshes timestamp when same id pings again', () => {
    const tracker = new PresenceTracker(WINDOW)
    const first = 1000
    tracker.ping('client-a', first)

    // Advance almost to expiry
    const second = first + WINDOW - 1
    tracker.ping('client-a', second)

    // Count at first + windowMs + 1 — would be stale if not refreshed
    expect(tracker.count(first + WINDOW + 1)).toBe(1)
    // Count at second + windowMs + 1 — truly stale now
    expect(tracker.count(second + WINDOW + 1)).toBe(0)
  })

  it('handles many distinct ids correctly', () => {
    const tracker = new PresenceTracker(WINDOW)
    for (let i = 0; i < 10; i++) {
      tracker.ping(`client-${i}`, 1000)
    }
    expect(tracker.count(1000)).toBe(10)
  })

  it('uses Date.now() as default when no now argument is given', () => {
    const tracker = new PresenceTracker(WINDOW)
    tracker.ping('client-a')
    // Should count 1 immediately after ping (default now ≈ current time)
    expect(tracker.count()).toBe(1)
  })
})
