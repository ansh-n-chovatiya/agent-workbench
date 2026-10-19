import { atom, read, update } from 'claude-code'
import type { Register } from 'claude-code'

import { paneLines } from './format'
import { routerHooks } from './router'
import type { AgentUse } from '../types'

const PANE = 'ctx-agents'
const usage = atom({ plugin: 'ctx-optimize', key: 'usage' } as const, {} as Record<string, AgentUse>)

// Nothing is drawn until the person runs /ctx-agents. Only task labels (<= 60 chars) and token counts are kept;
// prompts and answers are never read or stored.
export const register: Register = (on, options) => {
  routerHooks(on, options)

  on('session.start', async ($, e, next) => {
    await $.command.register({
      name: 'ctx-agents',
      description: 'Pane of this session\'s subagents: status, type, model, tokens, task label',
    })
    return next(e)
  })

  on('command.run', { command: 'ctx-agents' }, async $ => {
    await $.ui.open({ id: PANE, title: 'Agents' })
    return { text: 'Agents pane opened.' }
  })

  on('turn.complete', async ($, e, next) => {
    const u = e.usage
    if (e.agentId && u) {
      const id = e.agentId
      const add = u.input_tokens + u.output_tokens + u.cache_read_input_tokens + u.cache_creation_input_tokens
      await update($, usage, all => ({
        ...all,
        [id]: { tokens: (all[id]?.tokens ?? 0) + add, model: u.model },
      }))
    }
    return next(e)
  })

  on('ui.render', { component: 'Pane', requestId: PANE }, async ($, e) => {
    const { Box, Text } = $.ui.resolve(e)
    try {
      const [agents, used] = [await $.agent.list(), await read($, usage)]
      const room = Math.max(1, (e.viewport?.rows ?? 24) - 4)
      return (
        <Box flexDirection="column">
          {paneLines(agents, used, room).map(l => (
            <Text dimColor={l.dim}>{l.text}</Text>
          ))}
        </Box>
      )
    } catch {
      return <Text dimColor>Agents unavailable.</Text>
    }
  })
}
