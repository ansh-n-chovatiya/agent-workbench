export const LABEL_MAX = 60

export const clip = (text: string, max = LABEL_MAX): string =>
  text.length <= max ? text : `${text.slice(0, max - 1)}…`

export const kilo = (n: number): string =>
  n >= 1_000_000 ? `${(n / 1_000_000).toFixed(1)}M` : n >= 1000 ? `${Math.round(n / 1000)}k` : String(n)

export type Row = { status: string; type: string; label: string; model: string; tokens: number }

export const line = (r: Row): string =>
  `${r.status.padEnd(9)}${clip(r.type, 22).padEnd(24)}${(r.model || '-').padEnd(10)}${kilo(r.tokens).padStart(7)}  ${clip(r.label)}`
