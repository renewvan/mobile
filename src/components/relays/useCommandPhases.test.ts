import { activePhase, givenUp, type Phase } from './useCommandPhases'

const pending: Phase = { kind: 'pending', to: true, from: false }

describe('command phases', () => {
  it('stays pending while the state is unchanged, ends once it moves', () => {
    expect(activePhase(pending, false)).toBe(pending)
    expect(activePhase(pending, true)).toBeUndefined()
    expect(activePhase(pending, undefined)).toBeUndefined()
  })

  it('fails after the give-up, and a failure ends when the state reaches the target', () => {
    const failed = givenUp(pending)
    expect(failed).toEqual({ kind: 'failed', to: true })
    expect(activePhase(failed, false)).toBe(failed)
    expect(activePhase(failed, true)).toBeUndefined()
  })

  it('does not turn a settled phase into a failure', () => {
    expect(givenUp(undefined)).toBeUndefined()
    const failed: Phase = { kind: 'failed', to: false }
    expect(givenUp(failed)).toBe(failed)
  })
})
