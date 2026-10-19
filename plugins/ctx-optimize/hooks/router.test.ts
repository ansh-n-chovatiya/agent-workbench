import { test, expect } from 'claude-code/testing'

import { routerHooks } from './router'

// The kit cannot set `parentModel` (the engine fills it in), so the hook is captured and called directly with a fake
// `$` and `next`; the engine-facing wiring is covered by `claude plugin validate` and the kit tests below.
const capture = (options: Record<string, unknown>) => {
  let hook: any
  routerHooks((event: string, fn: any) => {
    if (event === 'agent.spawn') hook = fn
  }, options as any)
  return hook
}
const spawn = (over: Record<string, unknown> = {}) => ({
  tool_use_id: 't', prompt: 'secret prompt text', description: 'Find the config files',
  subagentType: 'Explore', parentModel: 'claude-opus-5-5', ...over,
})
const fakeStore = () => {
  const data: Record<string, unknown> = {}
  return { data, $: { store: { get: async (k: string) => data[k], set: async (k: string, v: unknown) => { data[k] = v } } } }
}
const passthrough = async (e: any) => e

test('off by default the spawn reaches the engine unchanged and nothing is logged', async () => {
  const { $, data } = fakeStore()
  const out: any = await capture({})($, spawn(), passthrough)
  expect(out.model).toBeUndefined()
  expect(data).toEqual({})
})

test('with the option on a mechanical label is rewritten to haiku and logged without the prompt', async () => {
  const { $, data } = fakeStore()
  const out: any = await capture({ route: true })($, spawn(), passthrough)
  expect(out.model).toBe('haiku')
  const log = data['router-log'] as Array<Record<string, unknown>>
  expect(log.length).toBe(1)
  expect(log[0].chose).toBe('haiku')
  expect(JSON.stringify(log)).not.toContain('secret prompt text')
})

test('an explicit model is never overridden', async () => {
  const { $ } = fakeStore()
  const out: any = await capture({ route: true })($, spawn({ model: 'opus' }), passthrough)
  expect(out.model).toBe('opus')
})

test('a log that cannot be written does not change the routing, and a broken decision passes the spawn through', async () => {
  const broken = { store: { get: async () => { throw new Error('no store') }, set: async () => {} } }
  const out: any = await capture({ route: true })(broken, spawn(), passthrough)
  expect(out.model).toBe('haiku')
  const bad: any = await capture({ route: true })({}, spawn({ subagentType: undefined }), passthrough)
  expect(bad.model).toBeUndefined()
})

test('the log keeps only the newest 200 entries', async () => {
  const { $, data } = fakeStore()
  const hook = capture({ route: true })
  for (let i = 0; i < 205; i++) await hook($, spawn({ description: 'Find file ' + i }), passthrough)
  expect((data['router-log'] as unknown[]).length).toBe(200)
})

test('through the engine, an unknown main model leaves the spawn alone and nothing throws', { options: { route: true } }, async ($, on) => {
  on('agent.spawn', async (_$: any, e: any) => ({ model: e.model ?? 'inherit', agentId: 'a1' }))
  const out = await $.agent.spawn({ prompt: 'x', description: 'Find the config files', subagentType: 'Explore' })
  expect(out.model).toBe('inherit')
})
