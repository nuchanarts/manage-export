/**
 * In-memory presence tracker.
 *
 * NOTE: State is intentionally held in process memory and resets on server
 * restart — acceptable for this single-instance LAN application where presence
 * is best-effort and requires no persistence.
 */
export class PresenceTracker {
  private seen = new Map<string, number>()

  constructor(private windowMs = 60_000) {}

  /** Record (or refresh) the last-seen timestamp for the given client id. */
  ping(id: string, now = Date.now()): void {
    this.seen.set(id, now)
  }

  /**
   * Return the number of distinct client ids that have pinged within the last
   * `windowMs` milliseconds.  Stale entries are pruned from the internal map
   * at the same time so memory does not grow unboundedly.
   */
  count(now = Date.now()): number {
    const cutoff = now - this.windowMs
    let active = 0
    for (const [id, lastSeen] of this.seen) {
      if (lastSeen >= cutoff) {
        active++
      } else {
        this.seen.delete(id)
      }
    }
    return active
  }
}

/** Shared singleton — imported by the route handler. */
export const presence = new PresenceTracker()
