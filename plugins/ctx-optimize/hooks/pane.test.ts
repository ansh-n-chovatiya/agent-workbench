import { test, expect } from 'claude-code/testing'

// The pane draws nothing until /ctx-agents opens it. The kit has no engine behind `agent.list`, so the row logic is
// tested as a pure function in format.test.ts and this file covers what the kit can: the pane mounts on every surface
// and degrades to one plain line when the engine cannot list agents.
const SURFACES = ['terminal', 'desktop'] as const

test('if the engine cannot list agents the pane degrades to one plain line on every surface', async ($, on) => {
  on('agent.list', async () => {
    throw new Error('boom')
  })
  for (const surface of SURFACES) {
    const ui = await $.ui.mount({ plugin: 'ctx-optimize', surface, component: 'Pane', props: {}, requestId: 'ctx-agents' })
    expect(await ui.find({ type: 'Text', text: /Agents unavailable/ })).toBeDefined()
    await ui.unmount()
  }
})
