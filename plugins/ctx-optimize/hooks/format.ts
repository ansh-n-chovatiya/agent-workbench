export const LABEL_MAX = 60

export const clip = (text: string, max = LABEL_MAX): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

export const kilo = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

export type Row = { status: string; type: string; label: string; model: string; tokens: number }

export const line = (r: Row): string =>
  `${r.status.padEnd(9)}${clip(r.type, 22).padEnd(24)}${(r.model || '-').padEnd(10)}${kilo(r.tokens).padStart(7)}  ${clip(r.label)}`

export type AgentLike = { id: string; type: string; status: string; description: string }
export type Use = { tokens: number; model: string }
export type PaneLine = { text: string; dim: boolean }

// What the pane shows: one line per agent (the newest `room` of them), or a plain sentence when there are none.
export const paneLines = (agents: AgentLike[], used: Record<string, Use>, room: number): PaneLine[] => {
  if (agents.length === 0) return [{ text: 'No agents yet in this session.', dim: true }]
  return agents.slice(-Math.max(1, room)).map(a => ({
    text: line({
      status: a.status,
      type: a.type,
      label: clip(a.description),
      model: used[a.id]?.model ?? '',
      tokens: used[a.id]?.tokens ?? 0,
    }),
    dim: a.status === 'completed',
  }))
}
