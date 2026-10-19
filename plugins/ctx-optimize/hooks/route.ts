// Which model should a subagent that ctx does not name run on? Pure and default-off (D7, D8, D18).
// Rules, in order: an explicit model on the call wins; ctx's own agents name their model through the ledger; a keyword
// in the short task label picks a family; and a router only ever moves a spawn to a cheaper model than the main one.
export type Family = 'haiku' | 'sonnet' | 'opus'
export type SpawnLike = { model?: string; subagentType: string; description: string; parentModel: string }
export type Decision = { model?: Family; why: string }

const RANK: Record<Family, number> = { haiku: 1, sonnet: 2, opus: 3 }

// Dearest first: a label that mentions a hard problem is never sent to the cheap model because it also says "find".
const OPUS = /\b(debug|root cause|architect\w*|design|security|threat|concurren\w*|race|migration)\b/i
const SONNET = /\b(implement\w*|add|write|build|refactor\w*|fix\w*|update|create|wire|port)\b/i
const HAIKU = /\b(search|find|list|locate|grep|rename|format|lint|summari[sz]e|inventory|count)\b/i

export const familyOf = (model: string): Family | undefined =>
  /haiku/i.test(model) ? 'haiku' : /sonnet/i.test(model) ? 'sonnet' : /opus/i.test(model) ? 'opus' : undefined

const wanted = (e: SpawnLike): Family | undefined => {
  if (OPUS.test(e.description)) return 'opus'
  if (SONNET.test(e.description)) return 'sonnet'
  if (HAIKU.test(e.description) || e.subagentType === 'Explore') return 'haiku'
  return undefined
}

export const decide = (e: SpawnLike, enabled: boolean): Decision => {
  if (!enabled) return { why: 'router off' }
  if (e.model) return { why: 'explicit model on the call wins' }
  if (e.subagentType.startsWith('ctx:')) return { why: 'ctx names the model for its own agents' }
  const pick = wanted(e)
  if (!pick) return { why: 'no keyword match' }
  const main = familyOf(e.parentModel)
  if (!main) return { why: 'main model not recognised, left alone' }
  if (RANK[pick] >= RANK[main]) return { why: `${pick} would not be cheaper than the main model (${main})` }
  return { model: pick, why: `label suggests ${pick}` }
}
