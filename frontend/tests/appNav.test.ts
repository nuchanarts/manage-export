import { requestNavigate, onNavigate, NavRequest } from '../src/data/appNav'

// Each test gets a clean slate by unsubscribing all subs after use.
// We keep track of every unsub function created in the test.

describe('appNav pub/sub', () => {
  it('subscriber receives a published request', () => {
    const received: NavRequest[] = []
    const unsub = onNavigate(r => received.push(r))

    requestNavigate({ menu: 'basic-config', categoryKey: 'occupation' })

    expect(received).toHaveLength(1)
    expect(received[0]).toEqual({ menu: 'basic-config', categoryKey: 'occupation' })

    unsub()
  })

  it('unsubscribe stops delivery', () => {
    const received: NavRequest[] = []
    const unsub = onNavigate(r => received.push(r))

    unsub()
    requestNavigate({ menu: 'validate' })

    expect(received).toHaveLength(0)
  })

  it('multiple subscribers all receive the request', () => {
    const a: NavRequest[] = []
    const b: NavRequest[] = []

    const unsubA = onNavigate(r => a.push(r))
    const unsubB = onNavigate(r => b.push(r))

    requestNavigate({ menu: 'eclaim-config', categoryKey: 'eclaim-inscl' })

    expect(a).toHaveLength(1)
    expect(b).toHaveLength(1)
    expect(a[0]).toEqual({ menu: 'eclaim-config', categoryKey: 'eclaim-inscl' })
    expect(b[0]).toEqual({ menu: 'eclaim-config', categoryKey: 'eclaim-inscl' })

    unsubA()
    unsubB()
  })

  it('after one subscriber unsubscribes the other still receives', () => {
    const a: NavRequest[] = []
    const b: NavRequest[] = []

    const unsubA = onNavigate(r => a.push(r))
    const unsubB = onNavigate(r => b.push(r))

    unsubA()
    requestNavigate({ menu: 'global-search' })

    expect(a).toHaveLength(0)
    expect(b).toHaveLength(1)

    unsubB()
  })

  it('publishes NavRequest with no categoryKey when not provided', () => {
    const received: NavRequest[] = []
    const unsub = onNavigate(r => received.push(r))

    requestNavigate({ menu: 'global-search' })

    expect(received[0]).toEqual({ menu: 'global-search' })
    expect(received[0]!.categoryKey).toBeUndefined()

    unsub()
  })
})
