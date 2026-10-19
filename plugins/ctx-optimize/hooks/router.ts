import type { Register } from 'claude-code'

import { clip } from './format'
import { decide } from './route'

const LOG_KEY = 'router-log'
const LOG_MAX = 200

// Off unless the person sets the `route` option. Fails open: any error passes the spawn through untouched.
// Only the decision is logged (a label cut to 60 characters, the model asked for and chosen); prompts are never read.
export const routerHooks: Register = (on, options) => {
  const enabled = (options as { route?: boolean } | undefined)?.route === true

  on('agent.spawn', async ($, e, next) => {
    let changed = e
    try {
      const d = decide(e, enabled)
      if (enabled) {
        try {
          const log = ((await $.store.get(LOG_KEY)) as unknown[] | undefined) ?? []
          const entry = { type: e.subagentType, label: clip(e.description), asked: e.model ?? null, chose: d.model ?? null, why: d.why }
          await $.store.set(LOG_KEY, [...log, entry].slice(-LOG_MAX))
        } catch {
          // a log that cannot be written must not change the routing
        }
      }
      if (d.model) changed = { ...e, model: d.model }
    } catch {
      changed = e
    }
    return next(changed)
  })
}
